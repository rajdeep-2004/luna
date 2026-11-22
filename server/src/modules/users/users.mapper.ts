import type { PublicUser } from '@luna/shared';
import type { UserDoc } from '../../models/User';
import { levelForXP } from '../../config/game';
import { localDateKey } from '../../lib/time';
import { streakStatus } from '../progress/streak';

/** The only way a user leaves the server. Never includes passwordHash. */
export function toPublicUser(u: UserDoc): PublicUser {
  const lvl = levelForXP(u.totalXP);
  // A broken run shows 0, not the stale stored number (progression.md §6).
  const streak = streakStatus(
    { current: u.currentStreak, longest: u.longestStreak, lastDate: u.lastDailyDate ?? null },
    localDateKey(new Date(), u.timezone),
  );
  return {
    id: u._id.toString(),
    email: u.email,
    username: u.username,
    avatarId: u.avatarId as PublicUser['avatarId'],
    preferredTopicSlugs: u.preferredTopicSlugs as PublicUser['preferredTopicSlugs'],
    experienceLevel: (u.experienceLevel ?? null) as PublicUser['experienceLevel'],
    timezone: u.timezone,
    onboarded: Boolean(u.onboardedAt),
    totalXP: u.totalXP,
    level: lvl.level,
    rankName: lvl.name,
    currentStreak: streak.current,
    longestStreak: u.longestStreak,
  };
}
