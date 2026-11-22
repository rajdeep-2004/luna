import { TOPIC_SLUGS, type ExperienceLevel, type TopicSlug } from '@luna/shared';
import { UserTopicProgressModel } from '../../models/UserTopicProgress';
import { SESSION, START_DIFFICULTY } from '../../config/game';
import { isDuplicateKey } from '../../lib/errors';

/** Creates a progress row per topic at the segment's starting difficulty. Existing rows are untouched. */
export async function initTopicProgress(userId: string, level: ExperienceLevel): Promise<void> {
  await UserTopicProgressModel.bulkWrite(
    TOPIC_SLUGS.map((topicSlug) => ({
      updateOne: {
        filter: { userId, topicSlug },
        update: { $setOnInsert: { userId, topicSlug, difficultyLevel: START_DIFFICULTY[level] } },
        upsert: true,
      },
    })),
  );
}

export async function getDifficulty(userId: string, topicSlug: TopicSlug): Promise<1 | 2 | 3> {
  const row = await UserTopicProgressModel.findOne({ userId, topicSlug })
    .select('difficultyLevel')
    .lean();
  return (row?.difficultyLevel ?? 1) as 1 | 2 | 3;
}

/** One atomic update per answer: counters, rolling window, last practised. */
export async function recordAnswer(
  userId: string,
  topicSlug: TopicSlug,
  isCorrect: boolean,
  difficulty: number,
): Promise<void> {
  const update = () =>
    UserTopicProgressModel.updateOne(
      { userId, topicSlug },
      {
        $inc: { answers: 1, correct: isCorrect ? 1 : 0 },
        $push: { recentResults: { $each: [isCorrect], $slice: -SESSION.recentResultsWindow } },
        $set: {
          lastPractisedAt: new Date(),
          ...(isCorrect && difficulty === 3 ? { hasAdvancedCorrect: true } : {}),
        },
      },
      { upsert: true },
    );
  try {
    await update();
  } catch (err) {
    // Two concurrent first answers can both try to insert the row; the loser retries as an update.
    if (!isDuplicateKey(err)) throw err;
    await update();
  }
}
