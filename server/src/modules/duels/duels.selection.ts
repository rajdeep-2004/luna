import { TOPIC_SLUGS, type DuelFormat } from '@luna/shared';
import { ADAPTIVE, DUEL } from '../../config/game';
import { bestTier, cryptoRng, pickByScore, type Rng } from '../../lib/sampling';
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
 * Single challenges in the format's slot order (Classic: 1 Trace, 1 Bug Hunt, 3 Engineer's
 * Choice), drawn at random (D-048) from the challenges closest to the target difficulty, weighted
 * away from topics already in the duel. Picked once per duel and shared by both players. Falls back to any difficulty, then to any kind, when a pool is thin.
 */
export async function pickDuelChallenges(
  difficulty: number,
  format: DuelFormat = 'CLASSIC',
  rng: Rng = cryptoRng,
): Promise<ChallengeDoc[]> {
  const pool = await challengesRepo.findActive({ type: { $ne: 'INCIDENT' } });
  const picked: ChallengeDoc[] = [];
  const usedTopics = new Map<string, number>(TOPIC_SLUGS.map((t) => [t, 0]));
  for (const type of DUEL.slotsByFormat[format]) {
    const unpicked = pool.filter((c) => !picked.includes(c));
    const ofKind = unpicked.filter((c) => c.type === type);
    const nearest = bestTier(ofKind.length ? ofKind : unpicked, (c) =>
      Math.abs(c.difficulty - difficulty),
    );
    const best = pickByScore(
      nearest,
      (c) => (usedTopics.get(c.topicSlug) ?? 0) * DUEL.repeatTopicPenalty,
      rng,
    );
    if (!best) throw new AppError('NOT_FOUND', 'Not enough challenges for a duel yet');
    picked.push(best);
    usedTopics.set(best.topicSlug, (usedTopics.get(best.topicSlug) ?? 0) + 1);
  }
  return picked;
}
