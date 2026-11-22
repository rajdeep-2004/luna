import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { DUEL_FORMATS } from '@luna/shared';

/** One finished player's score, written once when their DUEL session completes. */
const resultSchema = new Schema(
  {
    correct: { type: Number, required: true },
    totalTimeMs: { type: Number, required: true },
    finishedAt: { type: Date, required: true },
  },
  { _id: false },
);

const itemSchema = new Schema(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    /** Fixed at creation so both players see the same option order (competition.md §2). */
    optionOrders: { type: [[String]], default: [] },
  },
  { _id: false },
);

/**
 * An asynchronous friend duel. Status moves OPEN (no opponent) → ACTIVE (joined) → COMPLETED or
 * EXPIRED. Every transition is a conditional update on the current status, so it happens once.
 * Expiry is checked on read (no background job, architecture §12).
 */
const duelSchema = new Schema(
  {
    code: { type: String, required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    opponentId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    /** Duels made before P7 have no field and read as CLASSIC. */
    format: { type: String, enum: DUEL_FORMATS, default: 'CLASSIC' },
    items: { type: [itemSchema], required: true },
    status: {
      type: String,
      enum: ['OPEN', 'ACTIVE', 'COMPLETED', 'EXPIRED'],
      default: 'OPEN',
    },
    creatorResult: { type: resultSchema, default: null },
    opponentResult: { type: resultSchema, default: null },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    endReason: { type: String, enum: ['PLAYED', 'FORFEIT', 'EXPIRED', null], default: null },
    /** Claimed with a false→true update before paying, so the win bonus is paid at most once. */
    winBonusClaimed: { type: Boolean, default: false },
    winBonusXP: { type: Number, default: 0 },
    /** Set once the claimed bonus is paid or found capped, so a concurrent reader knows it's final. */
    winBonusSettled: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

duelSchema.index({ code: 1 }, { unique: true });
duelSchema.index({ creatorId: 1, createdAt: -1 });
duelSchema.index({ opponentId: 1, createdAt: -1 });

export type Duel = InferSchemaType<typeof duelSchema>;
export type DuelDoc = HydratedDocument<Duel>;
export const DuelModel = model('Duel', duelSchema);
