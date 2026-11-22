import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import type { ApiErrorBody } from '@luna/shared';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND', 'Route not found'));
};

/** Maps every error to the envelope. Unknown errors are logged in full and returned without internals. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appErr: AppError;
  if (err instanceof AppError) {
    appErr = err;
  } else if ((err as { type?: string }).type === 'entity.parse.failed') {
    appErr = new AppError('VALIDATION_ERROR', 'Request body is not valid JSON');
  } else if ((err as { type?: string }).type === 'entity.too.large') {
    appErr = new AppError('VALIDATION_ERROR', 'Request body is too large');
  } else if (err instanceof mongoose.Error && err.name === 'MongooseServerSelectionError') {
    appErr = new AppError('DB_UNAVAILABLE', 'The database is unavailable. Try again shortly.');
  } else {
    logger.error({ err, path: req.path, method: req.method }, 'unhandled error');
    appErr = new AppError('INTERNAL', 'Something went wrong. Try again.');
  }
  const body: ApiErrorBody = {
    error: { code: appErr.code, message: appErr.message, ...(appErr.details ? { details: appErr.details } : {}) },
  };
  res.status(appErr.status).json(body);
};
