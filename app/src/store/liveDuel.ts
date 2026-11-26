import { create } from 'zustand';
import {
  DUEL_EVENTS,
  PREGAME_PHASES,
  type DuelAnswerReceipt,
  type DuelEndedEvent,
  type DuelPhase,
  type DuelPresenceEvent,
  type DuelQuestionEvent,
  type DuelRevealEvent,
  type DuelSnapshot,
} from '@luna/shared';
import { emitAck, getSocket, syncClock } from '../api/socket';
import { offsetFromPush } from '../lib/live/clock';
import {
  applyEnded,
  applyOpponentAnswered,
  applyPresence,
  applyQuestion,
  applyReceipt,
  applyReveal,
  applySnapshot,
  initialLiveState,
  type LiveState,
} from '../lib/live/state';

/**
 * The live duel store (D-053). It owns the socket's lifecycle for the open duel and keeps the
 * latest server snapshot. The server is the source of truth: every event is folded in by a pure
 * reducer (`lib/live/state.ts`) and nothing here decides a phase, a timer or a score.
 */

type Failure = { code: string; message: string };
type Actions = {
  /** Opens the duel's room: connects (or reuses) the socket, syncs the clock, joins, says ready. */
  open: (duelId: string, seed?: DuelSnapshot) => void;
  /** Closes the room locally and drops the socket (the server's grace rules apply). */
  close: () => void;
  /** Leaving on purpose: cancels a lobby I created, frees my seat, or forfeits a match. */
  leave: () => Promise<Failure | null>;
  answer: (index: number, answer: string) => Promise<Failure | null>;
  /** After `duel:superseded`: take the seat back on this device. */
  takeSeat: () => void;
};

const JOIN_RETRY_MS = 1_000;
/** Errors that mean "this duel is not for you": retrying can't help. */
const FATAL_JOIN = new Set(['NOT_FOUND', 'FORBIDDEN', 'UNAUTHORIZED', 'VALIDATION_ERROR']);
const isPregame = (p: DuelPhase) => (PREGAME_PHASES as readonly DuelPhase[]).includes(p);

export const useLiveDuel = create<LiveState & Actions>((set, get) => {
  let bound = false;
  let joinRetry: ReturnType<typeof setTimeout> | null = null;
  let clockSynced = false;

  const fold = (fn: (s: LiveState) => LiveState) => set((s) => fn(s));

  async function join() {
    const duelId = get().duelId;
    if (!duelId) return;
    const ack = await emitAck<DuelSnapshot>(DUEL_EVENTS.joinRoom, { duelId });
    if (get().duelId !== duelId) return; // Closed or switched while waiting.
    if (!ack.ok) {
      if (FATAL_JOIN.has(ack.error.code)) return set({ fatal: ack.error });
      joinRetry = setTimeout(() => void join(), JOIN_RETRY_MS);
      return;
    }
    const snap = ack.data;
    if (!clockSynced) {
      const rough = offsetFromPush(snap.serverNow, Date.now());
      if (rough !== null) set({ offsetMs: rough });
    }
    fold((s) => applySnapshot(s, snap, Date.now()));
    // Being on the face-off is being ready: the countdown starts once both seats are in.
    if (isPregame(snap.phase) && !snap.seats.me.ready) {
      void emitAck(DUEL_EVENTS.ready, { duelId });
    }
  }

  async function onConnect() {
    set({ conn: 'online', everConnected: true, lostAt: null, connectingSince: null });
    // Join first so the screen fills fast, then refine the clock.
    await join();
    const offset = await syncClock();
    if (offset !== null) {
      clockSynced = true;
      set({ offsetMs: offset });
    }
  }

  function bind() {
    if (bound) return;
    bound = true;
    const s = getSocket();
    s.on('connect', () => void onConnect());
    s.on('disconnect', (reason) => {
      if (!get().duelId) return;
      set({ conn: 'offline', lostAt: get().lostAt ?? Date.now(), connectingSince: Date.now() });
      // The server closed us on purpose (e.g. a restart): Socket.IO won't retry on its own.
      if (reason === 'io server disconnect') s.connect();
    });
    s.on('connect_error', (err) => {
      if (!get().duelId) return;
      if (err.message === 'UNAUTHORIZED') {
        s.disconnect();
        return set({ fatal: { code: 'UNAUTHORIZED', message: 'Sign in again to duel.' } });
      }
      set({ connectingSince: get().connectingSince ?? Date.now() });
    });
    s.on(DUEL_EVENTS.state, (snap: DuelSnapshot) =>
      fold((st) => applySnapshot(st, snap, Date.now())),
    );
    s.on(DUEL_EVENTS.question, (e: DuelQuestionEvent) => fold((st) => applyQuestion(st, e)));
    s.on(DUEL_EVENTS.reveal, (e: DuelRevealEvent) => fold((st) => applyReveal(st, e)));
    s.on(DUEL_EVENTS.opponentAnswered, (e: { duelId: string; index: number; userId: string }) =>
      fold((st) => applyOpponentAnswered(st, e)),
    );
    s.on(DUEL_EVENTS.presence, (e: DuelPresenceEvent) =>
      fold((st) => applyPresence(st, e, Date.now())),
    );
    s.on(DUEL_EVENTS.ended, (e: DuelEndedEvent) => fold((st) => applyEnded(st, e)));
    s.on(DUEL_EVENTS.superseded, (e: { duelId: string }) => {
      if (e.duelId === get().duelId) set({ superseded: true });
    });
  }

  return {
    ...initialLiveState,

    open(duelId, seed) {
      if (joinRetry) clearTimeout(joinRetry);
      clockSynced = false;
      set({
        ...initialLiveState,
        duelId,
        snapshot: seed && seed.id === duelId ? seed : null,
        conn: 'connecting',
        connectingSince: Date.now(),
      });
      bind();
      const s = getSocket();
      if (s.connected) void onConnect();
      else s.connect();
    },

    close() {
      if (joinRetry) clearTimeout(joinRetry);
      set({ ...initialLiveState });
      getSocket().disconnect();
    },

    async leave() {
      const duelId = get().duelId;
      if (!duelId) return null;
      const ack = await emitAck(DUEL_EVENTS.leave, { duelId });
      return ack.ok ? null : ack.error;
    },

    async answer(index, answer) {
      const duelId = get().duelId;
      if (!duelId) return { code: 'CLOSED', message: 'This duel is closed.' };
      const ack = await emitAck<DuelAnswerReceipt>(DUEL_EVENTS.answer, { duelId, index, answer });
      if (!ack.ok) return ack.error;
      fold((s) => applyReceipt(s, duelId, ack.data));
      return null;
    },

    takeSeat() {
      set({ superseded: false });
      void join();
    },
  };
});
