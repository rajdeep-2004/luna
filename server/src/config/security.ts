/** Auth hardening constants (D-018). */
export const AUTH = {
  bcryptCost: 12,
  /** Failed logins on one account before it is locked, regardless of IP. */
  maxFailedLogins: 5,
  lockMinutes: 15,
} as const;
