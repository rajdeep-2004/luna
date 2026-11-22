import { Schema, model, type InferSchemaType } from 'mongoose';
import { ACHIEVEMENT_KEYS } from '@luna/shared';

/** One row per earned achievement. The unique index means a badge can never be awarded twice. */
const userAchievementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, enum: ACHIEVEMENT_KEYS, required: true },
    awardedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

userAchievementSchema.index({ userId: 1, key: 1 }, { unique: true });

export type UserAchievement = InferSchemaType<typeof userAchievementSchema>;
export const UserAchievementModel = model('UserAchievement', userAchievementSchema);
