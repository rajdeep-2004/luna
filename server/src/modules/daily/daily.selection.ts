import type { ChallengeType, TopicSlug } from '@luna/shared';
import { DAILY_KATA_SLOTS, KATA_WEIGHTS, REVISIT, SELECTION } from '../../config/game';
import { bestTier, cryptoRng, pickByScore, type Rng } from '../../lib/sampling';
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

/** Hard tier (lower first): unseen before seen, then nearest to the user's level in that topic. */
function slotTier(c: ChallengeDoc, ctx: Context): number {
  const target = ctx.difficulty.get(c.topicSlug) ?? 1;
  return (
    (ctx.seen.has(c._id.toString()) ? SELECTION.seenTier : 0) + Math.abs(c.difficulty - target)
  );
}

/** Soft preference inside the tier (lower is likelier): weakest and preferred topics, spread. */
function slotScore(c: ChallengeDoc, ctx: Context, topicsUsed: Map<string, number>): number {
  return (
    (ctx.preferred.has(c.topicSlug) ? W.preferred : 0) +
    (c.topicSlug === ctx.weakest ? W.weakest : 0) +
    (topicsUsed.get(c.topicSlug) ?? 0) * W.repeatTopic
  );
}

/**
 * game-modes.md §2 and progression.md §5. Five slots (Trace, Bug Hunt, 2 × Choice, Incident).
 * Up to 2 due revisits (missed before today) take a slot of their own type first. Every other
 * slot draws one challenge of its type at random (D-048) from the best tier (unseen first, then
 * nearest the user's difficulty for that topic), weighted toward the weakest and preferred topics
 * and away from topics already in the Kata, so two identical players get different Katas. A type with no unseen
 * challenge falls back to seen ones (that's the review-XP case); a type with none at all is skipped.
 */
export async function pickDaily(
  userId: string,
  preferredTopics: string[],
  today: string,
  rng: Rng = cryptoRng,
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
    const eligible = pool.filter((c) => c.type === type && !used.has(c._id.toString()));
    const tier = bestTier(eligible, (c) => slotTier(c, ctx));
    const pick = pickByScore(tier, (c) => slotScore(c, ctx, topicsUsed), rng);
    if (pick) take(i, pick, false);
  });
  return slots.filter((x): x is PickedItem => x !== null);
}
