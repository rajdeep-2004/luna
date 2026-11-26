import { io, type Socket } from 'socket.io-client';
import { DUEL_EVENTS, type DuelAck, type DuelPong } from '@luna/shared';
import { config } from '../config/env';
import { estimateOffset, type ClockSample } from '../lib/live/clock';

/**
 * The one Socket.IO connection for live duels (D-053). WebSocket transport only (the server
 * refuses polling), the JWT is read fresh on every (re)connect through the `auth` callback, and
 * Socket.IO's own reconnect runs with exponential backoff and jitter from `config.live`.
 * The socket is created lazily and connected only while a live duel screen is open.
 */

let socket: Socket | null = null;
let readToken: () => string | null = () => null;

/** The auth store plugs its token in here (no import cycle between api and store). */
export function configureSocket(getToken: () => string | null): void {
  readToken = getToken;
}

export function getSocket(): Socket {
  if (!socket) {
    const live = config.live;
    socket = io(config.socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: live.reconnectDelayMs,
      reconnectionDelayMax: live.reconnectDelayMaxMs,
      randomizationFactor: live.reconnectJitter,
      timeout: live.connectTimeoutMs,
      auth: (cb) => cb({ token: readToken() ?? '' }),
    });
  }
  return socket;
}

const failure = (code: string, message: string): DuelAck<never> => ({
  ok: false,
  error: { code, message },
});

/**
 * Sends one client event and waits for its ack. Refuses to send while offline: Socket.IO would
 * otherwise buffer the event and deliver it after a reconnect, by which time an answer is late.
 */
export async function emitAck<T>(event: string, payload: unknown): Promise<DuelAck<T>> {
  const s = getSocket();
  if (!s.connected) return failure('OFFLINE', 'Reconnecting to the dojo…');
  try {
    return (await s.timeout(config.live.ackTimeoutMs).emitWithAck(event, payload)) as DuelAck<T>;
  } catch {
    return failure('TIMEOUT', 'The dojo did not answer. Try again.');
  }
}

/**
 * Estimates server clock − device clock with a few pings, keeping the lowest round trip
 * (`estimateOffset`). Returns null if no ping came back.
 */
export async function syncClock(): Promise<number | null> {
  const samples: ClockSample[] = [];
  for (let i = 0; i < config.live.clockSamples; i++) {
    const sentAt = Date.now();
    const ack = await emitAck<DuelPong>(DUEL_EVENTS.ping, {});
    const receivedAt = Date.now();
    if (ack.ok) samples.push({ sentAt, receivedAt, serverNow: ack.data.serverNow });
  }
  return estimateOffset(samples);
}
