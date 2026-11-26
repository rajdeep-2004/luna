import type { Types } from 'mongoose';
import type { BonusAward } from '@luna/shared';
import { DUEL } from '../../config/game';
import { localDateKey } from '../../lib/time';
import { DuelModel, type DuelDoc } from '../../models/Duel';
import { awardXP } from '../progress/xp.service';
import { usersRepo } from '../users/users.repository';

type Id = Types.ObjectId | string;

/**
 * The 10 XP win bonus, capped at 3 per local day (scoring.md §3). Claiming `winBonusClaimed`
 * first makes it once per duel, however many times the duel is finalized. The cap uses ledger keys
 * `duelwin:<date>:<1..3>`: the unique index hands out each daily slot once, so two duels settling
 * at the same moment can't pay a fourth. Only a PLAYED duel with a winner pays: a forfeit doesn't,
 * so an idle second account can't farm it. A crash after the claim loses this one bonus; it can
 * never pay twice (same trade-off as D-015).
 */
export async function payWinBonus(duelId: Id): Promise<void> {
  const claimed = await DuelModel.findOneAndUpdate(
    { _id: duelId, winBonusClaimed: false, endReason: 'PLAYED', winnerId: { $ne: null } },
    { $set: { winBonusClaimed: true } },
    { returnDocument: 'after' },
  );
  if (!claimed?.winnerId) return;
  const winnerId = claimed.winnerId.toString();
  const winner = await usersRepo.findById(winnerId);
  const date = localDateKey(new Date(), winner?.timezone ?? 'UTC');
  let paid = 0;
  for (let slot = 1; slot <= DUEL.winBonusesPerDay && paid === 0; slot++) {
    paid = await awardXP(winnerId, `duelwin:${date}:${slot}`, DUEL.winBonusXP);
  }
  await DuelModel.updateOne({ _id: duelId }, { $set: { winBonusXP: paid, winBonusSettled: true } });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * The bonus as final: if a concurrent finalize holds the claim but hasn't written the amount yet,
 * wait briefly for it, so the winner's summary doesn't report 0 for a bonus the ledger paid.
 */
async function settledBonus(duel: DuelDoc): Promise<number> {
  let d: DuelDoc | null = duel;
  for (let i = 0; d && d.winBonusClaimed && !d.winBonusSettled && i < DUEL.bonusWait.tries; i++) {
    await sleep(DUEL.bonusWait.delayMs);
    d = await DuelModel.findById(duel._id);
  }
  return d?.winBonusXP ?? 0;
}

/**
 * The win bonus to show in this player's DUEL session summary. The engine pays the bonus before it
 * completes the sessions, so this only reads it back (and a retry reports the same thing).
 */
export async function duelBonusesFor(userId: string, duelId: Id): Promise<BonusAward[]> {
  const duel = await DuelModel.findById(duelId);
  if (!duel || duel.endReason !== 'PLAYED' || duel.winnerId?.toString() !== userId) return [];
  const xp = await settledBonus(duel);
  return xp > 0 ? [{ kind: 'DUEL_WIN', xp }] : [];
}
