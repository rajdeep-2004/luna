import type { Difficulty, MasteryPhase, TopicSlug } from './domain';

export type TopicProgressView = {
  topicSlug: TopicSlug;
  phase: MasteryPhase;
  answers: number;
  /** Over the last 10 answers; null before the first answer. */
  recentAccuracy: number | null;
  difficulty: Difficulty;
};

export type ProgressView = {
  level: {
    level: number;
    rankName: string;
    kanji: string;
    totalXP: number;
    levelStartXP: number;
    /** Null at the top rank. */
    nextLevelXP: number | null;
  };
  streak: { current: number; longest: number; doneToday: boolean; wentOut: boolean };
  topics: TopicProgressView[];
  weakestTopic: TopicSlug | null;
  revisitsQueued: number;
};
