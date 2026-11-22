import { z } from 'zod';
import { TOPIC_SLUGS } from './domain';
import type { SessionType, TopicSlug } from './domain';
import type { PublicChallenge, PublicStage } from './challenges';

const ObjectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id');

export const StartSessionRequest = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PRACTICE'), topicSlug: z.enum(TOPIC_SLUGS) }),
  z.object({ type: z.literal('INCIDENT'), challengeId: ObjectId.optional() }),
  z.object({ type: z.literal('BASELINE') }),
]);
export type StartSessionRequest = z.infer<typeof StartSessionRequest>;

export const SubmitAnswerRequest = z.object({
  challengeId: ObjectId,
  stageIndex: z.number().int().min(0).max(5).default(0),
  answer: z.string().trim().min(1).max(40),
});
export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequest>;

export const HintRequest = z.object({
  challengeId: ObjectId,
  stageIndex: z.number().int().min(0).max(5).default(0),
});
export type HintRequest = z.infer<typeof HintRequest>;

export type AttemptView = { stageIndex: number; answer: string; isCorrect: boolean };

export type SessionItemView = {
  order: number;
  isRevisit: boolean;
  challenge: PublicChallenge;
  /** Incident only: stages revealed so far (stage 0 at start, the next after each answer). */
  revealedStages: PublicStage[];
  attempts: AttemptView[];
  isComplete: boolean;
};

export type SessionView = {
  id: string;
  type: SessionType;
  status: 'ACTIVE' | 'COMPLETED';
  startedAt: string;
  totalAnswers: number;
  items: SessionItemView[];
};

export type AnswerResult = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  misconception: string;
  /** Engineer's Choice: why each wrong option is worse, keyed by option id. */
  optionFeedback?: Record<string, string>;
  xpEarned: number;
  usedHint: boolean;
  timeTakenMs: number;
  nextStage?: PublicStage;
  /** Incident only, after the last stage. */
  rootCause?: string;
  challengeComplete: boolean;
  sessionReadyToComplete: boolean;
};

export type HintResult = { hint: string };

export type TopicResult = { topicSlug: TopicSlug; correct: number; total: number };

export type BonusKind = 'DAILY_KATA' | 'PERFECT_KATA' | 'FIRST_INCIDENT' | 'STREAK_MILESTONE';
export type BonusAward = { kind: BonusKind; xp: number; /** Streak milestones only. */ days?: number };

export type SessionSummary = {
  sessionId: string;
  type: SessionType;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  grade: 'KANPEKI' | 'SUGOI' | 'YOSHI' | 'MADA_MADA';
  totalTimeMs: number;
  /** Answer XP plus bonuses. */
  xpEarned: number;
  perTopic: TopicResult[];
  weakTopics: TopicSlug[];
  bonuses: BonusAward[];
  /** Revisits (past misses) answered correctly in this session: "You fixed a past mistake". */
  fixedMistakes: number;
  /** Daily Kata only: the streak after this Kata. */
  streak?: { current: number; longest: number; extended: boolean };
  /** Set when this session's XP crossed a level threshold. */
  rankUp?: { level: number; rankName: string; kanji: string };
};
