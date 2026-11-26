import { TOPIC_SLUGS, type PracticeMode, type TopicSlug } from '@luna/shared';
import { AnswerAttemptModel } from '../../models/AnswerAttempt';
import type { ChallengeDoc } from '../../models/Challenge';
import { SessionModel } from '../../models/Session';
import { AppError } from '../../lib/errors';
import { CHECKPOINT, REVISIT, SELECTION, SESSION } from '../../config/game';
import { cryptoRng, tieredOrder, weightedPick, type Rng } from '../../lib/sampling';
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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Challenges that count as seen for ranking: every one the user has answered, plus every one served
 * in their sessions of the last `SELECTION.recentDays` days, answered or not (D-048). So quitting a
 * round and starting another doesn't replay the questions just shown. The session read is bounded
 * and served by the `{userId, createdAt}` index.
 */
export async function seenIds(userId: string, now = new Date()): Promise<Set<string>> {
  const since = new Date(now.getTime() - SELECTION.recentDays * DAY_MS);
  const [answered, recent] = await Promise.all([
    AnswerAttemptModel.distinct('challengeId', { userId }),
    SessionModel.find({ userId, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(SELECTION.recentSessionsMax)
      .select('items.challengeId')
      .lean(),
  ]);
  const served = recent.flatMap((s) => s.items.map((i) => i.challengeId));
  return new Set([...answered, ...served].map(String));
}

/**
 * A random order (D-048) that keeps the hard rules: unseen before seen, then closest to the target
 * difficulty. Only the order inside one tier is random, so a round takes the best tier first.
 */
function rank(
  pool: ChallengeDoc[],
  seen: Set<string>,
  difficulty: number,
  rng: Rng,
): ChallengeDoc[] {
  return tieredOrder(
    pool,
    (c) =>
      (seen.has(c._id.toString()) ? SELECTION.seenTier : 0) + Math.abs(c.difficulty - difficulty),
    rng,
  );
}

/**
 * Topic Practice: up to one due revisit, then fresh picks in sampled order (progression.md §5).
 * With a `mode` it is a mode round (D-039): only that challenge kind, this topic's first, then
 * topped up to the round size from the same kind in other topics, so a thin topic still fills.
 */
export async function pickPractice(
  userId: string,
  topicSlug: TopicSlug,
  timezone: string,
  mode?: PracticeMode,
  rng: Rng = cryptoRng,
): Promise<PickedItem[]> {
  const [pool, seen, difficulty, revisitIds] = await Promise.all([
    challengesRepo.findActive(mode ? { type: mode } : { topicSlug, type: { $ne: 'INCIDENT' } }),
    seenIds(userId),
    getDifficulty(userId, topicSlug),
    dueRevisits(userId, {
      today: localDateKey(new Date(), timezone),
      forKata: false,
      topicSlug,
      limit: REVISIT.perPractice,
    }),
  ]);
  const inTopic = pool.filter((c) => c.topicSlug === topicSlug);
  if (inTopic.length === 0)
    throw new AppError('NOT_FOUND', 'No challenges of this kind in this topic yet');
  const revisits = inTopic.filter((c) => revisitIds.includes(c._id.toString()));
  const ownPicks = rank(
    inTopic.filter((c) => !revisits.includes(c)),
    seen,
    difficulty,
    rng,
  );
  const others = mode
    ? rank(
        pool.filter((c) => c.topicSlug !== topicSlug),
        seen,
        difficulty,
        rng,
      )
    : [];
  const rest = [...ownPicks, ...others].slice(0, SESSION.practiceSize - revisits.length);
  return [...revisits.map((challenge) => ({ challenge, isRevisit: true })), ...rest.map(fresh)];
}

/**
 * An Incident Room run. `challengeId` replays a chosen incident; `topicSlug` picks that topic's boss
 * (unseen first, D-039), falling back to any incident when the topic has none yet.
 */
export async function pickIncident(
  userId: string,
  challengeId?: string,
  topicSlug?: TopicSlug,
  rng: Rng = cryptoRng,
): Promise<PickedItem[]> {
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
  const inTopic = topicSlug ? pool.filter((c) => c.topicSlug === topicSlug) : [];
  const first = rank(inTopic.length ? inTopic : pool, seen, 1, rng)[0];
  if (!first) throw new AppError('NOT_FOUND', 'No incidents available');
  return [fresh(first)];
}

/** One beginner single challenge per topic (users.md §5). */
export async function pickBaseline(rng: Rng = cryptoRng): Promise<PickedItem[]> {
  const pool = await challengesRepo.findActive({ difficulty: 1, type: { $ne: 'INCIDENT' } });
  return TOPIC_SLUGS.flatMap((slug) => {
    const options = pool.filter((c) => c.topicSlug === slug);
    const pick = weightedPick(options, () => 1, rng);
    return pick ? [fresh(pick)] : [];
  });
}

/**
 * benchmarks.md §1: one intermediate single challenge per topic, unseen first, so the "after"
 * score isn't inflated by memory. Falls back to any single challenge in the topic.
 */
export async function pickCheckpoint(userId: string, rng: Rng = cryptoRng): Promise<PickedItem[]> {
  const [pool, seen] = await Promise.all([
    challengesRepo.findActive({ type: { $ne: 'INCIDENT' } }),
    seenIds(userId),
  ]);
  return TOPIC_SLUGS.flatMap((slug) => {
    const inTopic = pool.filter((c) => c.topicSlug === slug);
    const pick = rank(inTopic, seen, CHECKPOINT.difficulty, rng)[0];
    return pick ? [fresh(pick)] : [];
  });
}
