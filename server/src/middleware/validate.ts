import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../lib/errors';

/** Validates and replaces req.body with the parsed value. Handlers can trust req.body after this. */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(
        new AppError('VALIDATION_ERROR', details[0]?.message ?? 'Invalid request', details),
      );
    }
    req.body = result.data;
    next();
  };
}

/** Rejects path params that are not Mongo ObjectIds, so they never reach a query. */
export function validateObjectIdParam(name: string): RequestHandler {
  return (req, _res, next) => {
    const value = req.params[name];
    if (typeof value !== 'string' || !/^[a-f0-9]{24}$/.test(value)) {
      return next(new AppError('NOT_FOUND', 'Not found'));
    }
    next();
  };
}

/**
 * Parses a query string with a schema. Express 5's `req.query` is read-only, so handlers call
 * this and use the returned value instead of a middleware that rewrites it.
 */
export function parseQuery<T>(schema: ZodType<T>, query: unknown): T {
  const result = schema.safeParse(query ?? {});
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Invalid query';
    throw new AppError('VALIDATION_ERROR', message);
  }
  return result.data;
}
