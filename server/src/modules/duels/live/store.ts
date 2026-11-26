import type { Types } from 'mongoose';
import { PLAYING_PHASES, PREGAME_PHASES, type DuelFormat, type DuelPhase } from '@luna/shared';
import { DuelModel, type DuelDoc } from '../../../models/Duel';
import { DuelAnswerModel } from '../../../models/DuelAnswer';
import { isDuplicateKey } from '../../../lib/errors';
import { pickWinner, scoreOf, type EngineDuel, type Seat, type Timings } from './engine';

/**
 * Every live duel write (D-052). Each transition is one conditional update: the filter names the
 * state the move was decided from (`phase`, `currentIndex`, seat presence), so when a deadline
 * timer and an answer race, only one matches and the other is a no-op. Returns whether it moved.
 */

type Id = Types.ObjectId | string;
const moved = (r: { modifiedCount: number }) => r.modifiedCount === 1;
const seatField = (seat: Seat) => (seat === 'creator' ? 'creatorSeat' : 'opponentSeat');
const other = (seat: Seat): Seat => (seat === 'creator' ? 'opponent' : 'creator');

export function seatOf(duel: DuelDoc, userId: string): Seat | null {
  if (duel.creatorId.toString() === userId) return 'creator';
  if (duel.opponentId?.toString() === userId) return 'opponent';
  return null;
}

export function toEngine(d: DuelDoc): EngineDuel {
  const seat = (s: DuelDoc['creatorSeat'] | null | undefined) =>
    s ? { connected: s.connected, lastSeenAt: s.lastSeenAt, readyAt: s.readyAt ?? null } : null;
  return {
    phase: d.phase as DuelPhase,
    format: (d.format ?? 'CLASSIC') as DuelFormat,
    total: d.items.length,
    currentIndex: d.currentIndex,
    deadlineAt: d.deadlineAt ?? null,
    phaseEndsAt: d.phaseEndsAt ?? null,
    lobbyExpiresAt: d.lobbyExpiresAt ?? null,
    creatorSeat: seat(d.creatorSeat)!,
    opponentSeat: d.opponentId ? seat(d.opponentSeat) : null,
  };
}

export const countAnswered = (duelId: Id, index: number) =>
  DuelAnswerModel.countDocuments({ duelId, index });

// ---- presence ----

/** Seat online/offline. Only while the duel is not over. */
export async function markSeat(duelId: Id, seat: Seat, connected: boolean, at: Date) {
  const f = seatField(seat);
  return DuelModel.updateOne(
    { _id: duelId, [f]: { $ne: null }, phase: { $in: [...PREGAME_PHASES, ...PLAYING_PHASES] } },
    { $set: { [`${f}.connected`]: connected, [`${f}.lastSeenAt`]: at } },
  );
}

export async function markReady(duelId: Id, seat: Seat, at: Date) {
  const f = seatField(seat);
  return DuelModel.updateOne(
    { _id: duelId, [f]: { $ne: null }, [`${f}.readyAt`]: null, phase: { $in: PREGAME_PHASES } },
    { $set: { [`${f}.readyAt`]: at } },
  );
}

// ---- pre-game ----

export async function startCountdown(d: DuelDoc, now: number, t: Timings) {
  const r = await DuelModel.updateOne(
    {
      _id: d._id,
      phase: 'READY',
      'creatorSeat.readyAt': { $ne: null },
      'opponentSeat.readyAt': { $ne: null },
    },
    {
      $set: {
        phase: 'COUNTDOWN',
        phaseEndsAt: new Date(now + t.countdownMs),
        lobbyExpiresAt: null,
      },
    },
  );
  return moved(r);
}

const ended = (phase: DuelPhase, endReason: string, now: number) => ({
  phase,
  endReason,
  endedAt: new Date(now),
  deadlineAt: null,
  phaseEndsAt: null,
  lobbyExpiresAt: null,
});

/** LOBBY/READY → CANCELLED. `guard` holds the reason's own condition (expiry, absence, caller). */
export async function cancel(duelId: Id, guard: Record<string, unknown>, now: number) {
  const r = await DuelModel.updateOne(
    { _id: duelId, phase: { $in: PREGAME_PHASES }, ...guard },
    { $set: { ...ended('CANCELLED', 'CANCELLED', now), finalizedAt: new Date(now) } },
  );
  return moved(r);
}

export const lobbyExpiredGuard = (now: number) => ({ lobbyExpiresAt: { $lte: new Date(now) } });
export const goneGuard = (seat: Seat, graceMs: number, now: number) => ({
  [`${seatField(seat)}.connected`]: false,
  [`${seatField(seat)}.lastSeenAt`]: { $lte: new Date(now - graceMs) },
});

/**
 * READY → LOBBY when the joiner leaves or never shows up, so the code works for someone else. If
 * the creator has opened another lobby meanwhile (one open lobby per user), cancel this one.
 */
