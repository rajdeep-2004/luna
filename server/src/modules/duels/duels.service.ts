import { randomInt } from 'node:crypto';
import { Types } from 'mongoose';
import {
  DUEL_CODE_ALPHABET,
  PREGAME_PHASES,
  type DuelFormat,
  type DuelSnapshot,
  type DuelView,
  type Page,
  type PageQuery,
} from '@luna/shared';
import { DUEL } from '../../config/game';
import { shuffle } from '../../lib/random';
import { AppError, conflict, isDuplicateKey, notFound } from '../../lib/errors';
import { DuelModel } from '../../models/Duel';
import { duelDifficulty, pickDuelChallenges } from './duels.selection';
import { toSnapshot, toViews } from './duels.view';
import { cancelByCreator, participantDuel } from './live/room';
import * as runtime from './live/runtime';

/**
 * The REST side of live duels (D-052): create, join, cancel, read. Thin by design; the match itself
 * runs over the socket. No response ever carries an answer key (snapshots reveal only past rounds).
 */

function newCode(): string {
  return Array.from(
    { length: DUEL.codeLength },
    () => DUEL_CODE_ALPHABET[randomInt(DUEL_CODE_ALPHABET.length)],
  ).join('');
}

const oneLobbyMessage = 'You already have an open duel. Start or cancel it first.';

async function snapshot(userId: string, duelId: string): Promise<DuelSnapshot> {
  const { duel } = await participantDuel(userId, duelId);
  return toSnapshot(userId, duel, runtime.now());
}

/**
 * `POST /duels`: a new LOBBY. One open duel (LOBBY or READY) per creator: checked first for a clear
 * message, and enforced for LOBBY by a unique partial index, so two concurrent creates can't both
 * succeed. The code retries on the rare collision.
 */
export async function createDuel(
  userId: string,
  format: DuelFormat = 'CLASSIC',
): Promise<DuelSnapshot> {
  if (await DuelModel.exists({ creatorId: userId, phase: { $in: PREGAME_PHASES } }))
    throw conflict(oneLobbyMessage);
  const challenges = await pickDuelChallenges(await duelDifficulty(userId), format);
  const items = challenges.map((c) => ({
    challengeId: c._id,
    optionOrders: [shuffle(c.options.map((o) => o.id))],
  }));
  const now = runtime.now();
  for (let i = 0; i < DUEL.codeRetries; i++) {
    try {
      const duel = await DuelModel.create({
        code: newCode(),
        creatorId: userId,
        format,
        items,
        phase: 'LOBBY',
        lobbyExpiresAt: new Date(now + runtime.timings().lobbyTtlMs),
        creatorSeat: { connected: false, lastSeenAt: new Date(now), readyAt: null },
      });
      await runtime.tick(duel._id.toString());
      return toSnapshot(userId, duel, now);
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
      const key = (err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {};
      if (!('code' in key)) throw conflict(oneLobbyMessage);
    }
  }
  throw new AppError('INTERNAL', 'Could not create a duel code, please try again');
}

/**
 * `POST /duels/join`. One atomic conditional update: only an unexpired LOBBY with no opponent,
 * created by someone else, can be joined, so two people racing for one code get exactly one
 * winner. The loser is told why; a repeated tap by the joiner returns the same duel.
 */
export async function joinDuel(userId: string, code: string): Promise<DuelSnapshot> {
  const now = new Date(runtime.now());
  const joined = await DuelModel.findOneAndUpdate(
    {
      code,
      phase: 'LOBBY',
      opponentId: null,
      creatorId: { $ne: new Types.ObjectId(userId) },
      lobbyExpiresAt: { $gt: now },
    },
    {
      $set: {
        opponentId: userId,
        phase: 'READY',
        opponentSeat: { connected: false, lastSeenAt: now, readyAt: null },
      },
    },
    { returnDocument: 'after' },
  );
  if (joined) {
    await runtime.pushState(joined);
    await runtime.tick(joined._id.toString());
    return toSnapshot(userId, joined, now.getTime());
  }

  const duel = await DuelModel.findOne({ code });
  if (!duel) throw notFound('Duel');
  if (duel.creatorId.toString() === userId) throw conflict("You can't join your own duel");
  if (duel.opponentId?.toString() === userId) return toSnapshot(userId, duel, now.getTime());
  if (duel.opponentId) throw conflict('This duel is already taken');
  throw conflict('This duel has closed');
}

/** `POST /duels/:id/cancel`: the creator, while LOBBY/READY. Repeats return the cancelled duel. */
export async function cancelDuel(userId: string, duelId: string): Promise<DuelSnapshot> {
  await cancelByCreator(userId, duelId);
  return snapshot(userId, duelId);
}

export const getDuel = snapshot;

/** Keyset cursor `<createdAt ms>.<duelId>`, stable while new duels are created. */
function decodeCursor(cursor: string): { at: Date; id: Types.ObjectId } {
  const [ms, id] = cursor.split('.');
  const at = new Date(Number(ms));
  if (!id || !Types.ObjectId.isValid(id) || Number.isNaN(at.getTime()))
    throw new AppError('VALIDATION_ERROR', 'Invalid cursor');
  return { at, id: new Types.ObjectId(id) };
}

/** `GET /duels`: the caller's duels (live and finished), newest first, cursor-paginated. */
export async function listDuels(userId: string, query: PageQuery): Promise<Page<DuelView>> {
  const limit = query.limit ?? DUEL.historyPageSize;
  const after = query.cursor ? decodeCursor(query.cursor) : null;
  const rows = await DuelModel.find({
    $and: [
      { $or: [{ creatorId: userId }, { opponentId: userId }] },
      after
        ? {
            $or: [
              { createdAt: { $lt: after.at } },
              { createdAt: after.at, _id: { $lt: after.id } },
            ],
          }
        : {},
    ],
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: await toViews(userId, page),
    nextCursor:
      rows.length > limit && last ? `${last.createdAt.getTime()}.${last._id.toString()}` : null,
  };
}
