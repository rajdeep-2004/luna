import {
  DUEL_EVENTS,
  type DuelEndedEvent,
  type DuelFormat,
  type DuelPhase,
  type DuelQuestionEvent,
} from '@luna/shared';
import { logger } from '../../../lib/logger';
import { DuelModel, type DuelDoc } from '../../../models/Duel';
import { toPublicChallenge } from '../../challenges/challenges.projection';
import { answersOf, roundReveal, toSnapshot, toViews } from '../duels.view';
import {
  afterReveal,
  decide,
  DEFAULT_TIMINGS,
  nextWakeAt,
  type Action,
  type Timings,
} from './engine';
import { duelChallenges, ensureSessions, finalizeDuel, syncAttempt } from './progress';
import * as scheduler from './scheduler';
import * as store from './store';

/**
 * Drives live duels (D-052): `tick` reads the duel, asks the pure engine what is due, applies it
 * through the store's conditional updates, runs that step's side effects (sessions, timeouts,
 * events) only if this call made the move, and arms the next timer. Every path (timers, answers,
 * presence, REST, boot recovery) goes through `tick`, so there is one place where state moves.
 */

/** Where events go. The socket layer implements it; tests and REST-only runs have none. */
export interface DuelHub {
  toDuel(duelId: string, event: string, payload: unknown): void;
  toUser(duelId: string, userId: string, event: string, payload: unknown): void;
}

type Runtime = { hub: DuelHub | null; timings: Timings; now: () => number; started: boolean };
const rt: Runtime = { hub: null, timings: DEFAULT_TIMINGS, now: () => Date.now(), started: false };

/** A safety bound on how many transitions one tick may chain (recovery can chain a few). */
const MAX_STEPS = 8;
/** After a lost race the duel is re-checked this soon, never in a tight loop. */
const RETRY_MS = 250;

export function startRuntime(opts: { hub: DuelHub; timings?: Partial<Timings> }): void {
  rt.hub = opts.hub;
  rt.timings = { ...DEFAULT_TIMINGS, ...opts.timings };
  rt.started = true;
}

export function stopRuntime(): void {
  scheduler.disarmAll();
  rt.hub = null;
  rt.started = false;
  rt.timings = DEFAULT_TIMINGS;
}

export const timings = () => rt.timings;
export const now = () => rt.now();

const players = (d: DuelDoc) => [d.creatorId, d.opponentId].filter(Boolean).map(String);

/** Sends each player their own snapshot. */
export async function pushState(d: DuelDoc): Promise<void> {
  if (!rt.hub) return;
  for (const userId of players(d)) {
    rt.hub.toUser(d._id.toString(), userId, DUEL_EVENTS.state, await toSnapshot(userId, d, now()));
  }
}

function emit(d: DuelDoc, event: string, payload: unknown) {
  rt.hub?.toDuel(d._id.toString(), event, payload);
}

/** An event to everyone in the duel's room (presence changes). */
export function hubEmit(duelId: string, event: string, payload: unknown) {
  rt.hub?.toDuel(duelId, event, payload);
}

async function emitQuestion(duelId: string) {
  const d = await DuelModel.findById(duelId);
  if (!d || d.phase !== 'QUESTION') return;
  const c = (await duelChallenges(d))[d.currentIndex];
  if (!c) return;
  const payload: DuelQuestionEvent = {
    duelId,
    index: d.currentIndex,
    total: d.items.length,
    question: toPublicChallenge(
      c,
      (d.items[d.currentIndex]?.optionOrders ?? []) as unknown as string[][],
    ),
    questionStartedAt: d.questionStartedAt!.toISOString(),
    deadlineAt: d.deadlineAt!.toISOString(),
    serverNow: new Date(now()).toISOString(),
  };
  emit(d, DUEL_EVENTS.question, payload);
}

/** After REVEAL wins: timeouts for anyone silent, attempts for both answers, then the reveal event. */
async function onRevealed(d: DuelDoc, index: number) {
  const c = (await duelChallenges(d))[index];
  const timerMs = rt.timings.questionMs[(d.format ?? 'CLASSIC') as DuelFormat];
  await store.fillTimeouts(d, index, now(), timerMs);
  const answers = await answersOf(d);
  if (!c) return;
  for (const a of answers.filter((x) => x.index === index)) await syncAttempt(d, c, a);
  emit(d, DUEL_EVENTS.reveal, { duelId: d._id.toString(), ...roundReveal(d, index, c, answers) });
}

async function onEnded(duelId: string) {
  await finalizeDuel(duelId, now());
  const d = await DuelModel.findById(duelId);
  if (!d) return;
  // The result is the same for both players; build it from one player's view.
  const [view] = await toViews(d.creatorId.toString(), [d]);
  if (view?.result) {
    const payload: DuelEndedEvent = { duelId, phase: d.phase as DuelPhase, result: view.result };
    emit(d, DUEL_EVENTS.ended, payload);
  }
}

