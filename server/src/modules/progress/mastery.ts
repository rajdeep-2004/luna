import { TOPIC_SLUGS, type MasteryPhase, type TopicSlug } from '@luna/shared';
import { MASTERY } from '../../config/game';

export type TopicStats = {
  topicSlug: TopicSlug;
  answers: number;
  recentResults: boolean[];
  hasAdvancedCorrect: boolean;
  lastPractisedAt: Date | null;
};

export function recentAccuracy(recent: boolean[]): number | null {
  return recent.length ? recent.filter(Boolean).length / recent.length : null;
}

/** progression.md §2, pure. The moon can wane: it's judged on the rolling window only. */
export function masteryPhase(t: TopicStats): MasteryPhase {
  const acc = recentAccuracy(t.recentResults);
  if (t.answers < MASTERY.minAnswers || acc === null) return 'NEW';
  if (acc < MASTERY.crescentBelow) return 'CRESCENT';
  const full =
    t.answers >= MASTERY.fullMinAnswers && acc >= MASTERY.fullAtLeast && t.hasAdvancedCorrect;
  return full ? 'FULL' : 'HALF';
}

/**
 * progression.md §3, pure. Lowest recent accuracy among topics with enough answers; ties go to
 * the least recently practised. With none eligible: the first preferred topic still unexplored,
 * then the first unexplored topic at all. Null only when every topic is explored and none rated.
 */
export function weakestTopic(stats: TopicStats[], preferred: TopicSlug[]): TopicSlug | null {
  const rated = stats
    .filter((t) => t.answers >= MASTERY.minAnswers && t.recentResults.length > 0)
    .map((t) => ({ t, acc: recentAccuracy(t.recentResults)! }))
    .sort(
      (a, b) =>
        a.acc - b.acc ||
        (a.t.lastPractisedAt?.getTime() ?? 0) - (b.t.lastPractisedAt?.getTime() ?? 0),
    );
  if (rated[0]) return rated[0].t.topicSlug;
  const answersOf = new Map(stats.map((t) => [t.topicSlug, t.answers]));
  const unexplored = (slug: TopicSlug) => (answersOf.get(slug) ?? 0) < MASTERY.minAnswers;
  return preferred.find(unexplored) ?? TOPIC_SLUGS.find(unexplored) ?? null;
}
