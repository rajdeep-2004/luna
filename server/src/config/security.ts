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
