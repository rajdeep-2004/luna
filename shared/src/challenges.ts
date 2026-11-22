import type { ChallengeType, Difficulty, TopicSlug } from './domain';

export type Topic = {
  slug: TopicSlug;
  name: string;
  description: string;
  icon: string;
  order: number;
};

export type PublicOption = { id: string; text: string };

/** One incident stage as the client sees it: no answer key, no explanation. */
export type PublicStage = {
  index: number;
  title: string;
  evidence: string;
  prompt: string;
  options: PublicOption[];
  hasHint: boolean;
};

/**
 * A challenge as the client sees it before answering. Answer keys, explanations and
 * hints never appear here (docs/decisions.md D-010).
 */
export type PublicChallenge = {
  id: string;
  title: string;
  topicSlug: TopicSlug;
  subtopic: string;
  type: ChallengeType;
  difficulty: Difficulty;
  prompt: string;
  codeSnippet?: string;
  options?: PublicOption[];
  hasHint: boolean;
  estimatedTimeSec: number;
  stageCount: number;
};
