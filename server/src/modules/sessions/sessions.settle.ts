import type { SessionSummary, SessionType, TopicSlug } from '@luna/shared';
import { INCIDENT_BONUS_SESSION_TYPES, levelForXP, START_DIFFICULTY } from '../../config/game';
import { Types } from 'mongoose';
import { AnswerAttemptModel } from '../../models/AnswerAttempt';
import { XpEventModel } from '../../models/XpEvent';
import type { SessionDoc } from '../../models/Session';
import { challengesRepo } from '../challenges/challenges.repository';
import {
  dailyBonusCandidates,
  firstIncidentCandidate,
  payBonuses,
  updateStreak,
} from '../progress/progression.service';
import { setDifficulty } from '../progress/topicProgress.service';
import { usersRepo } from '../users/users.repository';

async function ledgerTotal(userId: string): Promise<number> {
  const [row] = await XpEventModel.aggregate<{ total: number }>([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return row?.total ?? 0;
}

/**
 * progression.md §4: the baseline sets each topic's start. A correct beginner question keeps the
 * segment's difficulty; a wrong one starts that topic at 1. Idempotent (plain sets).
 */
async function applyBaseline(userId: string, session: SessionDoc): Promise<void> {
  const user = await usersRepo.findById(userId);
  const level = (user?.experienceLevel ?? 'beginner') as keyof typeof START_DIFFICULTY;
  const attempts = await AnswerAttemptModel.find({ sessionId: session._id })
    .select('topicSlug isCorrect')
    .lean();
  for (const a of attempts) {
    const start = a.isCorrect ? START_DIFFICULTY[level] : 1;
    await setDifficulty(userId, a.topicSlug as TopicSlug, start as 1 | 2 | 3);
  }
}

/**
 * Bonuses and streak for a finished session. Every step is idempotent (ledger keys, streak
 * compare-and-set), so it runs before the status flip: a crash or retry re-runs it safely and
 * a bonus is never lost or paid twice.
 */
export async function settleProgression(
  userId: string,
  session: SessionDoc,
  summary: SessionSummary,
): Promise<SessionSummary> {
  const type = session.type as SessionType;
  const candidates = [];
  let streak: SessionSummary['streak'];
  if (type === 'DAILY' && session.dailyDate) {
    const s = await updateStreak(userId, session.dailyDate);
    streak = { current: s.current, longest: s.longest, extended: s.extended };
    const allCorrect = summary.correctAnswers === summary.totalAnswers;
    candidates.push(...dailyBonusCandidates(session.dailyDate, allCorrect, s));
  }
  if (type === 'BASELINE') await applyBaseline(userId, session);
  if (INCIDENT_BONUS_SESSION_TYPES.includes(type)) {
    const challenges = await challengesRepo.findByIds(session.items.map((i) => i.challengeId));
    if (challenges.some((c) => c.type === 'INCIDENT')) candidates.push(firstIncidentCandidate());
  }
  const bonuses = await payBonuses(userId, candidates, session.startedAt);
  const xpEarned = summary.xpEarned + bonuses.reduce((n, b) => n + b.xp, 0);

  // Ledger total, not users.totalXP: a parallel completion may have inserted a ledger row but not
  // yet applied its $inc, and both calls must compute the same rank-up.
  const total = await ledgerTotal(userId);
  const after = levelForXP(total);
  const before = levelForXP(Math.max(0, total - xpEarned));
  const rankUp =
    after.level > before.level
      ? { level: after.level, rankName: after.name, kanji: after.kanji }
      : undefined;
  return {
    ...summary,
    xpEarned,
    bonuses,
    ...(streak ? { streak } : {}),
    ...(rankUp ? { rankUp } : {}),
  };
}
