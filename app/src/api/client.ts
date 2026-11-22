import type { ApiErrorBody, ApiSuccess } from '@luna/shared';
import { config } from '../config/env';
import { useConnectionStore } from '../store/connection';
import { ApiError } from './errors';

type Hooks = { getToken: () => string | null; onUnauthorized: () => void };
let hooks: Hooks = { getToken: () => null, onUnauthorized: () => {} };

/** The auth store plugs itself in here, which avoids a circular import between client and store. */
export function configureApi(next: Hooks): void {
  hooks = next;
}

type Options = { body?: unknown; auth?: boolean };
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Number of in-flight requests currently past the cold-start threshold. */
let slowCount = 0;

async function attempt<T>(
  method: string,
  path: string,
  { body, auth = true }: Options,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  let counted = false;
  const slowTimer = setTimeout(() => {
    counted = true;
    slowCount += 1;
    useConnectionStore.getState().setWaking(true);
  }, config.coldStartNoticeMs);

  try {
    const token = auth ? hooks.getToken() : null;
    let res: Response;
    try {
      res = await fetch(`${config.apiUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      if (controller.signal.aborted) throw new ApiError('TIMEOUT', 'Request timed out', 0);
      throw new ApiError('NETWORK', e instanceof Error ? e.message : 'Network error', 0);
    }

    const json = await res.json().catch(() => null);
    if (res.ok && json && 'data' in json) return (json as ApiSuccess<T>).data;

    const err = (json as ApiErrorBody | null)?.error;
    if (err?.code) throw new ApiError(err.code, err.message, res.status, err.details);
    throw new ApiError('BAD_RESPONSE', 'Unexpected response from server', res.status);
  } finally {
    clearTimeout(timeout);
    clearTimeout(slowTimer);
    if (counted) {
      slowCount -= 1;
      if (slowCount === 0) useConnectionStore.getState().setWaking(false);
    }
  }
}

/**
 * Sends a request and returns the unwrapped `data`. Only GETs are retried (twice, with backoff):
 * a POST is never replayed automatically, because the user must decide whether to resend it.
 * A 401 on an authenticated call signs the user out.
 */
export async function request<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  options: Options = {},
): Promise<T> {
  const retries = method === 'GET' ? config.getRetries : 0;
  for (let n = 0; ; n++) {
    try {
      return await attempt<T>(method, path, options);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'UNAUTHORIZED' && options.auth !== false)
        hooks.onUnauthorized();
      if (!(e instanceof ApiError) || !e.isTransient || n >= retries) throw e;
      await sleep(config.retryBaseDelayMs * 2 ** n);
    }
  }
}

export const api = {
  get: <T>(path: string, options?: Options) => request<T>('GET', path, options),
  post: <T>(path: string, body: unknown, options?: Options) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body: unknown, options?: Options) =>
    request<T>('PATCH', path, { ...options, body }),
};
