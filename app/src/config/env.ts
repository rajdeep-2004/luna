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

const trimmed = apiUrl.replace(/\/+$/, '');
/** Socket.IO connects to the server's origin; a path in the URL would be read as a namespace. */
const origin = /^https?:\/\/[^/]+/i.exec(trimmed)?.[0] ?? trimmed;

export const config = {
  apiUrl: trimmed,
  socketUrl: origin,
  requestTimeoutMs: 15_000,
  getRetries: 2,
  retryBaseDelayMs: 500,
  /** After this long without an answer we tell the user the server is waking up (Render cold start). */
  coldStartNoticeMs: 4_000,
  /** Live duels over Socket.IO (D-053). */
  live: {
    /** A socket event without an ack after this long counts as failed. */
    ackTimeoutMs: 8_000,
    /** Reconnect backoff: starts here, doubles, capped at the max, with jitter. */
    reconnectDelayMs: 500,
    reconnectDelayMaxMs: 5_000,
    reconnectJitter: 0.5,
    /** One connect attempt gives up after this (a cold Render start can take ~30 s). */
    connectTimeoutMs: 45_000,
    /** Clock-sync pings per (re)connect; the lowest round trip wins. */
    clockSamples: 3,
    /** The timer's screen-reader label only changes at these seconds left (and on each new question). */
    timerAnnounceAtSec: [30, 20, 10, 5] as readonly number[],
    /** How often the question timer redraws, and the banners' grace countdowns. */
    timerTickMs: 200,
    bannerTickMs: 500,
    /** Under this many seconds the timer turns to seal ink. */
    urgentSec: 5,
    /** A beat between the last reveal and the result screen. */
    toResultMs: 900,
  },
} as const;
