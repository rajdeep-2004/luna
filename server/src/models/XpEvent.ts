import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * The XP ledger (D-010). Every award has a sourceKey such as `challenge:<id>` or
 * `challenge:<id>:<stage>`; the unique index makes "first correct only" a database guarantee.
 */
const xpEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sourceKey: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    weekKey: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

xpEventSchema.index({ userId: 1, sourceKey: 1 }, { unique: true });
xpEventSchema.index({ weekKey: 1, userId: 1 });

export type XpEvent = InferSchemaType<typeof xpEventSchema>;
export const XpEventModel = model('XpEvent', xpEventSchema);
