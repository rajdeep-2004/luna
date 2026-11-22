import type { ProgressView, TopicSlug } from '@luna/shared';
import { LEVELS, levelForXP } from '../../config/game';
import { notFound } from '../../lib/errors';
import { localDateKey } from '../../lib/time';
import { UserTopicProgressModel } from '../../models/UserTopicProgress';
import { usersRepo } from '../users/users.repository';
import { masteryPhase, recentAccuracy, weakestTopic, type TopicStats } from './mastery';
import { revisitCount } from './revisit.service';
import { streakStatus } from './streak';

/** Everything the Dojo home needs in one call: rank, lantern, moons and the weakest blade. */
export async function getProgress(userId: string): Promise<ProgressView> {
  const user = await usersRepo.findById(userId);
  if (!user) throw notFound('User');
  const [rows, queued] = await Promise.all([
    UserTopicProgressModel.find({ userId }).lean(),
    revisitCount(userId),
  ]);

  const stats: (TopicStats & { difficulty: number })[] = rows.map((r) => ({
    topicSlug: r.topicSlug as TopicSlug,
    answers: r.answers,
    recentResults: r.recentResults,
    hasAdvancedCorrect: r.hasAdvancedCorrect,
    lastPractisedAt: r.lastPractisedAt ?? null,
    difficulty: r.difficultyLevel,
  }));
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
  };
}
