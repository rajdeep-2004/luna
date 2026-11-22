import type {
  AnswerResult,
  BonusAward,
  HintRequest,
  HintResult,
  SessionSummary,
  SessionType,
  SessionView,
  StartSessionRequest,
  SubmitAnswerRequest,
  TopicSlug,
} from '@luna/shared';
import { SessionModel, type SessionDoc } from '../../models/Session';
import { AnswerAttemptModel } from '../../models/AnswerAttempt';
import type { ChallengeDoc } from '../../models/Challenge';
import { AppError, conflict, isDuplicateKey, notFound } from '../../lib/errors';
import { HINT_XP_DIVISOR, levelForXP, SESSION, XP_BY_DIFFICULTY } from '../../config/game';
import { challengesRepo } from '../challenges/challenges.repository';
import { answerCount, toPublicChallenge, toPublicStage } from '../challenges/challenges.projection';
import { recordAnswer } from '../progress/topicProgress.service';
import { awardXP } from '../progress/xp.service';
import {
  dailyBonusCandidates,
  firstIncidentCandidate,
  payBonuses,
  updateStreak,
} from '../progress/progression.service';
import { usersRepo } from '../users/users.repository';
import { evaluate } from './sessions.evaluator';
import { pickBaseline, pickIncident, pickPractice } from './sessions.selection';
import { buildSummary } from './sessions.summary';

