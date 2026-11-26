/**
 * One timer per duel, keyed by id (D-052). Arming again replaces the previous timer, so a duel
 * never has two wake-ups pending. Also a per-duel promise chain, so one instance handles a duel's
 * events in order; correctness still rests on the store's conditional updates, not on this.
 */
const timers = new Map<string, NodeJS.Timeout>();
const chains = new Map<string, Promise<unknown>>();

/** setTimeout's delay is a 32-bit int; longer waits re-arm on wake (the engine re-decides). */
const MAX_DELAY_MS = 2_147_483_647;

export function arm(duelId: string, atMs: number, fn: () => void): void {
  disarm(duelId);
  const delay = Math.min(MAX_DELAY_MS, Math.max(0, atMs - Date.now()));
  timers.set(
    duelId,
    setTimeout(() => {
      timers.delete(duelId);
      fn();
    }, delay),
  );
}

export function disarm(duelId: string): void {
  const t = timers.get(duelId);
  if (t) clearTimeout(t);
  timers.delete(duelId);
}

export function disarmAll(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

export const armedCount = () => timers.size;

/** Runs `fn` after every earlier job for this duel has settled (whatever its outcome). */
export function serial<T>(duelId: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(duelId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  const tail = next.catch(() => undefined);
  chains.set(duelId, tail);
  void tail.then(() => {
    if (chains.get(duelId) === tail) chains.delete(duelId);
  });
  return next;
}
