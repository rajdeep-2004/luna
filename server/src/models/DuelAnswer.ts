import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * One player's answer to one live duel question (D-052). The unique `(duelId, userId, index)`
 * index is the idempotency guard: a repeated submit, or a timeout filled in at the deadline,
 * can never create a second row; the loser of that race reads the stored one.
 */
const duelAnswerSchema = new Schema(
  {
    duelId: { type: Schema.Types.ObjectId, ref: 'Duel', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    index: { type: Number, required: true },
    /** An option id or a Bug Hunt line number; null when the time ran out. */
    answer: { type: String, default: null },
    isCorrect: { type: Boolean, required: true },
    timedOut: { type: Boolean, default: false },
    /** Measured on the server from `questionStartedAt`, clamped to the question timer. */
    responseMs: { type: Number, required: true },
    receivedAt: { type: Date, required: true },
  },
  { timestamps: false },
);

duelAnswerSchema.index({ duelId: 1, userId: 1, index: 1 }, { unique: true });
duelAnswerSchema.index({ duelId: 1, index: 1 });

export type DuelAnswer = InferSchemaType<typeof duelAnswerSchema>;
export const DuelAnswerModel = model('DuelAnswer', duelAnswerSchema);
