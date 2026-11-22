import type { PlayerStats, ProgressView, TopicSlug } from '@luna/shared';
import { LEVELS, levelForXP } from '../../config/game';
import { notFound } from '../../lib/errors';
import { localDateKey } from '../../lib/time';
import { DuelModel } from '../../models/Duel';
import { SessionModel } from '../../models/Session';
import { UserTopicProgressModel } from '../../models/UserTopicProgress';
import { usersRepo } from '../users/users.repository';
import { masteryPhase, recentAccuracy, weakestTopic, type TopicStats } from './mastery';
import { revisitCount } from './revisit.service';
import { assessmentStatus } from './assessments.service';
import { streakStatus } from './streak';

type ProgressRow = {
  topicSlug: string;
  answers: number;
  recentResults: boolean[];
  hasAdvancedCorrect: boolean;
  lastPractisedAt?: Date | null;
  difficultyLevel: number;
};

/** Topic rows as the pure mastery functions want them. */
export function getProgressStats(rows: ProgressRow[]): (TopicStats & { difficulty: number })[] {
  return rows.map((r) => ({
    topicSlug: r.topicSlug as TopicSlug,
    answers: r.answers,
    recentResults: r.recentResults,
    hasAdvancedCorrect: r.hasAdvancedCorrect,
    lastPractisedAt: r.lastPractisedAt ?? null,
    difficulty: r.difficultyLevel,
  }));
}

/**
 * The Profile's counts (D-039): finished Katas and duel results. Four counts on indexed fields
 * (sessions by user+type+status, duels by creator or opponent); no new writes or counters.
 */
export async function playerStats(userId: string): Promise<PlayerStats> {
  const mine = {
    $or: [{ creatorId: userId }, { opponentId: userId }],
    status: 'COMPLETED' as const,
  };
  const [katasCompleted, duelsWon, duelsDecided, duelsPlayed] = await Promise.all([
    SessionModel.countDocuments({ userId, type: 'DAILY', status: 'COMPLETED' }),
    DuelModel.countDocuments({ ...mine, winnerId: userId }),
    DuelModel.countDocuments({ ...mine, winnerId: { $ne: null } }),
    DuelModel.countDocuments(mine),
  ]);
  return {
    katasCompleted,
    duelsWon,
    duelsLost: duelsDecided - duelsWon,
    duelsDrawn: duelsPlayed - duelsDecided,
  };
}

/** Everything the Dojo home needs in one call: rank, lantern, moons and the weakest blade. */
export async function getProgress(userId: string): Promise<ProgressView> {
  const user = await usersRepo.findById(userId);
  if (!user) throw notFound('User');
  const [rows, queued, assessments, stats$] = await Promise.all([
    UserTopicProgressModel.find({ userId }).lean(),
    revisitCount(userId),
    assessmentStatus(userId),
    playerStats(userId),
  ]);

  const stats = getProgressStats(rows);
  const lvl = levelForXP(user.totalXP);
  const next = LEVELS.find((l) => l.level === lvl.level + 1);

  return {
    level: {
      level: lvl.level,
      rankName: lvl.name,
      kanji: lvl.kanji,
      totalXP: user.totalXP,
      levelStartXP: lvl.minXP,
      nextLevelXP: next?.minXP ?? null,
    },
    streak: streakStatus(
      {
        current: user.currentStreak,
        longest: user.longestStreak,
        lastDate: user.lastDailyDate ?? null,
      },
      localDateKey(new Date(), user.timezone),
    ),
    topics: stats.map((t) => {
      const acc = recentAccuracy(t.recentResults);
      return {
        topicSlug: t.topicSlug,
        phase: masteryPhase(t),
        answers: t.answers,
        recentAccuracy: acc === null ? null : Math.round(acc * 100) / 100,
        difficulty: t.difficulty as 1 | 2 | 3,
      };
    }),
    weakestTopic: weakestTopic(stats, user.preferredTopicSlugs as TopicSlug[]),
    revisitsQueued: queued,
    assessments,
    stats: stats$,
  };
}
