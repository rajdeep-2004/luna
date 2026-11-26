import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDb, disconnectDb } from './db/connect';
import { migrateV1Duels } from './db/migrations';
import { logger } from './lib/logger';
import { attachLiveDuels } from './modules/duels/live/socket';
import { recoverLiveDuels } from './modules/duels/live/recovery';

async function main() {
  await connectDb();
  await migrateV1Duels();
  const server = createServer(createApp());
  const live = attachLiveDuels(server);
  await recoverLiveDuels();
  server.listen(env.PORT, () => logger.info({ port: env.PORT }, 'Luna API listening'));

  // Timers first (no new transitions), then sockets and HTTP (io.close closes both), then the DB.
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    void live
      .close()
      .then(disconnectDb)
      .then(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
