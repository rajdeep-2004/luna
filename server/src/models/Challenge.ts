import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { CHALLENGE_TYPES, DIFFICULTIES, TOPIC_SLUGS } from '@luna/shared';

const optionSchema = new Schema(
  { id: { type: String, required: true }, text: { type: String, required: true } },
  { _id: false },
);

/** One Incident Room stage. `answerKey`, `explanation` and `hint` never leave the server unanswered. */
const stageSchema = new Schema(
  {
    title: { type: String, required: true },
    evidence: { type: String, required: true },
    prompt: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    answerKey: { type: String, required: true },
    explanation: { type: String, required: true },
    misconception: { type: String, required: true },
    hint: { type: String, default: null },
  },
  { _id: false },
);

const challengeSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    topicSlug: { type: String, enum: TOPIC_SLUGS, required: true },
    subtopic: { type: String, required: true },
    type: { type: String, enum: CHALLENGE_TYPES, required: true },
    difficulty: { type: Number, enum: DIFFICULTIES, required: true },
    prompt: { type: String, required: true },
    codeSnippet: { type: String, default: null },
    options: { type: [optionSchema], default: [] },
    /** Option id, or the 1-based line number for Bug Hunt. Empty for incidents (keys live on stages). */
    answerKey: { type: String, default: null },
    explanation: { type: String, default: null },
    misconception: { type: String, default: null },
    optionFeedback: { type: Map, of: String, default: null },
    hint: { type: String, default: null },
    stages: { type: [stageSchema], default: [] },
    rootCause: { type: String, default: null },
    estimatedTimeSec: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

challengeSchema.index({ topicSlug: 1, type: 1, difficulty: 1, isActive: 1 });

export type Challenge = InferSchemaType<typeof challengeSchema>;
export type ChallengeDoc = HydratedDocument<Challenge>;
export const ChallengeModel = model('Challenge', challengeSchema);
