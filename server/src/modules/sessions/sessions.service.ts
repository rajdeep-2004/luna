import type {
  AnswerResult,
  BonusAward,
  ChallengeType,
  HintRequest,
  HintResult,
  SessionSummary,
  SessionType,
  SessionView,
  StartSessionRequest,
  SubmitAnswerRequest,
  TopicSlug,
  PracticeMode,
} from '@luna/shared';
import type { DuelFormat } from '@luna/shared';
import { SessionModel, type SessionDoc } from '../../models/Session';
import { AnswerAttemptModel } from '../../models/AnswerAttempt';
import type { ChallengeDoc } from '../../models/Challenge';
import { shuffle } from '../../lib/random';
import { AppError, conflict, isDuplicateKey, notFound } from '../../lib/errors';
import { SESSION } from '../../config/game';
import { localDateKey } from '../../lib/time';
import { challengesRepo } from '../challenges/challenges.repository';
import { answerCount, toPublicChallenge, toPublicStage } from '../challenges/challenges.projection';
import { recordAnswer } from '../progress/topicProgress.service';
import { trackRevisit } from '../progress/revisit.service';
import { assessmentStatus } from '../progress/assessments.service';
import { usersRepo } from '../users/users.repository';
import { evaluate } from './sessions.evaluator';
import {
  pickBaseline,
  pickCheckpoint,
  pickIncident,
  pickPractice,
  type PickedItem,
} from './sessions.selection';
import { settleProgression } from './sessions.settle';
import { answerXP, ownedXP } from './sessions.xp';
import { buildSummary } from './sessions.summary';
import { evaluateAchievements } from '../achievements/achievements.service';

/** Mongoose infers nested string arrays loosely; at runtime they are plain string[][]. */
const ordersOf = (item: { optionOrders: unknown }): string[][] => item.optionOrders as string[][];

function optionOrdersFor(c: ChallengeDoc): string[][] {
  if (c.type === 'INCIDENT') return c.stages.map((s) => shuffle(s.options.map((o) => o.id)));
  return [shuffle(c.options.map((o) => o.id))];
}

/** game-modes.md §2: an unfinished Kata expires at the end of the user's local day. */
async function isKataExpired(userId: string, session: SessionDoc): Promise<boolean> {
  const user = await usersRepo.findById(userId);
  return Boolean(
    session.dailyDate && session.dailyDate < localDateKey(new Date(), user?.timezone ?? 'UTC'),
  );
}

async function findOwnSession(userId: string, sessionId: string): Promise<SessionDoc> {
  const session = await SessionModel.findOne({ _id: sessionId, userId });
  if (!session) throw notFound('Session');
  return session;
}

type NewSession = {
  type: SessionType;
  topicSlug?: TopicSlug | null;
  mode?: PracticeMode | null;
  dailyDate?: string | null;
  duelId?: string | null;
  duelFormat?: DuelFormat | null;
  picked: PickedItem[];
};

/**
 * Inserts a session for the picked challenges. Returns null when a unique index says an equivalent
 * open session (or today's Kata) already exists, so the caller can return that one instead.
 */
export async function createSession(userId: string, s: NewSession): Promise<SessionView | null> {
  try {
    const session = await SessionModel.create({
      userId,
      type: s.type,
      topicSlug: s.topicSlug ?? null,
      mode: s.mode ?? null,
      dailyDate: s.dailyDate ?? null,
      duelId: s.duelId ?? null,
      duelFormat: s.duelFormat ?? null,
      items: s.picked.map(({ challenge: c, isRevisit, optionOrders }, order) => ({
        challengeId: c._id,
        order,
        isRevisit,
        optionOrders: optionOrders ?? optionOrdersFor(c),
      })),
      totalAnswers: s.picked.reduce((n, p) => n + answerCount(p.challenge), 0),
    });
    return buildView(
      session,
      s.picked.map((p) => p.challenge),
    );
  } catch (err) {
    if (isDuplicateKey(err)) return null;
    throw err;
  }
}

async function pickFor(userId: string, input: StartSessionRequest): Promise<PickedItem[]> {
  switch (input.type) {
    case 'PRACTICE': {
      const user = await usersRepo.findById(userId);
      return pickPractice(userId, input.topicSlug, user?.timezone ?? 'UTC', input.mode);
    }
    case 'INCIDENT':
      return pickIncident(userId, input.challengeId, input.topicSlug);
    case 'BASELINE':
      return pickBaseline();
    case 'CHECKPOINT':
      return pickCheckpoint(userId);
  }
}

