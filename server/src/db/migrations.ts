import { DuelModel } from '../models/Duel';
import { logger } from '../lib/logger';

/**
 * V1 → V2 duels (D-052). Asynchronous duels had a 48 h play window and no `phase`. Live duels
 * can't resume them, so unfinished ones (OPEN/ACTIVE) end as EXPIRED; finished ones keep their
 * result and stay in history. Each step only touches rows without a `phase`, so it is idempotent
 * and cheap to run on every boot (and from `npm run seed`).
 */
export async function migrateV1Duels(): Promise<number> {
  const legacy = { phase: { $exists: false } };
  const now = new Date();
  const steps = [
    await DuelModel.updateMany(
      { ...legacy, status: { $in: ['OPEN', 'ACTIVE'] } },
      {
        $set: {
          status: 'EXPIRED',
          endReason: 'EXPIRED',
          phase: 'CANCELLED',
          endedAt: now,
          finalizedAt: now,
        },
      },
    ),
    await DuelModel.updateMany(
      { ...legacy, status: 'EXPIRED' },
      { $set: { phase: 'CANCELLED', finalizedAt: now } },
    ),
    await DuelModel.updateMany(
      { ...legacy, status: 'COMPLETED' },
      { $set: { phase: 'COMPLETED', finalizedAt: now } },
    ),
  ];
  const changed = steps.reduce((n, s) => n + s.modifiedCount, 0);
  if (changed) logger.info({ changed }, 'migrated V1 duels');
  return changed;
}
