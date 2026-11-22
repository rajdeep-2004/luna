import type { AchievementKey, AchievementView, SessionType } from '@luna/shared';
import { ACHIEVEMENTS } from '../../config/game';
import { isDuplicateKey } from '../../lib/errors';
import { AnswerAttemptModel } from '../../models/AnswerAttempt';
import { SessionModel } from '../../models/Session';
import { UserAchievementModel } from '../../models/UserAchievement';

type Definition = (typeof ACHIEVEMENTS)[number];

const completed = (userId: string, types?: SessionType[]) =>
  SessionModel.countDocuments({
    userId,
    status: 'COMPLETED',
    ...(types ? { type: { $in: types } } : {}),
  });

/**
 * Current count towards each achievement, from data the server already stores. The counts are
 * cumulative, so a check that was skipped (a crash after a completion) is caught up the next time.
 * Incident Rooms count solo incidents and Daily Katas, since every Kata closes with one.
 */
const COUNTERS: Record<AchievementKey, (userId: string) => Promise<number>> = {
  FIRST_COMMIT: (userId) => completed(userId),
  BUG_HUNTER: (userId) =>
    AnswerAttemptModel.countDocuments({ userId, type: 'BUG_HUNT', isCorrect: true }),
  DAILY_GRINDER: (userId) => completed(userId, ['DAILY']),
  INCIDENT_COMMANDER: (userId) => completed(userId, ['INCIDENT', 'DAILY']),
  PERFECT_RUN: (userId) =>
    SessionModel.countDocuments({
      userId,
      type: 'DAILY',
      status: 'COMPLETED',
      'summary.totalAnswers': { $gt: 0 },
      $expr: { $eq: ['$summary.correctAnswers', '$summary.totalAnswers'] },
    }),
};

async function earnedKeys(userId: string): Promise<Map<string, Date>> {
  const rows = await UserAchievementModel.find({ userId }).select('key awardedAt').lean();
  return new Map(rows.map((r) => [r.key, r.awardedAt]));
}

/**
 * Checks the achievements the user doesn't have yet and awards the ones now met. Runs after a
 * session is marked COMPLETED. The unique index makes a parallel run award each badge once;
 * only the run whose insert succeeded reports it, so the toast shows once.
 */
export async function evaluateAchievements(userId: string): Promise<Definition[]> {
  const earned = await earnedKeys(userId);
  const awarded: Definition[] = [];
  for (const def of ACHIEVEMENTS) {
    if (earned.has(def.key)) continue;
    if ((await COUNTERS[def.key](userId)) < def.target) continue;
    try {
      await UserAchievementModel.create({ userId, key: def.key });
      awarded.push(def);
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
    }
  }
  return awarded;
}

/** All five, earned ones with their date, locked ones with their condition (progression.md §7). */
export async function listAchievements(userId: string): Promise<AchievementView[]> {
  const earned = await earnedKeys(userId);
  return ACHIEVEMENTS.map((def) => ({
    key: def.key,
    name: def.name,
    condition: def.condition,
    icon: def.icon,
    awardedAt: earned.get(def.key)?.toISOString() ?? null,
  }));
}
