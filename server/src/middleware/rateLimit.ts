import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env';
import { RATE_LIMITS } from '../config/security';
import { AppError } from '../lib/errors';

const limited = new AppError(
  'RATE_LIMITED',
  'Too many requests. Wait a few minutes and try again.',
);

/** Login and register, per IP (D-015). */
export const authLimiter = rateLimit({
  ...RATE_LIMITS.auth,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(limited),
  // The local API smoke tests register many users from one IP.
  skip: () => env.NODE_ENV === 'test',
});

export const globalLimiter = rateLimit({
  ...RATE_LIMITS.global,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(limited),
});

/** Duel codes are guessable in principle (32^6), so joins are limited per IP. */
export const duelJoinLimiter = rateLimit({
  ...RATE_LIMITS.duelJoin,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(limited),
  skip: () => env.NODE_ENV === 'test',
});
