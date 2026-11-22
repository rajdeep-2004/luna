import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { AVATAR_IDS, EXPERIENCE_LEVELS, TOPIC_SLUGS } from '@luna/shared';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, trim: true },
    /** Uniqueness is case-insensitive: "Rajdeep" and "rajdeep" are the same name. */
    usernameLower: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    avatarId: { type: String, enum: AVATAR_IDS, default: 'usagi' },
    preferredTopicSlugs: { type: [String], enum: TOPIC_SLUGS, default: [] },
    experienceLevel: { type: String, enum: [...EXPERIENCE_LEVELS, null], default: null },
    timezone: { type: String, default: 'UTC' },
    onboardedAt: { type: Date, default: null },
    totalXP: { type: Number, default: 0, min: 0 },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    /** Local calendar date (YYYY-MM-DD, user's timezone) of the last completed Daily Kata. */
    lastDailyDate: { type: String, default: null },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<User>;
export const UserModel = model('User', userSchema);
