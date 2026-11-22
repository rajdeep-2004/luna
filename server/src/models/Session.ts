import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { SESSION_TYPES, TOPIC_SLUGS } from '@luna/shared';

const itemSchema = new Schema(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    order: { type: Number, required: true },
    isRevisit: { type: Boolean, default: false },
    /** Shuffled option ids per stage (index 0 for single challenges), fixed at creation so a resume shows the same order. */
    optionOrders: { type: [[String]], default: [] },
    /** Stage indexes where the user revealed the hint (halves XP). */
    hintsUsed: { type: [Number], default: [] },
  },
  { _id: false },
);

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: SESSION_TYPES, required: true },
    topicSlug: { type: String, enum: [...TOPIC_SLUGS, null], default: null },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
    startedAt: { type: Date, default: () => new Date() },
    completedAt: { type: Date, default: null },
    items: { type: [itemSchema], required: true },
    /** Number of answers needed to finish: one per single challenge, one per incident stage. */
    totalAnswers: { type: Number, required: true },
    summary: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ userId: 1, type: 1, status: 1 });

export type Session = InferSchemaType<typeof sessionSchema>;
export type SessionDoc = HydratedDocument<Session>;
export const SessionModel = model('Session', sessionSchema);
export { Types };
