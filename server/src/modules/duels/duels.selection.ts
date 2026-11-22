import { TOPIC_SLUGS } from '@luna/shared';
import { ADAPTIVE, DUEL } from '../../config/game';
import { AppError } from '../../lib/errors';
import type { ChallengeDoc } from '../../models/Challenge';
import { UserTopicProgressModel } from '../../models/UserTopicProgress';
import { challengesRepo } from '../challenges/challenges.repository';

/** competition.md §2: the creator's average topic difficulty, rounded, sets the duel's level. */
export async function duelDifficulty(userId: string): Promise<number> {
  const rows = await UserTopicProgressModel.find({ userId }).select('difficultyLevel').lean();
  if (!rows.length) return ADAPTIVE.min;
  const avg = rows.reduce((n, r) => n + r.difficultyLevel, 0) / rows.length;
  return Math.min(ADAPTIVE.max, Math.max(ADAPTIVE.min, Math.round(avg)));
}

/**
 * Five single challenges in slot order (1 Trace, 1 Bug Hunt, 3 Engineer's Choice), mixed across
 * the topics: closest to the target difficulty, a penalty for repeating a topic, random among
 * equals. Falls back to any difficulty when a pool is thin.
 */
export async function pickDuelChallenges(difficulty: number): Promise<ChallengeDoc[]> {
  const pool = await challengesRepo.findActive({ type: { $ne: 'INCIDENT' } });
  const picked: ChallengeDoc[] = [];
  const usedTopics = new Map<string, number>(TOPIC_SLUGS.map((t) => [t, 0]));
  for (const type of DUEL.slots) {
    const best = pool
      .filter((c) => c.type === type && !picked.includes(c))
      .map((c) => ({
        c,
        score:
          Math.abs(c.difficulty - difficulty) +
          (usedTopics.get(c.topicSlug) ?? 0) * 2 +
          Math.random() * 0.5,
      }))
      .sort((a, b) => a.score - b.score)[0]?.c;
    if (!best) throw new AppError('NOT_FOUND', 'Not enough challenges for a duel yet');
    picked.push(best);
    usedTopics.set(best.topicSlug, (usedTopics.get(best.topicSlug) ?? 0) + 1);
  }
  return picked;
}
