import type {
  DuelAnswerReceipt,
  DuelEndedEvent,
  DuelPresenceEvent,
  DuelQuestionEvent,
  DuelRevealEvent,
  DuelScore,
  DuelSnapshot,
} from '@luna/shared';

/**
 * The live duel as the app knows it (D-053): the latest server snapshot plus connection facts.
 * The reducers below only copy what the server pushed into the snapshot; none of them decides a
 * phase, a score or a winner. A full `duel:state` snapshot always replaces everything, and the
 * server sends one after every transition, so a missed small event heals at the next push.
 */

export type Conn = 'idle' | 'connecting' | 'online' | 'offline';

export type LiveState = {
  duelId: string | null;
  snapshot: DuelSnapshot | null;
  conn: Conn;
  /** False until the first successful connect: a long first connect means the server is waking. */
  everConnected: boolean;
  /** When the current connect attempt started (device clock). */
  connectingSince: number | null;
  /** When my socket dropped (device clock); the server holds my seat for the reconnect grace. */
  lostAt: number | null;
  /** When the rival's seat went offline (device clock). */
  rivalLostAt: number | null;
  /** Server clock − device clock, from clock-sync pings. */
  offsetMs: number;
  /** Another device of mine took this seat. */
  superseded: boolean;
  /** Joining failed for good (not a participant, signed out). */
  fatal: { code: string; message: string } | null;
};

export const initialLiveState: LiveState = {
  duelId: null,
  snapshot: null,
  conn: 'idle',
  everConnected: false,
  connectingSince: null,
  lostAt: null,
  rivalLostAt: null,
  offsetMs: 0,
  superseded: false,
  fatal: null,
};

const isMine = (s: LiveState, duelId: string) => s.duelId === duelId && s.snapshot !== null;

/** Tracks when the rival went offline, so the banner can count down their grace. */
function rivalLost(prev: number | null, connected: boolean | undefined, now: number) {
  if (connected === false) return prev ?? now;
  return null;
}

export function applySnapshot(s: LiveState, snap: DuelSnapshot, now: number): LiveState {
  if (s.duelId !== snap.id) return s;
  return {
    ...s,
    snapshot: snap,
    rivalLostAt: snap.rival ? rivalLost(s.rivalLostAt, snap.seats.rival?.connected, now) : null,
  };
}

export function applyQuestion(s: LiveState, e: DuelQuestionEvent): LiveState {
  if (!isMine(s, e.duelId)) return s;
  const snap = s.snapshot!;
  if (e.index < snap.currentIndex) return s; // An older question arriving late changes nothing.
  return {
    ...s,
    snapshot: {
      ...snap,
      phase: 'QUESTION',
      currentIndex: e.index,
      total: e.total,
      question: e.question,
      questionStartedAt: e.questionStartedAt,
      deadlineAt: e.deadlineAt,
      phaseEndsAt: null,
      serverNow: e.serverNow,
      myAnswer: null,
      rivalAnswered: false,
    },
  };
}

export function applyReveal(s: LiveState, e: DuelRevealEvent): LiveState {
  if (!isMine(s, e.duelId)) return s;
  const snap = s.snapshot!;
  const round = {
    index: e.index,
    correctAnswer: e.correctAnswer,
    explanation: e.explanation,
    misconception: e.misconception,
    ...(e.optionFeedback ? { optionFeedback: e.optionFeedback } : {}),
    results: e.results,
    score: e.score,
  };
  const rounds = [...snap.rounds.filter((r) => r.index !== e.index), round].sort(
    (a, b) => a.index - b.index,
  );
  const current = e.index === snap.currentIndex;
  return {
    ...s,
    snapshot: { ...snap, rounds, ...(current ? { phase: 'REVEAL' as const } : {}) },
  };
}

export function applyOpponentAnswered(
  s: LiveState,
  e: { duelId: string; index: number; userId: string },
): LiveState {
  if (!isMine(s, e.duelId)) return s;
  const snap = s.snapshot!;
  if (e.userId === snap.me.id || e.index !== snap.currentIndex) return s;
  return { ...s, snapshot: { ...snap, rivalAnswered: true } };
}

export function applyPresence(s: LiveState, e: DuelPresenceEvent, now: number): LiveState {
  if (!isMine(s, e.duelId)) return s;
  const snap = s.snapshot!;
  if (e.userId === snap.me.id) {
    return {
      ...s,
      snapshot: {
        ...snap,
        seats: { ...snap.seats, me: { ...snap.seats.me, connected: e.connected } },
      },
    };
  }
  if (!snap.seats.rival) return s;
  return {
    ...s,
    rivalLostAt: rivalLost(s.rivalLostAt, e.connected, now),
    snapshot: {
      ...snap,
      seats: { ...snap.seats, rival: { ...snap.seats.rival, connected: e.connected } },
    },
  };
}

export function applyEnded(s: LiveState, e: DuelEndedEvent): LiveState {
  if (!isMine(s, e.duelId)) return s;
  return { ...s, snapshot: { ...s.snapshot!, phase: e.phase, result: e.result } };
}

/** My answer's ack: locked in for this question (correctness comes with the reveal). */
export function applyReceipt(s: LiveState, duelId: string, r: DuelAnswerReceipt): LiveState {
  if (!isMine(s, duelId)) return s;
  const snap = s.snapshot!;
  if (snap.phase !== 'QUESTION' || snap.currentIndex !== r.index) return s;
  return { ...s, snapshot: { ...snap, myAnswer: r } };
}

// ---- read-only helpers for the screens ----

/** The running score from the latest revealed round (zeros before the first reveal). */
export function runningScore(snap: DuelSnapshot): { mine: number; rivals: number } {
  const last: DuelScore[] = snap.result?.score ?? snap.rounds[snap.rounds.length - 1]?.score ?? [];
  const of = (id: string | undefined) => last.find((x) => x.userId === id)?.correct ?? 0;
  return { mine: of(snap.me.id), rivals: of(snap.rival?.id) };
}

/** The revealed round for a question, if any. */
export const roundAt = (snap: DuelSnapshot, index: number) =>
  snap.rounds.find((r) => r.index === index) ?? null;

/** The first sentence of an explanation, for the one-line reveal. */
export function firstSentence(text: string): string {
  const t = text.trim();
  const m = /[.!?](\s|$)/.exec(t);
  return m ? t.slice(0, m.index + 1) : t;
}
