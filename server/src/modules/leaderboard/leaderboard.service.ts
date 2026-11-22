import { Types } from 'mongoose';
import type { BoardRow, BoardView, PageQuery } from '@luna/shared';
import { BOARD } from '../../config/game';
import { AppError } from '../../lib/errors';
import { isoWeekKey, nextWeekStartUTC } from '../../lib/time';
import { XpEventModel } from '../../models/XpEvent';
import { usersRepo } from '../users/users.repository';
import { toPlayerView } from '../users/users.mapper';

type Standing = { _id: Types.ObjectId; xp: number; lastAt: Date };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Every user with XP in `weekKey`, best first. Ties go to whoever reached that total first
 * (earliest last award), then by id so the order is stable across pages. Uses the
 * `{weekKey, userId}` index; this per-request aggregation is the documented first bottleneck
 * (architecture §12), fine for a capstone-sized user base.
 */
function standings(weekKey: string, limit?: number): Promise<Standing[]> {
  return XpEventModel.aggregate<Standing>([
    { $match: { weekKey } },
    { $group: { _id: '$userId', xp: { $sum: '$amount' }, lastAt: { $max: '$createdAt' } } },
    { $match: { xp: { $gt: 0 } } },
    { $sort: { xp: -1, lastAt: 1, _id: 1 } },
    ...(limit ? [{ $limit: limit }] : []),
  ]);
}

/** The cursor is the next rank offset. Anything else is a bad request, not a silent page 1. */
function parseOffset(cursor: string | undefined): number {
  if (cursor === undefined) return 0;
  const n = Number(cursor);
  if (!Number.isInteger(n) || n < 0 || n >= BOARD.maxRank)
    throw new AppError('VALIDATION_ERROR', 'Invalid cursor');
  return n;
}

export async function weeklyBoard(userId: string, query: PageQuery): Promise<BoardView> {
  const now = new Date();
  const weekKey = isoWeekKey(now);
  const offset = parseOffset(query.cursor);
  const limit = query.limit ?? BOARD.defaultPageSize;

  const [all, lastWeek] = await Promise.all([
    standings(weekKey),
    standings(isoWeekKey(new Date(now.getTime() - WEEK_MS)), BOARD.podium),
  ]);
  const end = Math.min(offset + limit, BOARD.maxRank, all.length);
  const page = all.slice(offset, end).map((s, i) => ({ s, rank: offset + i + 1 }));
  const myIndex = all.findIndex((s) => s._id.toString() === userId);
  const mine = myIndex >= 0 ? { s: all[myIndex]!, rank: myIndex + 1 } : null;

  const wanted = [...page, ...(mine ? [mine] : [])];
  const players = await usersRepo.findPlayers(wanted.map((w) => w.s._id));
  const byId = new Map(players.map((p) => [p._id.toString(), p]));
  const podium = new Map(lastWeek.map((s, i) => [s._id.toString(), (i + 1) as 1 | 2 | 3]));

  const toRow = ({ s, rank }: { s: Standing; rank: number }): BoardRow | null => {
    const user = byId.get(s._id.toString());
    // A deleted account keeps its ledger rows; skip it rather than show a blank row.
    if (!user) return null;
    return {
      rank,
      player: toPlayerView(user),
      weeklyXP: s.xp,
      lastWeekPlace: podium.get(s._id.toString()) ?? null,
    };
  };

  return {
    weekKey,
    resetsAt: nextWeekStartUTC(now).toISOString(),
    rows: page.map(toRow).filter((r): r is BoardRow => r !== null),
    nextCursor: end < Math.min(all.length, BOARD.maxRank) ? String(end) : null,
    me: mine ? toRow(mine) : null,
  };
}
