import type { Types } from 'mongoose';
import type { BonusAward, DuelStatus, SessionSummary } from '@luna/shared';
import { DUEL } from '../../config/game';
import { conflict, notFound } from '../../lib/errors';
import { localDateKey } from '../../lib/time';
import { DuelModel, type DuelDoc } from '../../models/Duel';
import { awardXP } from '../progress/xp.service';
import { usersRepo } from '../users/users.repository';

type Result = { correct: number; totalTimeMs: number };
type Id = Types.ObjectId | string;

const sameId = (a: Id | null | undefined, b: Id | null | undefined) =>
  a != null && b != null && a.toString() === b.toString();

/**
 * scoring.md §6: more correct wins; equal → lower total time; same to the second → draw.
 * Returns 1 if `a` wins, -1 if `b` wins, 0 for a draw. Pure.
 */
export function compareResults(a: Result, b: Result): 1 | -1 | 0 {
  if (a.correct !== b.correct) return a.correct > b.correct ? 1 : -1;
  const sa = Math.floor(a.totalTimeMs / 1000);
  const sb = Math.floor(b.totalTimeMs / 1000);
  if (sa !== sb) return sa < sb ? 1 : -1;
  return 0;
}

/**
 * The 10 XP win bonus, capped at 3 per local day (scoring.md §3). Claiming `winBonusClaimed`
 * first makes it once per duel. The cap uses ledger keys `duelwin:<date>:<1..3>`: the unique index
 * hands out each daily slot once, so two duels settling at the same moment can't pay a fourth.
 * A crash after the claim loses this one bonus; it can never pay twice (same trade-off as D-015).
 */
async function payWinBonus(duel: DuelDoc): Promise<void> {
  const claimed = await DuelModel.findOneAndUpdate(
    { _id: duel._id, winBonusClaimed: false, endReason: 'PLAYED', winnerId: { $ne: null } },
    { $set: { winBonusClaimed: true } },
    { returnDocument: 'after' },
  );
  if (!claimed?.winnerId) return;
  const winnerId = claimed.winnerId.toString();
  const winner = await usersRepo.findById(winnerId);
  const date = localDateKey(new Date(), winner?.timezone ?? 'UTC');
  for (let slot = 1; slot <= DUEL.winBonusesPerDay; slot++) {
    const paid = await awardXP(winnerId, `duelwin:${date}:${slot}`, DUEL.winBonusXP);
    if (paid > 0) {
      await DuelModel.updateOne({ _id: duel._id }, { $set: { winBonusXP: paid } });
      return;
    }
  }
}

/** Conditional transition out of `from`: only the first caller moves it. */
function finish(duel: DuelDoc, from: DuelStatus[], set: Record<string, unknown>) {
  return DuelModel.updateOne({ _id: duel._id, status: { $in: from } }, { $set: set });
}

/**
 * Brings a duel up to date: settles it when both have played, and applies the 48 h expiry
 * (competition.md §2). Expiry is checked on read, so every path that reads a duel calls this.
 * At expiry a player who finished beats one who didn't (a forfeit, no win bonus, so an idle alt
 * account can't farm it); if nobody finished, or nobody joined, the duel just expires.
 */
export async function settleDuel(duel: DuelDoc): Promise<DuelDoc> {
  if (duel.status === 'COMPLETED' || duel.status === 'EXPIRED') return duel;
  const c = duel.creatorResult;
  const o = duel.opponentResult;
  if (duel.status === 'ACTIVE' && c && o) {
    const cmp = compareResults(c, o);
    const winnerId = cmp === 0 ? null : cmp > 0 ? duel.creatorId : duel.opponentId;
    await finish(duel, ['ACTIVE'], { status: 'COMPLETED', endReason: 'PLAYED', winnerId });
  } else if (duel.expiresAt.getTime() <= Date.now()) {
    const finisher = c ? duel.creatorId : o ? duel.opponentId : null;
    if (duel.status === 'ACTIVE' && finisher) {
      await finish(duel, ['ACTIVE'], {
        status: 'COMPLETED',
        endReason: 'FORFEIT',
        winnerId: finisher,
      });
    } else {
      await finish(duel, ['OPEN', 'ACTIVE'], { status: 'EXPIRED', endReason: 'EXPIRED' });
    }
  } else {
    return duel;
  }
  const fresh = (await DuelModel.findById(duel._id))!;
  if (fresh.endReason === 'PLAYED') await payWinBonus(fresh);
  return (await DuelModel.findById(duel._id))!;
}

/** Answers are refused once a duel has ended (expired, or settled while this player idled). */
export async function assertDuelPlayable(duelId: Id | null | undefined): Promise<void> {
  const duel = duelId ? await DuelModel.findById(duelId) : null;
  if (!duel) throw notFound('Duel');
  const now = await settleDuel(duel);
  if (now.status === 'COMPLETED' || now.status === 'EXPIRED') throw conflict('This duel has ended');
}

/**
 * Called while a DUEL session completes (before its status flip, so it must be idempotent):
 * writes this player's score once, then settles the duel. Returns the win bonus to show in this
 * player's summary, read back from the duel so a retry reports the same thing.
 */
export async function recordDuelResult(
  userId: string,
  duelId: Id,
  summary: Pick<SessionSummary, 'correctAnswers' | 'totalTimeMs'>,
): Promise<BonusAward[]> {
  const result = {
    correct: summary.correctAnswers,
    totalTimeMs: summary.totalTimeMs,
    finishedAt: new Date(),
  };
  const live = { $in: ['OPEN', 'ACTIVE'] as DuelStatus[] };
  await DuelModel.updateOne(
    { _id: duelId, creatorId: userId, creatorResult: null, status: live },
    { $set: { creatorResult: result } },
  );
  await DuelModel.updateOne(
    { _id: duelId, opponentId: userId, opponentResult: null, status: live },
    { $set: { opponentResult: result } },
  );
  const duel = await DuelModel.findById(duelId);
  if (!duel) return [];
  const settled = await settleDuel(duel);
  return sameId(settled.winnerId, userId) && settled.winBonusXP > 0
    ? [{ kind: 'DUEL_WIN', xp: settled.winBonusXP }]
    : [];
}
