import { DUEL_EVENTS, PLAYING_PHASES, PREGAME_PHASES, type DuelPhase } from '@luna/shared';
import { AppError, notFound } from '../../../lib/errors';
import { DuelModel, type DuelDoc } from '../../../models/Duel';
import { logger } from '../../../lib/logger';
import * as runtime from './runtime';
import * as store from './store';
import type { Seat } from './engine';

/**
 * What the socket events mean for a duel, without any socket types (D-052): joining the room,
 * presence, ready and leave. The socket layer handles transport, auth and rate limits.
 */

const isIn = (phase: string, list: readonly DuelPhase[]) => list.includes(phase as DuelPhase);

/** Participants only; anyone else gets the same 404 as an unknown id. */
export async function participantDuel(
  userId: string,
  duelId: string,
): Promise<{ duel: DuelDoc; seat: Seat }> {
  const duel = await DuelModel.findById(duelId);
  const seat = duel ? store.seatOf(duel, userId) : null;
  if (!duel || !seat) throw notFound('Duel');
  return { duel, seat };
}

/**
 * Seat online/offline. A disconnect passes the time it happened: if a reconnect has already been
 * written (a newer `lastSeenAt`), the late offline write is skipped instead of overwriting it.
 */
export async function setPresence(
  duelId: string,
  userId: string,
  seat: Seat,
  connected: boolean,
  at?: Date,
) {
  const when = at ?? new Date(runtime.now());
  const r = await store.markSeat(duelId, seat, connected, when, at ? { ifNotAfter: at } : {});
  if (at && r.modifiedCount === 0) return;
  runtime.hubEmit(duelId, DUEL_EVENTS.presence, { duelId, userId, connected });
  logger.info({ duelId, userId, connected }, 'duel presence');
  await runtime.tick(duelId);
}

export async function setReady(userId: string, duelId: string): Promise<void> {
  const { duel, seat } = await participantDuel(userId, duelId);
  if (!isIn(duel.phase, PREGAME_PHASES)) return; // Already started: nothing to do.
  if (await store.markReady(duelId, seat, new Date(runtime.now()))) {
    // A ready change is not a phase change: push it so the rival sees "ready".
    const fresh = await DuelModel.findById(duelId);
    if (fresh) await runtime.pushState(fresh);
  }
  await runtime.tick(duelId);
}

/**
 * Leaving on purpose. Before the start: the creator cancels the duel; a joiner frees the seat.
 * During a match: the same as losing the connection with no grace left, so the engine applies the
 * normal rule (forfeit, or abandoned if the rival is gone too).
 */
export async function leave(userId: string, duelId: string): Promise<void> {
  const { duel, seat } = await participantDuel(userId, duelId);
  const n = runtime.now();
  if (isIn(duel.phase, PREGAME_PHASES)) {
    const moved =
      seat === 'creator'
        ? await store.cancel(duel._id, { creatorId: duel.creatorId }, n)
        : await store.reopen(duel._id, { opponentId: duel.opponentId }, n);
    const fresh = await DuelModel.findById(duelId);
    if (moved && fresh) await runtime.pushState(fresh);
    await runtime.tick(duelId);
    return;
  }
  if (!isIn(duel.phase, PLAYING_PHASES)) return;
  const graceUsedUp = new Date(n - runtime.timings().reconnectGraceMs);
  await store.markSeat(duelId, seat, false, graceUsedUp);
  runtime.hubEmit(duelId, DUEL_EVENTS.presence, { duelId, userId, connected: false });
  await runtime.tick(duelId);
}

/** REST `POST /duels/:id/cancel`: the creator, before the match starts. */
export async function cancelByCreator(userId: string, duelId: string): Promise<void> {
  const { duel, seat } = await participantDuel(userId, duelId);
  if (seat !== 'creator') throw new AppError('FORBIDDEN', 'Only the creator can cancel a duel');
  if (duel.phase === 'CANCELLED') return;
  if (!isIn(duel.phase, PREGAME_PHASES))
    throw new AppError('CONFLICT', 'This duel has already started');
  const moved = await store.cancel(duel._id, { creatorId: duel.creatorId }, runtime.now());
  if (!moved) {
    const fresh = await DuelModel.findById(duelId);
    if (fresh?.phase !== 'CANCELLED')
      throw new AppError('CONFLICT', 'This duel has already started');
  }
  const fresh = await DuelModel.findById(duelId);
  if (fresh) await runtime.pushState(fresh);
  await runtime.tick(duelId);
}
