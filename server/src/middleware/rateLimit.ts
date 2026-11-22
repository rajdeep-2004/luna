import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

const limited = new AppError('RATE_LIMITED', 'Too many requests. Wait a few minutes and try again.');

/** Login and register: 10 attempts per 15 minutes per IP (D-015: basic limits on auth only). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(limited),
  // The local API smoke tests register many users from one IP.
  skip: () => env.NODE_ENV === 'test',
});

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(limited),
});
