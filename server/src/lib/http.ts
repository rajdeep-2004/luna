import type { Response } from 'express';
import type { ApiSuccess } from '@luna/shared';

export function ok<T>(res: Response, data: T, status = 200): void {
  const body: ApiSuccess<T> = { data };
  res.status(status).json(body);
}
