/** Every API response is either `{ data }` or `{ error }`. See docs/architecture.md §9. */
export type ApiSuccess<T> = { data: T };

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL',
  'DB_UNAVAILABLE',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export type ApiErrorBody = {
  error: { code: ErrorCode; message: string; details?: unknown };
};
