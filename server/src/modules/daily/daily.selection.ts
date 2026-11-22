import type { ChallengeType, TopicSlug } from '@luna/shared';
import { DAILY_KATA_SLOTS, KATA_WEIGHTS, REVISIT } from '../../config/game';
import type { ChallengeDoc } from '../../models/Challenge';
import { UserTopicProgressModel } from '../../models/UserTopicProgress';
import { challengesRepo } from '../challenges/challenges.repository';
import { dueRevisits } from '../progress/revisit.service';
import { getProgressStats } from '../progress/progress.service';
import { weakestTopic } from '../progress/mastery';
import { seenIds, type PickedItem } from '../sessions/sessions.selection';

const W = KATA_WEIGHTS;

type Context = {
  seen: Set<string>;
  difficulty: Map<string, number>;
  preferred: Set<string>;
  weakest: TopicSlug | null;
};

function slotScore(c: ChallengeDoc, ctx: Context, topicsUsed: Map<string, number>): number {
  const target = ctx.difficulty.get(c.topicSlug) ?? 1;
  return (
    (ctx.seen.has(c._id.toString()) ? W.seen : 0) +
    Math.abs(c.difficulty - target) +
    (ctx.preferred.has(c.topicSlug) ? W.preferred : 0) +
    (c.topicSlug === ctx.weakest ? W.weakest : 0) +
    (topicsUsed.get(c.topicSlug) ?? 0) * W.repeatTopic +
    Math.random() * W.jitter
  );
}

/**
 * game-modes.md §2 and progression.md §5. Five slots (Trace, Bug Hunt, 2 × Choice, Incident).
 * Up to 2 due revisits (missed before today) take a slot of their own type first. Every other
 * slot takes the best-scoring challenge of its type: unseen, near the user's difficulty for that
 * topic, leaning to the weakest and preferred topics, spread across topics. A type with no unseen
 * challenge falls back to seen ones (that's the review-XP case); a type with none at all is skipped.
 */
export async function pickDaily(
  userId: string,
  preferredTopics: string[],
  today: string,
): Promise<PickedItem[]> {
  const [pool, seen, rows, revisitIds] = await Promise.all([
    challengesRepo.findActive({}),
    seenIds(userId),
    UserTopicProgressModel.find({ userId }).lean(),
    dueRevisits(userId, { today, forKata: true, limit: REVISIT.perKata }),
  ]);
  const ctx: Context = {
    seen,
    difficulty: new Map(rows.map((r) => [r.topicSlug, r.difficultyLevel])),
    preferred: new Set(preferredTopics),
    weakest: weakestTopic(getProgressStats(rows), preferredTopics as TopicSlug[]),
  };

  const slots: (PickedItem | null)[] = DAILY_KATA_SLOTS.map(() => null);
  const used = new Set<string>();
  const topicsUsed = new Map<string, number>();
  const take = (i: number, challenge: ChallengeDoc, isRevisit: boolean) => {
    slots[i] = { challenge, isRevisit };
    used.add(challenge._id.toString());
    topicsUsed.set(challenge.topicSlug, (topicsUsed.get(challenge.topicSlug) ?? 0) + 1);
  };

  for (const id of revisitIds) {
    const c = pool.find((x) => x._id.toString() === id);
    const i = c ? DAILY_KATA_SLOTS.findIndex((t, k) => t === c.type && !slots[k]) : -1;
    if (c && i >= 0) take(i, c, true);
  }
  DAILY_KATA_SLOTS.forEach((type: ChallengeType, i) => {
    if (slots[i]) return;
    const best = pool
      .filter((c) => c.type === type && !used.has(c._id.toString()))
      .map((c) => ({ c, s: slotScore(c, ctx, topicsUsed) }))
      .sort((a, b) => a.s - b.s)[0];
    if (best) take(i, best.c, false);
  });
  return slots.filter((x): x is PickedItem => x !== null);
}