/** END_REVEAL: next question, or the end (last question, or Sudden Death decided). */
async function endReveal(d: DuelDoc, index: number, t: Timings): Promise<boolean> {
  const answers = (await answersOf(d)).filter((a) => a.index === index);
  const ok = (userId: string) => answers.some((a) => a.userId === userId && a.isCorrect);
  const [c, o] = players(d);
  const next = afterReveal((d.format ?? 'CLASSIC') as DuelFormat, index, d.items.length, [
    ok(c!),
    ok(o ?? ''),
  ]);
  if (next === 'END') {
    // A crash between REVEAL and its timeouts: fill them before scoring (idempotent).
    await store.fillTimeouts(d, index, now(), t.questionMs[(d.format ?? 'CLASSIC') as DuelFormat]);
    return store.complete(d, index, now());
  }
  return store.startQuestion(d, 'REVEAL', index + 1, now(), t);
}

/** Applies one action. Returns whether this call moved the duel (and so ran its side effects). */
async function apply(d: DuelDoc, a: Action): Promise<boolean> {
  const t = rt.timings;
  const n = now();
  const id = d._id.toString();
  switch (a.type) {
    case 'CANCEL':
      return store.cancel(
        d._id,
        a.reason === 'LOBBY_EXPIRED'
          ? store.lobbyExpiredGuard(n)
          : store.goneGuard('creator', t.lobbyAbsenceMs, n),
        n,
      );
    case 'REOPEN':
      return store.reopen(d._id, store.goneGuard('opponent', t.lobbyAbsenceMs, n), n);
    case 'START_COUNTDOWN': {
      const moved = await store.startCountdown(d, n, t);
      if (moved) await ensureSessions(d);
      return moved;
    }
    case 'START_QUESTION': {
      const moved = await store.startQuestion(d, 'COUNTDOWN', 0, n, t);
      if (moved) await emitQuestion(id);
      return moved;
    }
    case 'REVEAL': {
      const moved = await store.reveal(d, a.index, n, t);
      if (moved) await onRevealed(d, a.index);
      return moved;
    }
    case 'END_REVEAL': {
      const moved = await endReveal(d, a.index, t);
      if (!moved) return false;
      const fresh = await DuelModel.findById(id);
      if (fresh?.phase === 'QUESTION') await emitQuestion(id);
      else await onEnded(id);
      return true;
    }
    case 'FORFEIT': {
      const moved = await store.forfeit(d, a.loser, n, t);
      if (moved) await onEnded(id);
      return moved;
    }
    case 'ABANDON': {
      const moved = await store.abandon(d, n, t);
      if (moved) await onEnded(id);
      return moved;
    }
  }
}

function describe(a: Action): string {
  if (a.type === 'CANCEL' || a.type === 'REVEAL') return `${a.type}:${a.reason}`;
  if (a.type === 'FORFEIT') return `FORFEIT:${a.loser}`;
  return a.type;
}

async function step(duelId: string): Promise<void> {
  let changed = false;
  let stalled = false;
  let d: DuelDoc | null = null;
  for (let i = 0; i < MAX_STEPS; i++) {
    d = await DuelModel.findById(duelId);
    if (!d) return scheduler.disarm(duelId);
    const answered = d.phase === 'QUESTION' ? await store.countAnswered(d._id, d.currentIndex) : 0;
    const action = decide(store.toEngine(d), answered, now(), rt.timings);
    stalled = false;
    if (!action) break;
    const from = d.phase;
    if (!(await apply(d, action))) {
      stalled = true; // Someone else moved it: re-read and decide again.
      continue;
    }
    changed = true;
    const to = (await DuelModel.findById(duelId).select('phase').lean())?.phase;
    logger.info(
      { duelId, from, to, reason: describe(action), index: d.currentIndex },
      'duel transition',
    );
  }
  if (!d) return;
  const latest = (await DuelModel.findById(duelId)) ?? d;
  if (changed) await pushState(latest);
  arm(latest, stalled);
}

function arm(d: DuelDoc, retrySoon: boolean) {
  const id = d._id.toString();
  const n = now();
  const due = nextWakeAt(store.toEngine(d), n, rt.timings);
  const at = retrySoon ? Math.min(due ?? Infinity, n + RETRY_MS) : due;
  if (at === null || !Number.isFinite(at)) return scheduler.disarm(id);
  scheduler.arm(id, Math.max(at, n + (retrySoon ? RETRY_MS : 0)), () => void tick(id));
}

/**
 * Brings one duel up to date and re-arms its timer. Serialized per duel in this process; safe to
 * call at any time and any number of times. No-op until the socket server has started it.
 */
export function tick(duelId: string): Promise<void> {
  if (!rt.started) return Promise.resolve();
  return scheduler
    .serial(duelId, () => step(duelId))
    .catch((err) => logger.error({ err, duelId }, 'duel tick failed'));
}
