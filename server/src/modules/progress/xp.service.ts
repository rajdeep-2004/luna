import { XpEventModel } from '../../models/XpEvent';
import { isDuplicateKey } from '../../lib/errors';
import { isoWeekKey } from '../../lib/time';
import { usersRepo } from '../users/users.repository';

/**
 * Awards XP once per (user, sourceKey). The ledger insert comes first: if it hits the unique index,
 * the award already happened and nothing is added (D-010, D-015). Returns the XP actually awarded.
 */
export async function awardXP(userId: string, sourceKey: string, amount: number): Promise<number> {
  if (amount <= 0) return 0;
  try {
    await XpEventModel.create({ userId, sourceKey, amount, weekKey: isoWeekKey(new Date()) });
  } catch (err) {
    if (isDuplicateKey(err)) return 0;
    throw err;
  }
  await usersRepo.addXP(userId, amount);
  return amount;
}