export async function startSession(
  userId: string,
  input: StartSessionRequest,
): Promise<SessionView> {
  const topicSlug: TopicSlug | null = input.type === 'PRACTICE' ? input.topicSlug : null;
  const mode: PracticeMode | null = input.type === 'PRACTICE' ? (input.mode ?? null) : null;
  const findOpen = () =>
    SessionModel.findOne({ userId, type: input.type, status: 'ACTIVE', topicSlug, mode }).sort({
      createdAt: -1,
    });

  // A repeated tap on "Start" resumes the open session instead of creating a second one.
  const open = await findOpen();
  if (open && input.type !== 'INCIDENT') return getSession(userId, open._id.toString());

  if (
    input.type === 'BASELINE' &&
    (await SessionModel.exists({ userId, type: 'BASELINE', status: 'COMPLETED' }))
  ) {
    throw conflict('You have already taken the baseline');
  }
  if (input.type === 'CHECKPOINT' && !(await assessmentStatus(userId)).checkpointAvailable) {
    throw conflict('Your next Checkpoint unlocks after more Daily Katas');
  }

  const created = await createSession(userId, {
    type: input.type,
    topicSlug,
    mode,
    picked: await pickFor(userId, input),
  });
  if (created) return created;
  // A concurrent start won the race: return the session it created.
  const winner = await findOpen();
  if (!winner) throw conflict('Could not start the session, please try again');
  return getSession(userId, winner._id.toString());
}

export async function getSession(userId: string, sessionId: string): Promise<SessionView> {
  const session = await findOwnSession(userId, sessionId);
  const challenges = await challengesRepo.findByIds(session.items.map((i) => i.challengeId));
  return buildView(session, challenges);
}

/** A duel session's format; sessions from before P7 have none and are Classic. */
const duelFormatOf = (session: SessionDoc): DuelFormat =>
  (session.duelFormat ?? 'CLASSIC') as DuelFormat;

async function buildView(session: SessionDoc, challenges: ChallengeDoc[]): Promise<SessionView> {
  const byId = new Map(challenges.map((c) => [c._id.toString(), c]));
  const attempts = await AnswerAttemptModel.find({ sessionId: session._id })
    .select('challengeId stageIndex answer isCorrect createdAt')
    .sort({ stageIndex: 1 })
    .lean();
  const items = session.items.flatMap((item) => {
    const c = byId.get(item.challengeId.toString());
    if (!c) return [];
    const mine = attempts
      .filter((a) => a.challengeId.toString() === item.challengeId.toString())
      .map((a) => ({ stageIndex: a.stageIndex, answer: a.answer, isCorrect: a.isCorrect }));
    const needed = answerCount(c);
    const revealed = c.type === 'INCIDENT' ? Math.min(mine.length + 1, needed) : 0;
    return [
      {
        order: item.order,
        isRevisit: item.isRevisit,
        challenge: toPublicChallenge(c, ordersOf(item)),
        revealedStages: Array.from({ length: revealed }, (_, i) =>
          toPublicStage(c, i, ordersOf(item))!,
        ),
        attempts: mine,
        isComplete: mine.length >= needed,
      },
    ];
  });
  return {
    id: session._id.toString(),
    type: session.type as SessionType,
    ...(session.mode ? { mode: session.mode as PracticeMode } : {}),
    ...(session.type === 'DUEL' ? { duelFormat: duelFormatOf(session) } : {}),
    status: session.status as SessionView['status'],
    startedAt: session.startedAt.toISOString(),
    totalAnswers: session.totalAnswers,
    items: items.sort((a, b) => a.order - b.order),
  };
}

/** Loads the session, item and challenge, and checks that `stageIndex` is the next unanswered stage. */
async function loadAnswerContext(
  userId: string,
  sessionId: string,
  challengeId: string,
  stageIndex: number,
) {
  const session = await findOwnSession(userId, sessionId);
  if (session.status !== 'ACTIVE') throw conflict('This session is already finished');
  if (session.type === 'DAILY' && (await isKataExpired(userId, session))) {
    throw conflict('This Kata ended at midnight. Today has a new one.');
  }
  // Live duel answers arrive over the socket, on the duel's clock (D-052).
  if (session.type === 'DUEL') throw conflict('Duel answers go through the live duel');
  const item = session.items.find((i) => i.challengeId.toString() === challengeId);
  if (!item) throw notFound('Challenge in this session');
  const challenge = await challengesRepo.findById(challengeId);
  if (!challenge) throw notFound('Challenge');
  if (stageIndex >= answerCount(challenge)) throw new AppError('VALIDATION_ERROR', 'Invalid stage');
  const answered = await AnswerAttemptModel.countDocuments({ sessionId, challengeId });
  const alreadyAnswered = stageIndex < answered;
  if (stageIndex > answered) throw conflict('Answer the earlier stage first');
  return { session, item, challenge, alreadyAnswered };
}

