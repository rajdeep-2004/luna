import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

const unauthorized = () => new AppError('UNAUTHORIZED', 'Please log in again.');

/** The user id in a valid access token, or null. Shared by REST and the duel socket handshake. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload === 'string' || typeof payload.sub !== 'string' ? null : payload.sub;
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized());
  const userId = verifyToken(header.slice(7));
  if (!userId) return next(unauthorized());
  req.userId = userId;
  next();
};

/** For handlers behind requireAuth: the user id, or a 401 if the middleware was skipped by mistake. */
export function authedUserId(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
