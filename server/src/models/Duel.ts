import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { DUEL_FORMATS, DUEL_PHASES } from '@luna/shared';

/** One player's final score, written once when the duel ends. */
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

/** A player's live presence. Only the socket layer writes it. */
const seatSchema = new Schema(
  {
    connected: { type: Boolean, default: false },
    /** Last connect or disconnect; the reconnect and lobby grace periods count from here. */
    lastSeenAt: { type: Date, default: () => new Date() },
    readyAt: { type: Date, default: null },
  },
  { _id: false },
);

/**
 * A live duel (D-052). `phase` is the server-authoritative state machine (shared/liveDuel.ts);
 * every transition is a conditional update on `(phase, currentIndex)`, so a deadline timer and an
 * answer racing each other move it once. Answers live in `duelanswers`.
 *
 * V1 asynchronous duels kept `status` and `expiresAt`; the boot migration gave every V1 row a phase
 * (D-052), so new code reads `phase` only.
 */
const duelSchema = new Schema(
  {
    code: { type: String, required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    opponentId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    format: { type: String, enum: DUEL_FORMATS, default: 'CLASSIC' },
    items: { type: [itemSchema], required: true },
    phase: { type: String, enum: DUEL_PHASES, required: true },
    currentIndex: { type: Number, default: 0 },
    questionStartedAt: { type: Date, default: null },
    deadlineAt: { type: Date, default: null },
    /** End of COUNTDOWN or REVEAL. */
    phaseEndsAt: { type: Date, default: null },
    lobbyExpiresAt: { type: Date, default: null },
    creatorSeat: { type: seatSchema, default: () => ({}) },
    opponentSeat: { type: seatSchema, default: null },
    creatorResult: { type: resultSchema, default: null },
    opponentResult: { type: resultSchema, default: null },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    endReason: {
      type: String,
      enum: ['PLAYED', 'FORFEIT', 'EXPIRED', 'CANCELLED', 'ABANDONED', null],
      default: null,
    },
    endedAt: { type: Date, default: null },
    /** Set once the win bonus is settled and both DUEL sessions are completed. */
    finalizedAt: { type: Date, default: null },
    /** Claimed with a false→true update before paying, so the win bonus is paid at most once. */
    winBonusClaimed: { type: Boolean, default: false },
    winBonusXP: { type: Number, default: 0 },
    /** Set once the claimed bonus is paid or found capped, so a concurrent reader knows it's final. */
    winBonusSettled: { type: Boolean, default: false },
    /** V1 only (no default): OPEN/ACTIVE/COMPLETED/EXPIRED and the 48 h play window. */
    status: { type: String, enum: ['OPEN', 'ACTIVE', 'COMPLETED', 'EXPIRED'] },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

duelSchema.index({ code: 1 }, { unique: true });
duelSchema.index({ creatorId: 1, createdAt: -1 });
duelSchema.index({ opponentId: 1, createdAt: -1 });
// "My open lobby" and the one-lobby rule: two concurrent creates can't both insert a LOBBY.
duelSchema.index({ creatorId: 1, phase: 1 });
duelSchema.index(
  { creatorId: 1 },
  { unique: true, partialFilterExpression: { phase: 'LOBBY' }, name: 'one_open_lobby' },
);
// Boot recovery: in-flight duels by phase, and due deadlines.
duelSchema.index({ phase: 1, deadlineAt: 1 });
// Boot recovery: ended duels whose bonus/sessions were not finalized (crash between steps).
duelSchema.index({ finalizedAt: 1, phase: 1 });

export type Duel = InferSchemaType<typeof duelSchema>;
export type DuelDoc = HydratedDocument<Duel>;
export const DuelModel = model('Duel', duelSchema);