const shuffle = <T>(xs: T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

/** Mongoose infers nested string arrays loosely; at runtime they are plain string[][]. */
const ordersOf = (item: { optionOrders: unknown }): string[][] => item.optionOrders as string[][];

function optionOrdersFor(c: ChallengeDoc): string[][] {
  if (c.type === 'INCIDENT') return c.stages.map((s) => shuffle(s.options.map((o) => o.id)));
  return [shuffle(c.options.map((o) => o.id))];
}

/** Ledger key for a correct answer: one per challenge, or one per incident stage. */
function xpSourceKey(c: ChallengeDoc, stageIndex: number): string {
  const id = c._id.toString();
  return c.type === 'INCIDENT' ? `challenge:${id}:${stageIndex}` : `challenge:${id}`;
}

async function findOwnSession(userId: string, sessionId: string): Promise<SessionDoc> {
  const session = await SessionModel.findOne({ _id: sessionId, userId });
  if (!session) throw notFound('Session');
  return session;
}

export async function startSession(
  userId: string,
  input: StartSessionRequest,
): Promise<SessionView> {
  const topicSlug: TopicSlug | null = input.type === 'PRACTICE' ? input.topicSlug : null;

  // A repeated tap on "Start" resumes the open session instead of creating a second one.
  const open = await SessionModel.findOne({
    userId,
    type: input.type,
    status: 'ACTIVE',
    topicSlug,
  }).sort({ createdAt: -1 });
  if (open && input.type !== 'INCIDENT') return getSession(userId, open._id.toString());

  if (
    input.type === 'BASELINE' &&
    (await SessionModel.exists({ userId, type: 'BASELINE', status: 'COMPLETED' }))
  ) {
    throw conflict('You have already taken the baseline');
  }

  const picked =
    input.type === 'PRACTICE'
      ? await pickPractice(userId, input.topicSlug)
      : input.type === 'INCIDENT'
        ? await pickIncident(userId, input.challengeId)
        : await pickBaseline();

  let session: SessionDoc;
  try {
    session = await SessionModel.create({
      userId,
      type: input.type,
      topicSlug,
      items: picked.map((c, order) => ({
        challengeId: c._id,
        order,
        optionOrders: optionOrdersFor(c),
      })),
      totalAnswers: picked.reduce((n, c) => n + answerCount(c), 0),
    });
  } catch (err) {
    // A concurrent start won the race: return the session it created.
    if (!isDuplicateKey(err)) throw err;
    const winner = await SessionModel.findOne({
      userId,
      type: input.type,
      status: 'ACTIVE',
      topicSlug,
    });
    if (!winner) throw err;
    return getSession(userId, winner._id.toString());
  }
  return buildView(session, picked);
}

export async function getSession(userId: string, sessionId: string): Promise<SessionView> {
  const session = await findOwnSession(userId, sessionId);
  const challenges = await challengesRepo.findByIds(session.items.map((i) => i.challengeId));
  return buildView(session, challenges);
}

async function buildView(session: SessionDoc, challenges: ChallengeDoc[]): Promise<SessionView> {
  const byId = new Map(challenges.map((c) => [c._id.toString(), c]));
  const attempts = await AnswerAttemptModel.find({ sessionId: session._id })
    .select('challengeId stageIndex answer isCorrect')
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
  const item = session.items.find((i) => i.challengeId.toString() === challengeId);
  if (!item) throw notFound('Challenge in this session');
  const challenge = await challengesRepo.findById(challengeId);
  if (!challenge) throw notFound('Challenge');
  if (stageIndex >= answerCount(challenge)) throw new AppError('VALIDATION_ERROR', 'Invalid stage');
  const answered = await AnswerAttemptModel.countDocuments({ sessionId, challengeId });
  if (stageIndex < answered) throw conflict('Already answered');
  if (stageIndex > answered) throw conflict('Answer the earlier stage first');
  return { session, item, challenge };
}

export async function submitAnswer(
  userId: string,
  sessionId: string,
  input: SubmitAnswerRequest,
): Promise<AnswerResult> {
  const { challengeId, stageIndex, answer } = input;
  const { session, item, challenge } = await loadAnswerContext(
    userId,
    sessionId,
    challengeId,
    stageIndex,
  );
  const result = evaluate(challenge, stageIndex, answer);

  // Server-measured time since the previous answer in this session (or the session start).
  const last = await AnswerAttemptModel.findOne({ sessionId })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .lean();
  const since = last?.createdAt ?? session.startedAt;
  const timeTakenMs = Math.min(Date.now() - since.getTime(), SESSION.maxAnswerTimeMs);
  const usedHint = item.hintsUsed.includes(stageIndex);

  // 1) The attempt insert is the idempotency guard: a double submit stops here with a 409.
  let attemptId;
  try {
    const attempt = await AnswerAttemptModel.create({
      userId,
      sessionId,
      challengeId,
      stageIndex,
      answer,
      isCorrect: result.isCorrect,
      usedHint,
      timeTakenMs,
      topicSlug: challenge.topicSlug,
      type: challenge.type,
      difficulty: challenge.difficulty,
    });
    attemptId = attempt._id;
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    // A retry after a partial failure: re-run the XP award (the ledger makes it a no-op if it
    // already happened), then report the duplicate.
    const prior = await AnswerAttemptModel.findOne({ sessionId, challengeId, stageIndex }).lean();
    if (prior?.isCorrect && session.type !== 'BASELINE') {
      const base = XP_BY_DIFFICULTY[challenge.difficulty as 1 | 2 | 3];
      const amount = prior.usedHint ? Math.floor(base / HINT_XP_DIVISOR) : base;
      await awardXP(userId, xpSourceKey(challenge, stageIndex), amount);
    }
    throw conflict('Already answered');
  }

  // 2) Topic progress, then 3) XP through the ledger (first correct only; none for the baseline).
  await recordAnswer(
    userId,
    challenge.topicSlug as TopicSlug,
    result.isCorrect,
    challenge.difficulty,
  );
  const isIncident = challenge.type === 'INCIDENT';
  const isLastStage = stageIndex === answerCount(challenge) - 1;
  let xpEarned = 0;
  if (result.isCorrect && session.type !== 'BASELINE') {
    const base = XP_BY_DIFFICULTY[challenge.difficulty as 1 | 2 | 3];
    const amount = usedHint ? Math.floor(base / HINT_XP_DIVISOR) : base;
    xpEarned += await awardXP(userId, xpSourceKey(challenge, stageIndex), amount);
  }
  if (xpEarned > 0) await AnswerAttemptModel.updateOne({ _id: attemptId }, { $set: { xpEarned } });

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
    sessionReadyToComplete: answeredInSession >= session.totalAnswers,
  };
}

