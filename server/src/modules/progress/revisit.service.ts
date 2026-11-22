import { Types } from 'mongoose';
import type { ChallengeType, TopicSlug } from '@luna/shared';
import { REVISIT } from '../../config/game';
import { addDays, localDateKey } from '../../lib/time';
import { AnswerAttemptModel } from '../../models/AnswerAttempt';
import { RevisitItemModel } from '../../models/RevisitItem';

/**
 * Keeps the revisit queue in step with an answer (progression.md §5). Only single challenges are
 * queued: an incident is a three-stage story and is replayed from the incident list instead.
 * A correct answer removes the item; a miss inserts it, or, if it was already queued (a revisit
 * missed again), refreshes it and makes it wait `retryWaitDays`. One atomic upsert either way.
 */
export async function trackRevisit(
  userId: string,
  challenge: { id: string; topicSlug: TopicSlug; type: ChallengeType },
  isCorrect: boolean,
  timezone: string,
  now = new Date(),
): Promise<void> {
  if (challenge.type === 'INCIDENT') return;
  const filter = {
    userId: new Types.ObjectId(userId),
    challengeId: new Types.ObjectId(challenge.id),
  };
  if (isCorrect) {
    await RevisitItemModel.deleteOne(filter);
    return;
  }
  const today = localDateKey(now, timezone);
  await RevisitItemModel.updateOne(
    filter,
    [
      {
        $set: {
          topicSlug: challenge.topicSlug,
          notBeforeDate: {
            $cond: [
              { $ne: [{ $ifNull: ['$missedAt', null] }, null] },
              addDays(today, REVISIT.retryWaitDays),
              null,
            ],
          },
          missedAt: now,
          missedDate: today,
        },
      },
    ],
    { upsert: true, updatePipeline: true },
  );
}

/**
 * Due revisit challenge ids, oldest miss first. Due means: at least `minOtherAnswers` answers
 * since the miss, past any retry wait, and for the Daily Kata not missed today.
 */
export async function dueRevisits(
  userId: string,
  opts: { today: string; forKata: boolean; topicSlug?: TopicSlug; limit: number },
): Promise<string[]> {
  if (opts.limit <= 0) return [];
  const nth = await AnswerAttemptModel.findOne({ userId })
    .sort({ createdAt: -1 })
    .skip(REVISIT.minOtherAnswers - 1)
    .select('createdAt')
    .lean();
  if (!nth) return [];
  const rows = await RevisitItemModel.find({
    userId,
    // Strictly before the Nth-latest answer: the miss itself is never one of the N "other" answers.
    missedAt: { $lt: nth.createdAt },
    $or: [{ notBeforeDate: null }, { notBeforeDate: { $lte: opts.today } }],
    ...(opts.forKata ? { missedDate: { $lt: opts.today } } : {}),
    ...(opts.topicSlug ? { topicSlug: opts.topicSlug } : {}),
  })
    .sort({ missedAt: 1 })
    .limit(Math.min(opts.limit, REVISIT.maxScan))
    .select('challengeId')
    .lean();
  return rows.map((r) => r.challengeId.toString());
}

export const revisitCount = (userId: string) => RevisitItemModel.countDocuments({ userId });