export async function reopen(duelId: Id, guard: Record<string, unknown>, now: number) {
  try {
    const r = await DuelModel.updateOne(
      { _id: duelId, phase: 'READY', ...guard },
      {
        $set: { phase: 'LOBBY', opponentId: null, opponentSeat: null, 'creatorSeat.readyAt': null },
      },
    );
    return moved(r);
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    return cancel(duelId, { phase: 'READY', ...guard }, now);
  }
}

// ---- in play ----

export async function startQuestion(
  d: DuelDoc,
  from: 'COUNTDOWN' | 'REVEAL',
  index: number,
  now: number,
  t: Timings,
) {
  const timer = t.questionMs[(d.format ?? 'CLASSIC') as DuelFormat];
  const r = await DuelModel.updateOne(
    { _id: d._id, phase: from, currentIndex: from === 'COUNTDOWN' ? 0 : index - 1 },
    {
      $set: {
        phase: 'QUESTION',
        currentIndex: index,
        questionStartedAt: new Date(now),
        deadlineAt: new Date(now + timer),
        phaseEndsAt: null,
      },
    },
  );
  return moved(r);
}

export async function reveal(d: DuelDoc, index: number, now: number, t: Timings) {
  const r = await DuelModel.updateOne(
    { _id: d._id, phase: 'QUESTION', currentIndex: index },
    { $set: { phase: 'REVEAL', phaseEndsAt: new Date(now + t.revealMs) } },
  );
  return moved(r);
}

/**
 * Writes a timeout for every player without an answer at `index`. An upsert that only inserts, so
 * an answer that landed first is kept, and a concurrent real insert loses to (or beats) it cleanly
 * on the unique index.
 */
export async function fillTimeouts(d: DuelDoc, index: number, now: number, timerMs: number) {
  const players = [d.creatorId, d.opponentId].filter(Boolean);
  await Promise.all(
    players.map(async (userId) => {
      try {
        await DuelAnswerModel.updateOne(
          { duelId: d._id, userId, index },
          {
            $setOnInsert: {
              answer: null,
              isCorrect: false,
              timedOut: true,
              responseMs: timerMs,
              receivedAt: new Date(now),
            },
          },
          { upsert: true },
        );
      } catch (err) {
        if (!isDuplicateKey(err)) throw err;
      }
    }),
  );
}

/** Final scores from every stored answer, and the winner by the live rules. */
export async function finalScores(d: DuelDoc) {
  const rows = await DuelAnswerModel.find({ duelId: d._id }).lean();
  const answers = rows.map((a) => ({ ...a, userId: a.userId.toString() }));
  const c = scoreOf(d.creatorId.toString(), answers);
  const o = scoreOf(d.opponentId?.toString() ?? '', answers);
  return { c, o, winner: pickWinner(c, o) };
}

const resultOf = (s: { correct: number; totalResponseMs: number }, now: number) => ({
  correct: s.correct,
  totalTimeMs: s.totalResponseMs,
  finishedAt: new Date(now),
});

/** REVEAL (last or decided) → COMPLETED, PLAYED. */
export async function complete(d: DuelDoc, index: number, now: number) {
  const { c, o, winner } = await finalScores(d);
  const r = await DuelModel.updateOne(
    { _id: d._id, phase: 'REVEAL', currentIndex: index },
    {
      $set: {
        ...ended('COMPLETED', 'PLAYED', now),
        winnerId: winner,
        creatorResult: resultOf(c, now),
        opponentResult: resultOf(o, now),
      },
    },
  );
  return moved(r);
}

/** In play → COMPLETED by FORFEIT: only if the loser is still gone and the winner still here. */
export async function forfeit(d: DuelDoc, loser: Seat, now: number, t: Timings) {
  const { c, o } = await finalScores(d);
  const winnerId = loser === 'creator' ? d.opponentId : d.creatorId;
  const r = await DuelModel.updateOne(
    {
      _id: d._id,
      phase: { $in: PLAYING_PHASES },
      ...goneGuard(loser, t.reconnectGraceMs, now),
      [`${seatField(other(loser))}.connected`]: true,
    },
    {
      $set: {
        ...ended('COMPLETED', 'FORFEIT', now),
        winnerId,
        creatorResult: resultOf(c, now),
        opponentResult: resultOf(o, now),
      },
    },
  );
  return moved(r);
}

/** In play → ABANDONED when both players are past the grace. No winner, no bonus. */
export async function abandon(d: DuelDoc, now: number, t: Timings) {
  const r = await DuelModel.updateOne(
    {
      _id: d._id,
      phase: { $in: PLAYING_PHASES },
      ...goneGuard('creator', t.reconnectGraceMs, now),
      ...goneGuard('opponent', t.reconnectGraceMs, now),
    },
    { $set: ended('ABANDONED', 'ABANDONED', now) },
  );
  return moved(r);
}

export async function markFinalized(duelId: Id, now: number) {
  await DuelModel.updateOne(
    { _id: duelId, finalizedAt: null },
    { $set: { finalizedAt: new Date(now) } },
  );
}