export async function revealHint(
  userId: string,
  sessionId: string,
  input: HintRequest,
): Promise<HintResult> {
  const { challenge } = await loadAnswerContext(
    userId,
    sessionId,
    input.challengeId,
    input.stageIndex,
  );
  const hint =
    challenge.type === 'INCIDENT' ? challenge.stages[input.stageIndex]?.hint : challenge.hint;
  if (!hint) throw notFound('Hint');
  await SessionModel.updateOne(
    { _id: sessionId, userId, 'items.challengeId': input.challengeId },
    { $addToSet: { 'items.$.hintsUsed': input.stageIndex } },
  );
  return { hint };
}

/** Session types whose completion can pay the first-incident bonus (not baseline or checkpoint). */
const INCIDENT_BONUS_TYPES: SessionType[] = ['INCIDENT', 'DAILY'];

/**
 * Bonuses and streak for a finished session. Every step is idempotent (ledger keys, streak
 * compare-and-set), so it runs before the status flip: a crash or retry re-runs it safely and
 * a bonus is never lost or paid twice.
 */
async function settleProgression(
  userId: string,
  session: SessionDoc,
  summary: SessionSummary,
): Promise<SessionSummary> {
  const type = session.type as SessionType;
  const candidates = [];
  let streak: SessionSummary['streak'];
  if (type === 'DAILY' && session.dailyDate) {
    const s = await updateStreak(userId);
    streak = { current: s.current, longest: s.longest, extended: s.extended };
    const allCorrect = summary.correctAnswers === summary.totalAnswers;
    candidates.push(...dailyBonusCandidates(session.dailyDate, allCorrect, s));
  }
  if (INCIDENT_BONUS_TYPES.includes(type)) {
    const challenges = await challengesRepo.findByIds(session.items.map((i) => i.challengeId));
    if (challenges.some((c) => c.type === 'INCIDENT')) candidates.push(firstIncidentCandidate());
  }
  const bonuses = await payBonuses(userId, candidates, session.startedAt);
  const xpEarned = summary.xpEarned + bonuses.reduce((n, b) => n + b.xp, 0);

  const user = await usersRepo.findById(userId);
  const after = levelForXP(user?.totalXP ?? 0);
  const before = levelForXP(Math.max(0, (user?.totalXP ?? 0) - xpEarned));
  const rankUp =
    after.level > before.level
      ? { level: after.level, rankName: after.name, kanji: after.kanji }
      : undefined;
  return { ...summary, xpEarned, bonuses, ...(streak ? { streak } : {}), ...(rankUp ? { rankUp } : {}) };
}

/** Idempotent: only the first call completes the session; later calls return the stored summary. */
export async function completeSession(userId: string, sessionId: string): Promise<SessionSummary> {
  const session = await findOwnSession(userId, sessionId);
  // Summaries stored before P4 have no `bonuses`; default it so clients can rely on the field.
  if (session.status === 'COMPLETED' && session.summary) {
    const stored = session.summary as Omit<SessionSummary, 'bonuses'> & { bonuses?: BonusAward[] };
    return { ...stored, bonuses: stored.bonuses ?? [] };
  }

  const attempts = await AnswerAttemptModel.find({ sessionId })
    .select('topicSlug isCorrect timeTakenMs xpEarned')
    .lean();
  if (attempts.length < session.totalAnswers)
    throw conflict('Answer every challenge before finishing');

  const base = buildSummary(sessionId, session.type as SessionType, attempts);
  const summary = await settleProgression(userId, session, base);
  const updated = await SessionModel.findOneAndUpdate(
    { _id: sessionId, userId, status: 'ACTIVE' },
    { $set: { status: 'COMPLETED', completedAt: new Date(), summary } },
    { returnDocument: 'after' },
  );
  if (updated) return summary;
  // Lost a race with a parallel completion: return what that call stored.
  const stored = await SessionModel.findById(sessionId).select('summary').lean();
  return (stored?.summary as SessionSummary) ?? summary;
}
