import {
  DUEL_FORMAT_RULES,
  LIVE_DUEL,
  type DuelFormat,
  type DuelPhase,
  type DuelScore,
  type LiveDuelTimings,
} from '@luna/shared';

/**
 * The live duel state machine as pure functions (D-052): given the stored duel and the clock, what
 * should happen next, and when to look again. No I/O here, so every rule is unit-testable; the
 * store applies an action as a conditional update and the runtime schedules the next wake-up.
 */

export type Timings = LiveDuelTimings & { questionMs: Record<DuelFormat, number> };

export const DEFAULT_TIMINGS: Timings = {
  ...LIVE_DUEL,
  questionMs: {
    CLASSIC: DUEL_FORMAT_RULES.CLASSIC.timerMs,
    BLITZ: DUEL_FORMAT_RULES.BLITZ.timerMs,
    SUDDEN_DEATH: DUEL_FORMAT_RULES.SUDDEN_DEATH.timerMs,
  },
};

export type Seat = 'creator' | 'opponent';
export type SeatState = { connected: boolean; lastSeenAt: Date; readyAt: Date | null };

export type EngineDuel = {
  phase: DuelPhase;
  format: DuelFormat;
  total: number;
  currentIndex: number;
  deadlineAt: Date | null;
  phaseEndsAt: Date | null;
  lobbyExpiresAt: Date | null;
  creatorSeat: SeatState;
  /** Null until someone joins. */
  opponentSeat: SeatState | null;
};

export type Action =
  | { type: 'CANCEL'; reason: 'LOBBY_EXPIRED' | 'CREATOR_GONE' }
  | { type: 'REOPEN' }
  | { type: 'START_COUNTDOWN' }
  | { type: 'START_QUESTION'; index: number }
  | { type: 'REVEAL'; index: number; reason: 'BOTH_ANSWERED' | 'DEADLINE' }
  | { type: 'END_REVEAL'; index: number }
  | { type: 'FORFEIT'; loser: Seat }
  | { type: 'ABANDON' };

const at = (d: Date | null, plus = 0) => (d ? d.getTime() + plus : Infinity);

/** When an offline seat's grace runs out (Infinity while connected). */
const goneAt = (s: SeatState | null, graceMs: number) =>
  s && !s.connected ? s.lastSeenAt.getTime() + graceMs : Infinity;

/** A seat whose grace period has passed. */
const isGone = (s: SeatState | null, graceMs: number, now: number) => goneAt(s, graceMs) <= now;

function decidePregame(d: EngineDuel, now: number, t: Timings): Action | null {
  if (at(d.lobbyExpiresAt) <= now) return { type: 'CANCEL', reason: 'LOBBY_EXPIRED' };
  if (isGone(d.creatorSeat, t.lobbyAbsenceMs, now))
    return { type: 'CANCEL', reason: 'CREATOR_GONE' };
  if (d.phase !== 'READY' || !d.opponentSeat) return null;
  // A joiner who never shows up frees the lobby for someone else.
  if (isGone(d.opponentSeat, t.lobbyAbsenceMs, now)) return { type: 'REOPEN' };
  const bothIn = [d.creatorSeat, d.opponentSeat].every((s) => s.connected && s.readyAt);
  return bothIn ? { type: 'START_COUNTDOWN' } : null;
}

/** Presence during a match: past the grace the absent player forfeits; both gone → abandoned. */
function decidePresence(d: EngineDuel, now: number, t: Timings): Action | null {
  const cGone = isGone(d.creatorSeat, t.reconnectGraceMs, now);
  const oGone = isGone(d.opponentSeat, t.reconnectGraceMs, now);
  if (cGone && oGone) return { type: 'ABANDON' };
  // One is gone; if the other is offline too (still inside its grace), wait: if it comes back it
  // wins by forfeit, if not, both are gone.
  if (cGone && d.opponentSeat?.connected) return { type: 'FORFEIT', loser: 'creator' };
  if (oGone && d.creatorSeat.connected) return { type: 'FORFEIT', loser: 'opponent' };
  return null;
}

