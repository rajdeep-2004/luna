import type { BonusAward } from '@luna/shared';
import { BONUS_XP, STREAK_MILESTONES } from '../../config/game';
import { XpEventModel } from '../../models/XpEvent';
import { usersRepo } from '../users/users.repository';
import { nextStreak, runStartDate, type StreakResult } from './streak';
import { awardXP } from './xp.service';

const MAX_STREAK_RETRIES = 3;

/**
 * Moves the streak for the Daily Kata of local date `dateKey`. Answers to a Kata are refused once
 * its day has ended, so a completed Kata was always played on its own day. Compare-and-set on `lastDailyDate`: if a
 * concurrent completion changed it first, re-read and decide again, so the streak moves once.
 */
export async function updateStreak(userId: string, dateKey: string): Promise<StreakResult> {
  for (let i = 0; i < MAX_STREAK_RETRIES; i++) {
    const user = await usersRepo.findById(userId);
    if (!user) throw new Error(`User ${userId} vanished while completing a Kata`);
    const prev = {
      current: user.currentStreak,
      longest: user.longestStreak,
      lastDate: user.lastDailyDate ?? null,
    };
    const next = nextStreak(prev, dateKey);
    // Already counted (a parallel completion of this same Kata won the write): report it as
    // counted, so every caller returns the same summary. Only this Kata carries this date.
    if (!next.extended) return { ...next, extended: prev.lastDate === dateKey };
    const moved = await usersRepo.setStreakIf(userId, prev.lastDate, next);
    if (moved) return next;
  }
  throw new Error(`Streak update for ${userId} lost ${MAX_STREAK_RETRIES} races`);
}

type Candidate = { kind: BonusAward['kind']; key: string; xp: number; days?: number };

/** The bonuses a Daily Kata can earn, each under its ledger key (scoring.md §3). */
export function dailyBonusCandidates(
  dailyDate: string,
  allCorrect: boolean,
  streak: StreakResult,
): Candidate[] {
  const out: Candidate[] = [
    { kind: 'DAILY_KATA', key: `daily:${dailyDate}`, xp: BONUS_XP.dailyKata },
  ];
  if (allCorrect)
    out.push({ kind: 'PERFECT_KATA', key: `perfect:${dailyDate}`, xp: BONUS_XP.perfectKata });
  if (streak.lastDate) {
    const runStart = runStartDate(streak.current, streak.lastDate);
    for (const m of STREAK_MILESTONES)
      if (streak.current >= m.days)
        out.push({
          kind: 'STREAK_MILESTONE',
          key: `streak${m.days}:${runStart}`,
          xp: m.xp,
          days: m.days,
        });
  }
  return out;
}

export const firstIncidentCandidate = (): Candidate => ({
  kind: 'FIRST_INCIDENT',
  key: 'first-incident',
  xp: BONUS_XP.firstIncident,
});

/**
 * Pays every candidate through the ledger, then reports the ones this session owns. "Owns" means
 * the ledger row exists for that key and was created by this completion or an earlier attempt at
 * it, so a retry or a parallel call reports the same list instead of zero.
 */
export async function payBonuses(
  userId: string,
  candidates: Candidate[],
  claimedSince: Date,
): Promise<BonusAward[]> {
  for (const c of candidates) await awardXP(userId, c.key, c.xp);
  if (!candidates.length) return [];
  const rows = await XpEventModel.find({
    userId,
    sourceKey: { $in: candidates.map((c) => c.key) },
    createdAt: { $gte: claimedSince },
  })
    .select('sourceKey')
    .lean();
  const paid = new Set(rows.map((r) => r.sourceKey));
  return candidates
    .filter((c) => paid.has(c.key))
    .map(({ kind, xp, days }) => (days ? { kind, xp, days } : { kind, xp }));
}
