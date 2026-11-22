import { TOPIC_SLUGS, type TopicSlug } from '@luna/shared';
import { AnswerAttemptModel } from '../../models/AnswerAttempt';
import type { ChallengeDoc } from '../../models/Challenge';
import { AppError } from '../../lib/errors';
import { SESSION } from '../../config/game';
import { challengesRepo } from '../challenges/challenges.repository';
import { getDifficulty } from '../progress/topicProgress.service';

async function seenIds(userId: string): Promise<Set<string>> {
  const ids = await AnswerAttemptModel.distinct('challengeId', { userId });
  return new Set(ids.map(String));
}

/** Unseen first, then closest to the target difficulty; random among equals. */
function rank(pool: ChallengeDoc[], seen: Set<string>, difficulty: number): ChallengeDoc[] {
  return pool
    .map((c) => ({
      c,
      score:
        (seen.has(c._id.toString()) ? 10 : 0) +
        Math.abs(c.difficulty - difficulty) +
        Math.random() * 0.5,
    }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.c);
}

export async function pickPractice(userId: string, topicSlug: TopicSlug): Promise<ChallengeDoc[]> {
  const [pool, seen, difficulty] = await Promise.all([
    challengesRepo.findActive({ topicSlug, type: { $ne: 'INCIDENT' } }),
    seenIds(userId),
    getDifficulty(userId, topicSlug),
  ]);
  if (pool.length === 0) throw new AppError('NOT_FOUND', 'No challenges for this topic yet');
  return rank(pool, seen, difficulty).slice(0, SESSION.practiceSize);
}

export async function pickIncident(userId: string, challengeId?: string): Promise<ChallengeDoc[]> {
  if (challengeId) {
    const c = await challengesRepo.findById(challengeId);
    if (!c || c.type !== 'INCIDENT' || !c.isActive)
      throw new AppError('NOT_FOUND', 'Incident not found');
    return [c];
  }
  const [pool, seen] = await Promise.all([
    challengesRepo.findActive({ type: 'INCIDENT' }),
    seenIds(userId),
  ]);
  const first = rank(pool, seen, 1)[0];
  if (!first) throw new AppError('NOT_FOUND', 'No incidents available');
  return [first];
}

/** One beginner single challenge per topic (users.md §5). */
export async function pickBaseline(): Promise<ChallengeDoc[]> {
  const pool = await challengesRepo.findActive({ difficulty: 1, type: { $ne: 'INCIDENT' } });
  return TOPIC_SLUGS.flatMap((slug) => {
    const options = pool.filter((c) => c.topicSlug === slug);
    const pick = options[Math.floor(Math.random() * options.length)];
    return pick ? [pick] : [];
  });
}