/**
 * A retry of an answer that is already recorded: re-run the XP award (the ledger makes it a no-op
 * if it already happened) and make the attempt's `xpEarned` match the ledger, since the summary
 * sums it. Progress and revisit writes are not replayed: D-015 accepts losing one progress update
 * on a crash, and replaying them without a marker could double-count.
 */
export async function repairAnsweredXP(
  userId: string,
  session: SessionDoc,
  challenge: ChallengeDoc,
  stageIndex: number,
): Promise<void> {
  const prior = await AnswerAttemptModel.findOne({
    sessionId: session._id,
    challengeId: challenge._id,
    stageIndex,
  }).lean();
  if (!prior) return;
  const ctx = { userId, session, challenge, stageIndex, attemptAt: prior.createdAt };
  await answerXP({ ...ctx, isCorrect: prior.isCorrect, usedHint: prior.usedHint });
  const owned = prior.isCorrect ? await ownedXP(ctx) : 0;
  if (owned !== prior.xpEarned)
    await AnswerAttemptModel.updateOne({ _id: prior._id }, { $set: { xpEarned: owned } });
}

export async function submitAnswer(
  userId: string,
  sessionId: string,
  input: SubmitAnswerRequest,
): Promise<AnswerResult> {
  const { challengeId, stageIndex, answer } = input;
  const { session, item, challenge, alreadyAnswered } = await loadAnswerContext(
    userId,
    sessionId,
    challengeId,
    stageIndex,
  );
  if (alreadyAnswered) {
    await repairAnsweredXP(userId, session, challenge, stageIndex);
    throw conflict('Already answered');
  }
  // Server-measured time since the previous answer in this session (or the session start).
  const last = await AnswerAttemptModel.findOne({ sessionId })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .lean();
  const since = last?.createdAt ?? session.startedAt;
  const result = evaluate(challenge, stageIndex, answer);
  const timeTakenMs = Math.min(Date.now() - since.getTime(), SESSION.maxAnswerTimeMs);
  const usedHint = item.hintsUsed.includes(stageIndex);

  const recorded = await recordAttempt(userId, session, challenge, {
    stageIndex,
    answer,
    isCorrect: result.isCorrect,
    usedHint,
    isTimeout: false,
    timeTakenMs,
  });
  if (!recorded) {
    await repairAnsweredXP(userId, session, challenge, stageIndex);
    throw conflict('Already answered');
  }

  const isIncident = challenge.type === 'INCIDENT';
  const isLastStage = stageIndex === answerCount(challenge) - 1;
  const answeredInSession = await AnswerAttemptModel.countDocuments({ sessionId });
  const nextStage =
    isIncident && !isLastStage
      ? toPublicStage(challenge, stageIndex + 1, ordersOf(item))
      : undefined;
  return {
    ...result,
    xpEarned: recorded.xpEarned,
    usedHint,
    timeTakenMs,
    ...(nextStage ? { nextStage } : {}),
    ...(isIncident && isLastStage && challenge.rootCause ? { rootCause: challenge.rootCause } : {}),
    challengeComplete: !isIncident || isLastStage,
    sessionReadyToComplete: answeredInSession >= session.totalAnswers,
  };
}

export type AttemptInput = {
  stageIndex: number;
  answer: string;
  isCorrect: boolean;
  usedHint: boolean;
  isTimeout: boolean;
  timeTakenMs: number;
};

/**
 * Records one evaluated answer and its effects, in order (D-015): 1) the attempt insert, which is
 * the idempotency guard, 2) topic progress and the revisit queue, 3) XP through the ledger.
 * Returns null when the attempt already exists (a double submit), so nothing is counted twice.
 * Used by every session type, including live duels (D-052).
 */
export async function recordAttempt(
  userId: string,
  session: SessionDoc,
  challenge: ChallengeDoc,
  input: AttemptInput,
): Promise<{ xpEarned: number } | null> {
  const { stageIndex, isCorrect, usedHint } = input;
  let attemptId;
  let attemptAt: Date;
  try {
    const attempt = await AnswerAttemptModel.create({
      userId,
      sessionId: session._id,
      challengeId: challenge._id,
      ...input,
      topicSlug: challenge.topicSlug,
      type: challenge.type,
      difficulty: challenge.difficulty,
    });
    attemptId = attempt._id;
    attemptAt = attempt.createdAt;
  } catch (err) {
    if (isDuplicateKey(err)) return null;
    throw err;
  }

  await recordAnswer(userId, challenge.topicSlug as TopicSlug, isCorrect, challenge.difficulty);
  const user = await usersRepo.findById(userId);
  await trackRevisit(
    userId,
    {
      id: challenge._id.toString(),
      topicSlug: challenge.topicSlug as TopicSlug,
      type: challenge.type as ChallengeType,
    },
    isCorrect,
    user?.timezone ?? 'UTC',
  );
  const xpEarned = await answerXP({
    userId,
    session,
    challenge,
    stageIndex,
    isCorrect,
    usedHint,
    attemptAt,
  });
  if (xpEarned > 0) await AnswerAttemptModel.updateOne({ _id: attemptId }, { $set: { xpEarned } });
  return { xpEarned };
}