/**
 * The next action for this duel at `now`, or null. `answered` is how many players have answered
 * the current question. Calling it twice with the same inputs gives the same action, and the store
 * applies each action only if the duel is still in the state it was decided from.
 */
export function decide(d: EngineDuel, answered: number, now: number, t: Timings): Action | null {
  if (d.phase === 'LOBBY' || d.phase === 'READY') return decidePregame(d, now, t);
  if (d.phase !== 'COUNTDOWN' && d.phase !== 'QUESTION' && d.phase !== 'REVEAL') return null;
  const presence = decidePresence(d, now, t);
  if (presence) return presence;
  const i = d.currentIndex;
  if (d.phase === 'COUNTDOWN')
    return at(d.phaseEndsAt) <= now ? { type: 'START_QUESTION', index: 0 } : null;
  if (d.phase === 'QUESTION') {
    if (answered >= 2) return { type: 'REVEAL', index: i, reason: 'BOTH_ANSWERED' };
    return at(d.deadlineAt, t.networkGraceMs) <= now
      ? { type: 'REVEAL', index: i, reason: 'DEADLINE' }
      : null;
  }
  return at(d.phaseEndsAt) <= now ? { type: 'END_REVEAL', index: i } : null;
}

/**
 * When `decide` could next return something without any new event (a timer to arm), or null.
 * Only future times count: a time already past that `decide` declined (one player gone while the
 * other is still inside its grace) must not re-arm at once, or the timer would spin.
 */
export function nextWakeAt(d: EngineDuel, now: number, t: Timings): number | null {
  let times: number[] = [];
  if (d.phase === 'LOBBY' || d.phase === 'READY') {
    times = [
      at(d.lobbyExpiresAt),
      goneAt(d.creatorSeat, t.lobbyAbsenceMs),
      goneAt(d.opponentSeat, t.lobbyAbsenceMs),
    ];
  } else if (d.phase === 'COUNTDOWN' || d.phase === 'REVEAL') {
    times = [at(d.phaseEndsAt)];
  } else if (d.phase === 'QUESTION') {
    times = [at(d.deadlineAt, t.networkGraceMs)];
  }
  if (d.phase === 'COUNTDOWN' || d.phase === 'QUESTION' || d.phase === 'REVEAL') {
    times.push(
      goneAt(d.creatorSeat, t.reconnectGraceMs),
      goneAt(d.opponentSeat, t.reconnectGraceMs),
    );
  }
  const next = Math.min(...times.filter((x) => x > now));
  return Number.isFinite(next) ? next : null;
}

/**
 * After a reveal: Sudden Death ends at the first question where exactly one player is wrong (both
 * wrong → play on); every format ends after its last question.
 */
export function afterReveal(
  format: DuelFormat,
  index: number,
  total: number,
  correct: [boolean, boolean],
): 'NEXT' | 'END' {
  if (index >= total - 1) return 'END';
  if (DUEL_FORMAT_RULES[format].endsOnMiss && correct[0] !== correct[1]) return 'END';
  return 'NEXT';
}

/** Server-measured response time, clamped to the question timer (and never negative). */
export function responseTime(startedAt: Date, now: number, timerMs: number): number {
  return Math.min(timerMs, Math.max(0, now - startedAt.getTime()));
}

type ScoredAnswer = { userId: string; isCorrect: boolean; responseMs: number };

export function scoreOf(userId: string, answers: ScoredAnswer[]): DuelScore {
  const mine = answers.filter((a) => a.userId === userId);
  return {
    userId,
    correct: mine.filter((a) => a.isCorrect).length,
    totalResponseMs: mine.reduce((n, a) => n + a.responseMs, 0),
  };
}

/** More correct answers wins; then lower total server-measured response time; else a draw. */
export function pickWinner(a: DuelScore, b: DuelScore): string | null {
  if (a.correct !== b.correct) return a.correct > b.correct ? a.userId : b.userId;
  if (a.totalResponseMs !== b.totalResponseMs)
    return a.totalResponseMs < b.totalResponseMs ? a.userId : b.userId;
  return null;
}
