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
import { DUEL_FORMAT_RULES, DUEL_TIMEOUT_ANSWER, type DuelFormat } from '@luna/shared';
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
import { evaluate, timeoutEvaluation } from './sessions.evaluator';
import { assertDuelPlayable } from '../duels/duels.settle';
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

const endsOnMiss = (session: SessionDoc): boolean =>
  session.type === 'DUEL' && DUEL_FORMAT_RULES[duelFormatOf(session)].endsOnMiss;

/**
 * A Sudden Death run is over once it holds a miss. Derived from the attempts as well as the flag,
 * so a crash between saving the miss and setting `endedEarly` can't leave a run that neither
 * continues correctly nor completes.
 */
const runIsOver = (session: SessionDoc, attempts: { isCorrect: boolean }[]): boolean =>
  session.endedEarly || (endsOnMiss(session) && attempts.some((a) => !a.isCorrect));

/** Time since the session's latest answer (or its start): the server clock for the current step. */
function elapsedSince(session: SessionDoc, attempts: { createdAt: Date }[]): number {
  const last = attempts.reduce((t, a) => (a.createdAt > t ? a.createdAt : t), session.startedAt);
  return Math.max(0, Date.now() - last.getTime());
}

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
    ...(runIsOver(session, attempts) ? { endedEarly: true } : {}),
    status: session.status as SessionView['status'],
    startedAt: session.startedAt.toISOString(),
    totalAnswers: session.totalAnswers,
    items: items.sort((a, b) => a.order - b.order),
    ...(session.type === 'DUEL' ? { stepElapsedMs: elapsedSince(session, attempts) } : {}),
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
  if (session.type === 'DUEL') await assertDuelPlayable(session.duelId);
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
async function repairAnsweredXP(
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
  if (session.endedEarly) throw conflict('This run has ended');
  if (endsOnMiss(session)) {
    // Sudden Death is strictly in order: only the first unanswered question may be answered,
    // and nothing after a miss (even if the flag was never set).
    const done = await AnswerAttemptModel.find({ sessionId })
      .select('challengeId isCorrect')
      .lean();
    if (runIsOver(session, done)) throw conflict('This run has ended');
    const doneIds = new Set(done.map((a) => a.challengeId.toString()));
    const firstOpen = [...session.items]
      .sort((a, b) => a.order - b.order)
      .find((i) => !doneIds.has(i.challengeId.toString()));
    if (firstOpen?.challengeId.toString() !== challengeId)
      throw conflict('Answer the questions in order');
  }
  // Server-measured time since the previous answer in this session (or the session start).
  const last = await AnswerAttemptModel.findOne({ sessionId })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .lean();
  const since = last?.createdAt ?? session.startedAt;
  const elapsedMs = Date.now() - since.getTime();
  // Duels: the format's timer per challenge on the server's clock (60 s Classic, 10 s Blitz,
  // 30 s Sudden Death). A late answer is a timeout whatever the client sends, and a timeout
  // records exactly the timer (scoring.md §6).
  const isDuel = session.type === 'DUEL';
  const rules = isDuel ? DUEL_FORMAT_RULES[duelFormatOf(session)] : null;
  const isTimeout =
    !!rules && (answer === DUEL_TIMEOUT_ANSWER || elapsedMs > rules.timerMs + rules.graceMs);
  const result = isTimeout
    ? timeoutEvaluation(challenge, stageIndex)
    : evaluate(challenge, stageIndex, answer);
  const timeTakenMs = isTimeout
    ? rules!.timerMs
    : Math.min(elapsedMs, rules ? rules.timerMs : SESSION.maxAnswerTimeMs);
  const usedHint = item.hintsUsed.includes(stageIndex);

  // 1) The attempt insert is the idempotency guard: a double submit stops here with a 409.
  let attemptId;
  let attemptAt: Date;
  try {
    const attempt = await AnswerAttemptModel.create({
      userId,
      sessionId,
      challengeId,
      stageIndex,
      answer,
      isCorrect: result.isCorrect,
      usedHint,
      isTimeout,
      timeTakenMs,
      topicSlug: challenge.topicSlug,
      type: challenge.type,
      difficulty: challenge.difficulty,
    });
    attemptId = attempt._id;
    attemptAt = attempt.createdAt;
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    await repairAnsweredXP(userId, session, challenge, stageIndex);
    throw conflict('Already answered');
  }

  // 2) Topic progress, then 3) XP through the ledger (first correct only; none for the baseline).
  await recordAnswer(
    userId,
    challenge.topicSlug as TopicSlug,
    result.isCorrect,
    challenge.difficulty,
  );
  const user = await usersRepo.findById(userId);
  await trackRevisit(
    userId,
    {
      id: challengeId,
      topicSlug: challenge.topicSlug as TopicSlug,
      type: challenge.type as ChallengeType,
    },
    result.isCorrect,
    user?.timezone ?? 'UTC',
  );
  const isIncident = challenge.type === 'INCIDENT';
  const isLastStage = stageIndex === answerCount(challenge) - 1;
  const xpEarned = await answerXP({
    userId,
    session,
    challenge,
    stageIndex,
    isCorrect: result.isCorrect,
    usedHint,
    attemptAt,
  });
  if (xpEarned > 0) await AnswerAttemptModel.updateOne({ _id: attemptId }, { $set: { xpEarned } });

  // Sudden Death: the first miss (or timeout) ends the run. A conditional update, so a retry
  // can't flip it twice; the flag lets completion accept fewer answers than the total.
  const endsRun = endsOnMiss(session) && !result.isCorrect;
  if (endsRun)
    await SessionModel.updateOne(
      { _id: sessionId, endedEarly: false },
      { $set: { endedEarly: true } },
    );
  const answeredInSession = await AnswerAttemptModel.countDocuments({ sessionId });
  const nextStage =
    isIncident && !isLastStage
      ? toPublicStage(challenge, stageIndex + 1, ordersOf(item))
      : undefined;
  return {
    ...result,
    xpEarned,
    usedHint,
    timeTakenMs,
    ...(nextStage ? { nextStage } : {}),
    ...(isIncident && isLastStage && challenge.rootCause ? { rootCause: challenge.rootCause } : {}),
    challengeComplete: !isIncident || isLastStage,
    sessionReadyToComplete: endsRun || answeredInSession >= session.totalAnswers,
  };
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

/**
 * Sudden Death scores only the run up to and including the first miss, in question order. The
 * order check in submitAnswer already stops later answers; this makes the score right even if a
 * concurrent submit slipped in before the run was marked as ended.
 */
function runUpToFirstMiss<T extends { challengeId: unknown; isCorrect: boolean }>(
  session: SessionDoc,
  attempts: T[],
): T[] {
  if (!endsOnMiss(session)) return attempts;
  const kept: T[] = [];
  for (const item of [...session.items].sort((a, b) => a.order - b.order)) {
    const a = attempts.find((x) => String(x.challengeId) === item.challengeId.toString());
    if (!a) break;
    kept.push(a);
    if (!a.isCorrect) break;
  }
  return kept;
}

/** Idempotent: only the first call completes the session; later calls return the stored summary. */
export async function completeSession(userId: string, sessionId: string): Promise<SessionSummary> {
  const session = await findOwnSession(userId, sessionId);
  // Summaries stored before P4 have no `bonuses`; default it so clients can rely on the field.
  if (session.status === 'COMPLETED' && session.summary) {
    const stored = session.summary as Omit<SessionSummary, 'bonuses' | 'fixedMistakes'> & {
      bonuses?: BonusAward[];
      fixedMistakes?: number;
    };
    // A replay (reopening a finished Kata, a remount) must not re-fire the rank-up moment.
    const { rankUp: _seen, ...rest } = stored;
    void _seen;
    return { ...rest, bonuses: stored.bonuses ?? [], fixedMistakes: stored.fixedMistakes ?? 0 };
  }

  const all = await AnswerAttemptModel.find({ sessionId })
    .select('challengeId topicSlug isCorrect timeTakenMs xpEarned')
    .lean();
  const attempts = runUpToFirstMiss(session, all);
  // Only a Sudden Death run that ended at a miss may finish short (D-039).
  if (attempts.length < session.totalAnswers && !runIsOver(session, attempts))
    throw conflict('Answer every challenge before finishing');

  const revisitIds = new Set(
    session.items.filter((i) => i.isRevisit).map((i) => i.challengeId.toString()),
  );
  const fixedMistakes = attempts.filter(
    (a) => a.isCorrect && revisitIds.has(a.challengeId.toString()),
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
