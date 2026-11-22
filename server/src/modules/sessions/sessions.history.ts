import { Types } from 'mongoose';
import type {
  Page,
  PageQuery,
  SessionHistoryItem,
  SessionSummary,
  SessionType,
  TopicSlug,
} from '@luna/shared';
import { HISTORY } from '../../config/game';
import { AppError } from '../../lib/errors';
import { SessionModel } from '../../models/Session';

/** Keyset cursor `<completedAt ms>.<sessionId>`: stable while new sessions are being finished. */
function encodeCursor(completedAt: Date, id: Types.ObjectId): string {
  return `${completedAt.getTime()}.${id.toString()}`;
}

function decodeCursor(cursor: string): { at: Date; id: Types.ObjectId } {
  const [ms, id] = cursor.split('.');
  const at = new Date(Number(ms));
  if (!id || !Types.ObjectId.isValid(id) || Number.isNaN(at.getTime()))
    throw new AppError('VALIDATION_ERROR', 'Invalid cursor');
  return { at, id: new Types.ObjectId(id) };
}

/** `GET /users/me/sessions`: the user's finished sessions, newest first. */
export async function sessionHistory(
  userId: string,
  query: PageQuery,
): Promise<Page<SessionHistoryItem>> {
  const limit = query.limit ?? HISTORY.defaultPageSize;
  const after = query.cursor ? decodeCursor(query.cursor) : null;
  const rows = await SessionModel.find({
    userId,
    status: 'COMPLETED',
    ...(after
      ? {
          $or: [
            { completedAt: { $lt: after.at } },
            { completedAt: after.at, _id: { $lt: after.id } },
          ],
        }
      : {}),
  })
    .sort({ completedAt: -1, _id: -1 })
    .limit(limit + 1)
    .select('type topicSlug completedAt summary')
    .lean();

  const items = rows.slice(0, limit).map((r) => {
    const s = r.summary as SessionSummary;
    return {
      id: r._id.toString(),
      type: r.type as SessionType,
      topicSlug: (r.topicSlug ?? null) as TopicSlug | null,
      completedAt: r.completedAt!.toISOString(),
      correctAnswers: s.correctAnswers,
      totalAnswers: s.totalAnswers,
      grade: s.grade,
      xpEarned: s.xpEarned,
    };
  });
  const last = rows[limit - 1];
  return {
    items,
    nextCursor: rows.length > limit && last ? encodeCursor(last.completedAt!, last._id) : null,
  };
}
