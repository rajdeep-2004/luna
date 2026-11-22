import { Schema, model, type InferSchemaType } from 'mongoose';
import { TOPIC_SLUGS } from '@luna/shared';

/**
 * The revisit queue (progression.md §5): one row per missed single challenge. A correct answer
 * deletes the row; a wrong one refreshes it.
 */
const revisitItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    topicSlug: { type: String, enum: TOPIC_SLUGS, required: true },
    missedAt: { type: Date, required: true },
    /** User's local date of the miss; the Daily Kata never serves a same-day miss. */
    missedDate: { type: String, required: true },
    /** Set when a revisit was missed again: not served before this local date. */
    notBeforeDate: { type: String, default: null },
  },
  { timestamps: false },
);

revisitItemSchema.index({ userId: 1, challengeId: 1 }, { unique: true });
revisitItemSchema.index({ userId: 1, missedAt: 1 });

export type RevisitItem = InferSchemaType<typeof revisitItemSchema>;
export const RevisitItemModel = model('RevisitItem', revisitItemSchema);
