import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { globalLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { topicsRouter } from './modules/topics/topics.routes';
import { sessionsRouter } from './modules/sessions/sessions.routes';

/** Builds the Express app without listening, so tests can mount it directly. */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render sits behind one proxy; needed for per-IP rate limits.

  app.use(helmet());
  // The native app sends no Origin header, so CORS only matters for Expo web in dev.
  app.use(cors({ origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/v1/health' } }));
  app.use(globalLimiter);

  const v1 = express.Router();
  v1.use('/health', healthRouter);
  v1.use('/auth', authRouter);
  v1.use('/users', usersRouter);
  v1.use('/topics', topicsRouter);
  v1.use('/sessions', sessionsRouter);
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
