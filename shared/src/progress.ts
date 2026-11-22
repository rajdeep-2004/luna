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
  assessments: AssessmentStatus;
};

export type AssessmentScore = { correct: number; total: number; completedAt: string };

/** benchmarks.md §1: Baseline "before", latest Checkpoint "after", and when the next unlocks. */
export type AssessmentStatus = {
  baseline: AssessmentScore | null;
  checkpoint: AssessmentScore | null;
  checkpointAvailable: boolean;
  /** Daily Katas left until the next Checkpoint unlocks; 0 when available. */
  katasUntilCheckpoint: number;
};
