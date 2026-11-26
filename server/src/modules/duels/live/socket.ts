import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { ZodType } from 'zod';
import {
  DUEL_EVENTS,
  DuelAnswerPayload,
  DuelRoomPayload,
  type DuelAck,
  type DuelAnswerReceipt,
  type DuelSnapshot,
} from '@luna/shared';
import { env } from '../../../config/env';
import { SOCKET_LIMITS } from '../../../config/security';
import { AppError } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import { TokenBucket } from '../../../lib/tokenBucket';
import { verifyToken } from '../../../middleware/requireAuth';
import { toSnapshot } from '../duels.view';
import type { Timings } from './engine';
import { submitLiveAnswer } from './answers';
import { leave, participantDuel, setPresence, setReady } from './room';
import * as runtime from './runtime';

/**
 * The live duel transport (D-052): Socket.IO on the API's HTTP server, WebSocket only. The JWT is
 * checked in the handshake with the same verify as REST; every event is rate-limited per socket,
 * validated with the shared Zod schemas and answered through an ack, so a bad payload gets an error
 * ack and never throws inside Socket.IO.
 */

type Data = { userId: string; bucket: TokenBucket; duels: Set<string> };
type LiveSocket = Socket<Record<string, never>, Record<string, never>, Record<string, never>, Data>;
type Ack<T> = (res: DuelAck<T>) => void;

const room = (duelId: string) => `duel:${duelId}`;
const seatKey = (duelId: string, userId: string) => `${duelId}:${userId}`;

/** The one socket that holds each player's seat in each duel: the latest one to join (two devices). */
const seats = new Map<string, string>();

function fail(err: unknown): DuelAck<never> {
  if (err instanceof AppError)
    return { ok: false, error: { code: err.code, message: err.message } };
  logger.error({ err }, 'duel socket handler failed');
  return { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong' } };
}

/** Wraps a handler: rate limit, payload validation, ack with data or a safe error. */
function on<P, R>(
  socket: LiveSocket,
  event: string,
  schema: ZodType<P>,
  handler: (payload: P) => Promise<R>,
) {
  socket.on(
    event as never,
    (async (raw: unknown, maybeAck: unknown) => {
      const ack: Ack<R> = typeof maybeAck === 'function' ? (maybeAck as Ack<R>) : () => undefined;
      if (!socket.data.bucket.take())
        return ack({ ok: false, error: { code: 'RATE_LIMITED', message: 'Slow down' } });
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Invalid payload';
        return ack({ ok: false, error: { code: 'VALIDATION_ERROR', message } });
      }
      try {
        ack({ ok: true, data: await handler(parsed.data) });
      } catch (err) {
        ack(fail(err));
      }
    }) as never,
  );
}

/** Events from a socket that another device has since replaced are refused. */
function assertSeatHolder(socket: LiveSocket, duelId: string) {
  if (seats.get(seatKey(duelId, socket.data.userId)) !== socket.id)
    throw new AppError('FORBIDDEN', 'Join the duel room first');
}

function register(io: Server, socket: LiveSocket) {
  const { userId } = socket.data;

  on(socket, DUEL_EVENTS.joinRoom, DuelRoomPayload, async ({ duelId }): Promise<DuelSnapshot> => {
    const { seat } = await participantDuel(userId, duelId);
    const key = seatKey(duelId, userId);
    const previous = seats.get(key);
    if (previous && previous !== socket.id) {
      const old = io.sockets.sockets.get(previous);
      old?.emit(DUEL_EVENTS.superseded as never, { duelId } as never);
      old?.leave(room(duelId));
      old?.data.duels?.delete(duelId);
      logger.info({ duelId, userId }, 'duel seat superseded by a newer socket');
    }
    seats.set(key, socket.id);
    socket.data.duels.add(duelId);
    await socket.join(room(duelId));
    await setPresence(duelId, userId, seat, true);
    const { duel } = await participantDuel(userId, duelId);
    return toSnapshot(userId, duel, runtime.now());
  });

  on(socket, DUEL_EVENTS.ready, DuelRoomPayload, async ({ duelId }) => {
    assertSeatHolder(socket, duelId);
    await setReady(userId, duelId);
    return { duelId };
  });

  on(socket, DUEL_EVENTS.answer, DuelAnswerPayload, async (p): Promise<DuelAnswerReceipt> => {
    assertSeatHolder(socket, p.duelId);
    const { receipt, fresh } = await submitLiveAnswer(userId, p, runtime.now(), runtime.timings());
    if (fresh) {
      socket.to(room(p.duelId)).emit(
        DUEL_EVENTS.opponentAnswered as never,
        {
          duelId: p.duelId,
          index: p.index,
          userId,
        } as never,
      );
      void runtime.tick(p.duelId);
    }
    return receipt;
  });

  on(socket, DUEL_EVENTS.leave, DuelRoomPayload, async ({ duelId }) => {
    assertSeatHolder(socket, duelId);
    seats.delete(seatKey(duelId, userId));
    socket.data.duels.delete(duelId);
    await socket.leave(room(duelId));
    await leave(userId, duelId);
    return { duelId };
  });

  socket.on('disconnect', () => {
    for (const duelId of socket.data.duels) {
      const key = seatKey(duelId, userId);
      // Only the seat holder's drop counts: a replaced device going away changes nothing.
      if (seats.get(key) !== socket.id) continue;
      seats.delete(key);
      void participantDuel(userId, duelId)
        .then(({ seat }) => setPresence(duelId, userId, seat, false))
        .catch((err) => logger.warn({ err, duelId }, 'duel disconnect not recorded'));
    }
  });
}

export type LiveDuels = { io: Server; close: () => Promise<void> };

export function attachLiveDuels(
  server: HttpServer,
  opts: { timings?: Partial<Timings> } = {},
): LiveDuels {
  const io = new Server(server, {
    path: '/socket.io',
    transports: ['websocket'],
    serveClient: false,
    // The native app sends no Origin header; CORS only matters for Expo web in dev.
    cors: { origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : false },
  });

  io.use((socket, next) => {
    const auth = socket.handshake.auth as { token?: unknown } | undefined;
    const token = typeof auth?.token === 'string' ? auth.token : '';
    const userId = token ? verifyToken(token) : null;
    if (!userId) return next(new Error('UNAUTHORIZED'));
    socket.data = {
      userId,
      bucket: new TokenBucket(SOCKET_LIMITS.burst, SOCKET_LIMITS.perSecond),
      duels: new Set(),
    } satisfies Data;
    next();
  });
  io.on('connection', (socket) => register(io, socket as LiveSocket));

  runtime.startRuntime({
    timings: opts.timings,
    hub: {
      toDuel: (duelId, event, payload) => io.to(room(duelId)).emit(event, payload),
      toUser: (duelId, userId, event, payload) => {
        const socketId = seats.get(seatKey(duelId, userId));
        if (socketId) io.to(socketId).emit(event, payload);
      },
    },
  });

  return {
    io,
    close: async () => {
      runtime.stopRuntime();
      seats.clear();
      await new Promise<void>((resolve) => {
        io.close(() => resolve());
      });
    },
  };
}
