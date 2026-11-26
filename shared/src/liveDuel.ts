import { z } from 'zod';
import type { PublicChallenge } from './challenges';
import type { DuelFormat, PlayerView } from './competition';

/**
 * Live duels (V2, docs/v2/plan.md §6, D-052). The server owns the state machine and the clock; the
 * app renders what the server pushes. Everything both sides must agree on lives here.
 *
 * LOBBY ─join─▶ READY ─both ready─▶ COUNTDOWN ─▶ QUESTION i ─both answered / deadline─▶ REVEAL i
 *   REVEAL i ─▶ QUESTION i+1, or COMPLETED (last question, or Sudden Death decided)
 *   LOBBY/READY ─cancel / lobby TTL / creator gone─▶ CANCELLED
 *   in play: one player gone past the grace ─▶ COMPLETED (FORFEIT); both gone ─▶ ABANDONED
 */
export const DUEL_PHASES = [
  'LOBBY',
  'READY',
  'COUNTDOWN',
  'QUESTION',
  'REVEAL',
  'COMPLETED',
  'CANCELLED',
  'ABANDONED',
] as const;
export type DuelPhase = (typeof DUEL_PHASES)[number];

/** Before the first question: the duel can still be cancelled. */
export const PREGAME_PHASES = ['LOBBY', 'READY'] as const satisfies readonly DuelPhase[];
/** A match is being played: timers run and presence matters. */
export const PLAYING_PHASES = [
  'COUNTDOWN',
  'QUESTION',
  'REVEAL',
] as const satisfies readonly DuelPhase[];
export const ENDED_PHASES = [
  'COMPLETED',
  'CANCELLED',
  'ABANDONED',
] as const satisfies readonly DuelPhase[];

/** EXPIRED only appears on V1 asynchronous duels kept in history. */
export type DuelEndReason = 'PLAYED' | 'FORFEIT' | 'CANCELLED' | 'ABANDONED' | 'EXPIRED';

/** Live duel clock, in ms. The per-question timer is `DUEL_FORMAT_RULES[format].timerMs`. */
export const LIVE_DUEL = {
  /** "3, 2, 1" before the first question. */
  countdownMs: 3_000,
  /** How long each question's result stays on screen before the next one. */
  revealMs: 3_000,
  /** An unjoined (or joined but never started) lobby closes after this. */
  lobbyTtlMs: 10 * 60 * 1000,
  /** A lobby whose creator has been offline this long is cancelled. */
  lobbyAbsenceMs: 60_000,
  /** A player who drops mid-match keeps their seat this long. */
  reconnectGraceMs: 20_000,
  /** An answer is accepted until `deadlineAt + networkGraceMs`, for network latency. */
  networkGraceMs: 750,
} as const;
export type LiveDuelTimings = { [K in keyof typeof LIVE_DUEL]: number };

/** Socket.IO event names, both directions. */
export const DUEL_EVENTS = {
  // client → server (each takes an ack callback)
  joinRoom: 'duel:join-room',
  ready: 'duel:ready',
  answer: 'duel:answer',
  leave: 'duel:leave',
  // server → client
  state: 'duel:state',
  question: 'duel:question',
  opponentAnswered: 'duel:opponent-answered',
  reveal: 'duel:reveal',
  ended: 'duel:ended',
  presence: 'duel:presence',
  superseded: 'duel:superseded',
} as const;

// ---- client → server payloads ----

const DuelId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid duel id');

export const DuelRoomPayload = z.object({ duelId: DuelId });
export type DuelRoomPayload = z.infer<typeof DuelRoomPayload>;

/** An option id, or a Bug Hunt line number as a string. */
export const DuelAnswerPayload = z.object({
  duelId: DuelId,
  index: z.number().int().min(0).max(49),
  answer: z.string().trim().min(1).max(20),
});
export type DuelAnswerPayload = z.infer<typeof DuelAnswerPayload>;

/** Every client event's ack: `{ ok: true, data }` or `{ ok: false, error }` (same codes as REST). */
export type DuelAck<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

/** The answer ack: the answer is locked in. Correctness is only revealed at REVEAL. */
export type DuelAnswerReceipt = { index: number; responseMs: number; timedOut: boolean };

// ---- server → client payloads ----

export type DuelQuestionEvent = {
  duelId: string;
  index: number;
  total: number;
  question: PublicChallenge;
  questionStartedAt: string;
  deadlineAt: string;
  /** The server's clock when this was sent, so the app can measure its clock offset. */
  serverNow: string;
};

export type DuelRoundResult = {
  userId: string;
  /** Null on a timeout. */
  answer: string | null;
  isCorrect: boolean;
  responseMs: number;
  timedOut: boolean;
};

export type DuelScore = { userId: string; correct: number; totalResponseMs: number };

export type DuelRevealEvent = {
  duelId: string;
  index: number;
  /** The key for this question only, sent once both answered or the time ran out. */
  correctAnswer: string;
  explanation: string;
  misconception: string;
  optionFeedback?: Record<string, string>;
  results: DuelRoundResult[];
  score: DuelScore[];
};

export type DuelResultView = {
  endReason: DuelEndReason;
  /** Null on a draw, a cancel or an abandoned duel. */
  winnerId: string | null;
  score: DuelScore[];
  /** Paid to the winner of a played duel; 0 when capped, a draw or a forfeit. */
  winBonusXP: number;
};

export type DuelEndedEvent = { duelId: string; phase: DuelPhase; result: DuelResultView };

export type DuelPresenceEvent = { duelId: string; userId: string; connected: boolean };

export type DuelSeatView = { connected: boolean; ready: boolean };

/** A row in the duel history (`GET /duels`). */
export type DuelView = {
  id: string;
  code: string;
  format: DuelFormat;
  phase: DuelPhase;
  role: 'CREATOR' | 'OPPONENT';
  me: PlayerView;
  /** Null until someone joins. */
  rival: PlayerView | null;
  total: number;
  createdAt: string;
  /** While in LOBBY/READY: when the invite closes. */
  lobbyExpiresAt: string | null;
  /** Set once the duel has ended. */
  result: DuelResultView | null;
};

/**
 * Everything needed to draw (or redraw after a reconnect) the duel screen: `GET /duels/:id` and the
 * `duel:state` event. The current question has no answer key; `rounds` holds only revealed ones.
 */
export type DuelSnapshot = DuelView & {
  seats: { me: DuelSeatView; rival: DuelSeatView | null };
  currentIndex: number;
  question: PublicChallenge | null;
  questionStartedAt: string | null;
  deadlineAt: string | null;
  /** End of the countdown or of the current reveal. */
  phaseEndsAt: string | null;
  serverNow: string;
  /** My locked answer for the current question, if any (QUESTION phase). */
  myAnswer: DuelAnswerReceipt | null;
  rivalAnswered: boolean;
  rounds: Omit<DuelRevealEvent, 'duelId'>[];
};
