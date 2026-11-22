import type { ErrorCode } from '@luna/shared';

/** Server error codes plus the failures that happen before a server answer exists. */
export type ApiErrorCode = ErrorCode | 'NETWORK' | 'TIMEOUT' | 'BAD_RESPONSE';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the request never got a usable answer, so retrying the same call is reasonable. */
  get isTransient(): boolean {
    return (
      this.code === 'NETWORK' ||
      this.code === 'TIMEOUT' ||
      this.code === 'DB_UNAVAILABLE' ||
      this.status >= 502
    );
  }
}

/** A message that is safe to show to the user. Server messages for 4xx are written for people; the rest are not. */
export function userMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something unexpected happened. Please try again.';
  switch (error.code) {
    case 'NETWORK':
      return 'Cannot reach the server. Check your connection and try again.';
    case 'TIMEOUT':
      return 'The server took too long to answer. Please try again.';
    case 'RATE_LIMITED':
      return error.message || 'Too many attempts. Please wait a bit and try again.';
    case 'VALIDATION_ERROR':
    case 'UNAUTHORIZED':
    case 'CONFLICT':
    case 'FORBIDDEN':
    case 'NOT_FOUND':
      return error.message;
    default:
      return 'The server had a problem. Please try again in a moment.';
  }
}
