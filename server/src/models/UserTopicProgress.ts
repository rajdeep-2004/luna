import { Schema, model, type InferSchemaType } from 'mongoose';
import { TOPIC_SLUGS } from '@luna/shared';

const userTopicProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    topicSlug: { type: String, enum: TOPIC_SLUGS, required: true },
    answers: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    /** Rolling window of the last 10 results, newest last. Drives moon-phase mastery. */
    recentResults: { type: [Boolean], default: [] },
    /** Results since the last difficulty change, newest last, at most ADAPTIVE.window (§4). */
    adaptWindow: { type: [Boolean], default: [] },
    difficultyLevel: { type: Number, enum: [1, 2, 3], default: 1 },
    hasAdvancedCorrect: { type: Boolean, default: false },
    lastPractisedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userTopicProgressSchema.index({ userId: 1, topicSlug: 1 }, { unique: true });

export type UserTopicProgress = InferSchemaType<typeof userTopicProgressSchema>;
export const UserTopicProgressModel = model('UserTopicProgress', userTopicProgressSchema);
