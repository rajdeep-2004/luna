import type { DailyView } from '@luna/shared';
import { AppError, notFound } from '../../lib/errors';
import { localDateKey } from '../../lib/time';
import { SessionModel } from '../../models/Session';
import { completeSession, createSession, getSession } from '../sessions/sessions.service';
import { usersRepo } from '../users/users.repository';
import { pickDaily } from './daily.selection';

const findKata = (userId: string, date: string) =>
  SessionModel.findOne({ userId, type: 'DAILY', dailyDate: date }).select('_id status').lean();

async function toView(userId: string, date: string, sessionId: string, done: boolean) {
  const [session, summary] = await Promise.all([
    getSession(userId, sessionId),
    // Completing is idempotent: for a finished Kata this just returns the stored summary.
    done ? completeSession(userId, sessionId) : Promise.resolve(null),
  ]);
  return { date, session, summary };
}

/**
 * Today's Kata for the user's local date, built on the first open and returned as-is after that
 * (resume, or the result once finished). The unique `{userId, dailyDate}` index makes two
 * concurrent first opens build one Kata: the loser re-reads the winner's.
 */
export async function getDaily(userId: string, now = new Date()): Promise<DailyView> {
  const user = await usersRepo.findById(userId);
  if (!user) throw notFound('User');
  const date = localDateKey(now, user.timezone);

  const existing = await findKata(userId, date);
  if (existing)
    return toView(userId, date, existing._id.toString(), existing.status === 'COMPLETED');

  const picked = await pickDaily(userId, user.preferredTopicSlugs, date);
  if (picked.length === 0) throw new AppError('NOT_FOUND', 'No challenges available yet');
  const created = await createSession(userId, { type: 'DAILY', dailyDate: date, picked });
  if (created) return { date, session: created, summary: null };

  const winner = await findKata(userId, date);
  if (!winner) throw new AppError('CONFLICT', 'Could not build your Kata, please try again');
  return toView(userId, date, winner._id.toString(), winner.status === 'COMPLETED');
}
