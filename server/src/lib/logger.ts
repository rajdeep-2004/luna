import pino from 'pino';
import { env, isProd } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: ['req.headers.authorization', '*.password', '*.passwordHash', '*.token'], remove: true },
  ...(isProd ? {} : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});
