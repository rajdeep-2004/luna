import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

const unauthorized = () => new AppError('UNAUTHORIZED', 'Please log in again.');

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized());
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return next(unauthorized());
    req.userId = payload.sub;
    next();
  } catch {
    next(unauthorized());
  }
};

/** For handlers behind requireAuth: the user id, or a 401 if the middleware was skipped by mistake. */
export function authedUserId(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
