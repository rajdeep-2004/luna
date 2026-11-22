import { connectDb, disconnectDb } from '../db/connect';
import { logger } from '../lib/logger';
import { loadContent } from './load';

async function main() {
  await connectDb();
  const result = await loadContent();
  logger.info(result, 'seed complete');
  await disconnectDb();
}

main().catch((err) => {
  logger.fatal({ err }, 'seed failed');
  process.exit(1);
});
