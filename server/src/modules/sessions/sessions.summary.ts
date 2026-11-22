import type { SessionSummary, SessionType, TopicSlug } from '@luna/shared';
import { GRADES, WEAK_TOPIC_ACCURACY } from '../../config/game';

type AttemptRow = { topicSlug: string; isCorrect: boolean; timeTakenMs: number; xpEarned: number };

export function gradeFor(accuracy: number): SessionSummary['grade'] {
  return (GRADES.find((g) => accuracy >= g.minAccuracy) ?? GRADES[GRADES.length - 1]!).grade;
}

/** Pure: builds the end-of-session summary from its attempts. */
export function buildSummary(
  sessionId: string,
  type: SessionType,
  attempts: AttemptRow[],
): SessionSummary {
  const correct = attempts.filter((a) => a.isCorrect).length;
  const accuracy = attempts.length ? correct / attempts.length : 0;
  const byTopic = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const t = byTopic.get(a.topicSlug) ?? { correct: 0, total: 0 };
    byTopic.set(a.topicSlug, { correct: t.correct + (a.isCorrect ? 1 : 0), total: t.total + 1 });
  }
  const perTopic = [...byTopic].map(([topicSlug, v]) => ({
    topicSlug: topicSlug as TopicSlug,
    ...v,
  }));
  return {
    sessionId,
    type,
    totalAnswers: attempts.length,
    correctAnswers: correct,
    accuracy: Math.round(accuracy * 100) / 100,
    grade: gradeFor(accuracy),
    totalTimeMs: attempts.reduce((s, a) => s + a.timeTakenMs, 0),
    xpEarned: attempts.reduce((s, a) => s + a.xpEarned, 0),
    perTopic,
    weakTopics: perTopic
      .filter((t) => t.correct / t.total < WEAK_TOPIC_ACCURACY)
      .map((t) => t.topicSlug),
    bonuses: [],
  };
}
