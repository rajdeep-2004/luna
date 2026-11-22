import type { PublicUser } from '@luna/shared';
import type { UserDoc } from '../../models/User';
import { levelForXP } from '../../config/game';

/** The only way a user leaves the server. Never includes passwordHash. */
export function toPublicUser(u: UserDoc): PublicUser {
  const lvl = levelForXP(u.totalXP);
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
    currentStreak: u.currentStreak,
    longestStreak: u.longestStreak,
  };
}