export async function revealHint(
  userId: string,
  sessionId: string,
  input: HintRequest,
): Promise<HintResult> {
  const { session, challenge, alreadyAnswered } = await loadAnswerContext(
    userId,
    sessionId,
    input.challengeId,
    input.stageIndex,
  );
  if (alreadyAnswered) throw conflict('Already answered');
  if (session.type === 'DUEL') throw conflict('There are no hints in duels');
  const hint =
    challenge.type === 'INCIDENT' ? challenge.stages[input.stageIndex]?.hint : challenge.hint;
  if (!hint) throw notFound('Hint');
  await SessionModel.updateOne(
    { _id: sessionId, userId, 'items.challengeId': input.challengeId },
    { $addToSet: { 'items.$.hintsUsed': input.stageIndex } },
  );
  return { hint };
}

/** Idempotent: only the first call completes the session; later calls return the stored summary. */
export async function completeSession(userId: string, sessionId: string): Promise<SessionSummary> {
  const session = await findOwnSession(userId, sessionId);
  if (session.status === 'COMPLETED' && session.summary) return storedSummary(session);
  if (session.type === 'DUEL') throw conflict('A live duel finishes on its own');

  const attempts = await AnswerAttemptModel.find({ sessionId })
    .select('challengeId topicSlug isCorrect timeTakenMs xpEarned')
    .lean();
  if (attempts.length < session.totalAnswers)
    throw conflict('Answer every challenge before finishing');
  return finishSession(userId, session, attempts);
}

/** A stored summary, replayed without re-firing one-time moments. */
export function storedSummary(session: SessionDoc): SessionSummary {
  // Summaries stored before P4 have no `bonuses`; default it so clients can rely on the field.
  const stored = session.summary as Omit<SessionSummary, 'bonuses' | 'fixedMistakes'> & {
    bonuses?: BonusAward[];
    fixedMistakes?: number;
  };
  // A replay (reopening a finished Kata, a remount) must not re-fire the rank-up moment.
  const { rankUp: _seen, ...rest } = stored;
  void _seen;
  return { ...rest, bonuses: stored.bonuses ?? [], fixedMistakes: stored.fixedMistakes ?? 0 };
}

type CompletedAttempt = {
  challengeId: unknown;
  topicSlug: string;
  isCorrect: boolean;
  timeTakenMs: number;
  xpEarned: number;
};

/**
 * Builds the summary, settles bonuses and streak (idempotent, so before the flip), flips the
 * session to COMPLETED once, then checks achievements. Shared by REST completion and the live
 * duel engine, which completes both players' DUEL sessions when a duel ends (D-052).
 */
export async function finishSession(
  userId: string,
  session: SessionDoc,
  attempts: CompletedAttempt[],
): Promise<SessionSummary> {
  const sessionId = session._id.toString();
  const revisitIds = new Set(
    session.items.filter((i) => i.isRevisit).map((i) => i.challengeId.toString()),
  );
  const fixedMistakes = attempts.filter(
    (a) => a.isCorrect && revisitIds.has(String(a.challengeId)),
  ).length;
  const base = {
    ...buildSummary(sessionId, session.type as SessionType, attempts),
    fixedMistakes,
  };
  const summary = await settleProgression(userId, session, base);
  const updated = await SessionModel.findOneAndUpdate(
    { _id: sessionId, userId, status: 'ACTIVE' },
    { $set: { status: 'COMPLETED', completedAt: new Date(), summary } },
    { returnDocument: 'after' },
  );
  if (updated) {
    // After the flip, so this session counts. Not stored: like rankUp, the toast shows once.
    const unlocked = await evaluateAchievements(userId);
    return unlocked.length
      ? {
          ...summary,
          newAchievements: unlocked.map(({ key, name, icon }) => ({ key, name, icon })),
        }
      : summary;
  }
  // Lost a race with a parallel completion: return what that call stored.
  const stored = await SessionModel.findById(sessionId).select('summary').lean();
  return (stored?.summary as SessionSummary) ?? summary;
}
