import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { DUEL_FORMATS, PRACTICE_MODES, SESSION_TYPES, TOPIC_SLUGS } from '@luna/shared';

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
    /** PRACTICE only: the round's mode (one challenge kind, D-039); null for a mixed topic round. */
    mode: { type: String, enum: [...PRACTICE_MODES, null], default: null },
    /** DAILY only: the user's local date (`YYYY-MM-DD`) the Kata belongs to; keys its bonuses. */
    dailyDate: { type: String, default: null },
    /** DUEL only: the duel this session plays. */
    duelId: { type: Schema.Types.ObjectId, ref: 'Duel', default: null },
    /** DUEL only: copied from the duel so every answer can read its timer without a second query. */
    duelFormat: { type: String, enum: [...DUEL_FORMATS, null], default: null },
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
// At most one open practice (per topic and mode) or baseline session per user, so a double tap or
// two concurrent starts can't create two. Completing a session drops it out of this index. `mode`
// joined the key in P7, so a Trace round and a Bug Hunt round in one topic can both be open.
sessionSchema.index(
  { userId: 1, type: 1, topicSlug: 1, mode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'ACTIVE',
      type: { $in: ['PRACTICE', 'BASELINE', 'CHECKPOINT'] },
    },
  },
);
// One Daily Kata per user per local day: two concurrent first opens can't build two (D-028).
sessionSchema.index(
  { userId: 1, dailyDate: 1 },
  { unique: true, partialFilterExpression: { type: 'DAILY' } },
);

// One DUEL session per player per duel: a double tap on "Play" can't start two.
sessionSchema.index(
  { duelId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { type: 'DUEL' } },
);
// Profile history: a user's finished sessions, newest first, keyset-paginated on (completedAt, _id).
sessionSchema.index({ userId: 1, status: 1, completedAt: -1, _id: -1 });

export type Session = InferSchemaType<typeof sessionSchema>;
export type SessionDoc = HydratedDocument<Session>;
export const SessionModel = model('Session', sessionSchema);
export { Types };
