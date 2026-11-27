/** Auth hardening constants (D-018). */
export const AUTH = {
  bcryptCost: 12,
  /** Failed logins on one account before it is locked, regardless of IP. */
  maxFailedLogins: 5,
  lockMinutes: 15,
} as const;

/** Per-IP request limits (D-015, D-032). Windows in ms. */
export const RATE_LIMITS = {
  /** Login and register. */
  auth: { windowMs: 15 * 60 * 1000, limit: 10 },
  /** Every route, as a coarse flood guard. */
  global: { windowMs: 60 * 1000, limit: 300 },
  /** Duel join: codes are guessable in principle (32^6). */
  duelJoin: { windowMs: 15 * 60 * 1000, limit: 30 },
} as const;

/**
 * Live duel socket limits (D-052, tightened in P15): one token bucket per user shared by all of
 * their sockets (`burst` events at once, refilled at `perSecond`); at most `maxSocketsPerUser`
 * open sockets (two devices plus reconnect overlap); client frames capped at `maxMessageBytes`.
 * A normal client sends a handful of tiny events per question, so this only stops floods.
 */
export const SOCKET_LIMITS = {
  burst: 10,
  perSecond: 3,
  maxSocketsPerUser: 5,
  maxMessageBytes: 16 * 1024,
} as const;
