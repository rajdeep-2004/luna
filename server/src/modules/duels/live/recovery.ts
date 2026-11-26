import { PLAYING_PHASES, PREGAME_PHASES } from '@luna/shared';
import { DuelModel } from '../../../models/Duel';
import { logger } from '../../../lib/logger';
import { finalizeDuel } from './progress';
import * as runtime from './runtime';

/**
 * Boot recovery (D-052). Duel state lives in Mongo, so after a restart every unfinished duel is
 * reloaded and ticked: the engine re-arms its timer from the stored `deadlineAt` / `phaseEndsAt`,
 * or advances it at once (as a timeout) when the deadline passed while the server was down.
 * No socket survives a restart, so every seat starts offline with a fresh grace period to
 * reconnect; a duel nobody returns to is then abandoned (or cancelled, for lobbies) by the
 * normal rules. Ended duels that were never finalized (crash mid-way) are finalized again.
 */
export async function recoverLiveDuels(): Promise<{ resumed: number; finalized: number }> {
  const open = { phase: { $in: [...PREGAME_PHASES, ...PLAYING_PHASES] } };
  const at = new Date(runtime.now());
  await DuelModel.updateMany(open, {
    $set: { 'creatorSeat.connected': false, 'creatorSeat.lastSeenAt': at },
  });
  await DuelModel.updateMany(
    { ...open, opponentSeat: { $ne: null } },
    { $set: { 'opponentSeat.connected': false, 'opponentSeat.lastSeenAt': at } },
  );

  let resumed = 0;
  for await (const d of DuelModel.find(open).select('_id').lean().cursor()) {
    await runtime.tick(d._id.toString());
    resumed++;
  }
  let finalized = 0;
  const pending = DuelModel.find({ finalizedAt: null, phase: { $in: ['COMPLETED', 'ABANDONED'] } })
    .select('_id')
    .lean()
    .cursor();
  for await (const d of pending) {
    await finalizeDuel(d._id.toString(), runtime.now());
    finalized++;
  }
  logger.info({ resumed, finalized }, 'live duels recovered');
  return { resumed, finalized };
}
