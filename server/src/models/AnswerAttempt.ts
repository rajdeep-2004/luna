import { Schema, model, type InferSchemaType } from 'mongoose';
import { CHALLENGE_TYPES, TOPIC_SLUGS } from '@luna/shared';

const answerAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    stageIndex: { type: Number, default: 0 },
    answer: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    usedHint: { type: Boolean, default: false },
    isTimeout: { type: Boolean, default: false },
    /** Measured on the server, never taken from the client (D-010). */
    timeTakenMs: { type: Number, required: true },
    xpEarned: { type: Number, default: 0 },
    topicSlug: { type: String, enum: TOPIC_SLUGS, required: true },
    type: { type: String, enum: CHALLENGE_TYPES, required: true },
    difficulty: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// The unique index is the double-submit guard: a second tap on Submit hits it and gets a 409.
answerAttemptSchema.index({ sessionId: 1, challengeId: 1, stageIndex: 1 }, { unique: true });
answerAttemptSchema.index({ userId: 1, challengeId: 1 });
answerAttemptSchema.index({ userId: 1, topicSlug: 1, createdAt: -1 });

export type AnswerAttempt = InferSchemaType<typeof answerAttemptSchema>;
export const AnswerAttemptModel = model('AnswerAttempt', answerAttemptSchema);
