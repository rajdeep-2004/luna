/**
 * The only module that reads `process.env` in the app. Expo inlines `EXPO_PUBLIC_*` values at build time.
 * Every limit the API client uses lives here too, so there are no magic numbers in the client.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Copy app/.env.example to app/.env and fill it in.',
  );
}

export const config = {
  apiUrl: apiUrl.replace(/\/+$/, ''),
  requestTimeoutMs: 15_000,
  getRetries: 2,
  retryBaseDelayMs: 500,
  /** After this long without an answer we tell the user the server is waking up (Render cold start). */
  coldStartNoticeMs: 4_000,
} as const;
