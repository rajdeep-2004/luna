import mongoose from 'mongoose';
import '../models/AnswerAttempt';
import '../models/Challenge';
import '../models/Duel';
import '../models/DuelAnswer';
import '../models/RevisitItem';
import '../models/Session';
import '../models/Topic';
import '../models/User';
import '../models/UserAchievement';
import '../models/UserTopicProgress';
import '../models/XpEvent';

/**
 * Makes every collection's indexes match the schemas: creates new ones and drops ones whose
 * options changed. Mongoose's autoIndex only creates, so an index whose partial filter changed
 * (P4: one open CHECKPOINT) would otherwise fail with IndexOptionsConflict. Run via `npm run seed`.
 */
export async function syncAllIndexes(): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const [name, model] of Object.entries(mongoose.models)) {
    out[name] = await model.syncIndexes();
  }
  return out;
}
