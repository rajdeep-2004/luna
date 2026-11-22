import { TOPIC_SLUGS, type TopicSlug } from '@luna/shared';
import { AnswerAttemptModel } from '../../models/AnswerAttempt';
import type { ChallengeDoc } from '../../models/Challenge';
import { AppError } from '../../lib/errors';
import { CHECKPOINT, REVISIT, SESSION } from '../../config/game';
import { localDateKey } from '../../lib/time';
import { challengesRepo } from '../challenges/challenges.repository';
import { getDifficulty } from '../progress/topicProgress.service';
import { dueRevisits } from '../progress/revisit.service';

export type PickedItem = {
  challenge: ChallengeDoc;
  isRevisit: boolean;
  /** Preset option order per stage (duels share one order); shuffled when absent. */
  optionOrders?: string[][];
};
const fresh = (challenge: ChallengeDoc): PickedItem => ({ challenge, isRevisit: false });

export async function seenIds(userId: string): Promise<Set<string>> {
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

/** Topic Practice: up to one due revisit, then the best-ranked fresh picks (progression.md §5). */
export async function pickPractice(
  userId: string,
  topicSlug: TopicSlug,
  timezone: string,
): Promise<PickedItem[]> {
  const [pool, seen, difficulty, revisitIds] = await Promise.all([
    challengesRepo.findActive({ topicSlug, type: { $ne: 'INCIDENT' } }),
    seenIds(userId),
    getDifficulty(userId, topicSlug),
    dueRevisits(userId, {
      today: localDateKey(new Date(), timezone),
      forKata: false,
      topicSlug,
      limit: REVISIT.perPractice,
    }),
  ]);
  if (pool.length === 0) throw new AppError('NOT_FOUND', 'No challenges for this topic yet');
  const revisits = pool.filter((c) => revisitIds.includes(c._id.toString()));
  const rest = rank(
    pool.filter((c) => !revisits.includes(c)),
    seen,
    difficulty,
  ).slice(0, SESSION.practiceSize - revisits.length);
  return [...revisits.map((challenge) => ({ challenge, isRevisit: true })), ...rest.map(fresh)];
}

export async function pickIncident(userId: string, challengeId?: string): Promise<PickedItem[]> {
  if (challengeId) {
    const c = await challengesRepo.findById(challengeId);
    if (!c || c.type !== 'INCIDENT' || !c.isActive)
      throw new AppError('NOT_FOUND', 'Incident not found');
    return [fresh(c)];
  }
  const [pool, seen] = await Promise.all([
    challengesRepo.findActive({ type: 'INCIDENT' }),
    seenIds(userId),
  ]);
  const first = rank(pool, seen, 1)[0];
  if (!first) throw new AppError('NOT_FOUND', 'No incidents available');
  return [fresh(first)];
}

/** One beginner single challenge per topic (users.md §5). */
export async function pickBaseline(): Promise<PickedItem[]> {
  const pool = await challengesRepo.findActive({ difficulty: 1, type: { $ne: 'INCIDENT' } });
  return TOPIC_SLUGS.flatMap((slug) => {
    const options = pool.filter((c) => c.topicSlug === slug);
    const pick = options[Math.floor(Math.random() * options.length)];
    return pick ? [fresh(pick)] : [];
  });
}

/**
 * benchmarks.md §1: one intermediate single challenge per topic, unseen first, so the "after"
 * score isn't inflated by memory. Falls back to any single challenge in the topic.
 */
export async function pickCheckpoint(userId: string): Promise<PickedItem[]> {
  const [pool, seen] = await Promise.all([
    challengesRepo.findActive({ type: { $ne: 'INCIDENT' } }),
    seenIds(userId),
  ]);
  return TOPIC_SLUGS.flatMap((slug) => {
    const inTopic = pool.filter((c) => c.topicSlug === slug);
    const pick = rank(inTopic, seen, CHECKPOINT.difficulty)[0];
    return pick ? [fresh(pick)] : [];
  });
}
