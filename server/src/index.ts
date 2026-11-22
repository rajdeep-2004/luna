import { createApp } from './app';
import { env } from './config/env';
import { connectDb, disconnectDb } from './db/connect';
import { logger } from './lib/logger';

async function main() {
  await connectDb();
  const server = createApp().listen(env.PORT, () =>
    logger.info({ port: env.PORT }, 'Luna API listening'),
  );

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
