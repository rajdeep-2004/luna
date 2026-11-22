import { TOPIC_SLUGS, type ExperienceLevel, type TopicSlug } from '@luna/shared';
import { UserTopicProgressModel } from '../../models/UserTopicProgress';
import { Types } from 'mongoose';
import { ADAPTIVE, SESSION, START_DIFFICULTY } from '../../config/game';
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

/**
 * The pipeline for one answer, run as a single atomic update (no read-modify-write):
 * counters, the rolling mastery window, and adaptive difficulty (progression.md §4). Once the
 * adapt window holds 5 results, 4–5 correct moves difficulty up, 0–2 down, and a change resets
 * the window so the next decision waits for 5 new answers.
 */
function answerPipeline(isCorrect: boolean, difficulty: number, now: Date) {
  const append = (field: string, keep: number) => ({
    $slice: [{ $concatArrays: [{ $ifNull: [field, []] }, [isCorrect]] }, -keep],
  });
  return [
    {
      $set: {
        answers: { $add: [{ $ifNull: ['$answers', 0] }, 1] },
        correct: { $add: [{ $ifNull: ['$correct', 0] }, isCorrect ? 1 : 0] },
        recentResults: append('$recentResults', SESSION.recentResultsWindow),
        adaptWindow: append('$adaptWindow', ADAPTIVE.window),
        lastPractisedAt: now,
        hasAdvancedCorrect:
          isCorrect && difficulty === 3 ? true : { $ifNull: ['$hasAdvancedCorrect', false] },
        difficultyLevel: { $ifNull: ['$difficultyLevel', ADAPTIVE.min] },
      },
    },
    {
      $set: {
        _hits: { $size: { $filter: { input: '$adaptWindow', cond: '$$this' } } },
        _full: { $gte: [{ $size: '$adaptWindow' }, ADAPTIVE.window] },
      },
    },
    {
      $set: {
        _next: {
          $cond: [
            '$_full',
            {
              $switch: {
                branches: [
                  {
                    case: { $gte: ['$_hits', ADAPTIVE.upAtCorrect] },
                    then: { $min: [ADAPTIVE.max, { $add: ['$difficultyLevel', 1] }] },
                  },
                  {
                    case: { $lte: ['$_hits', ADAPTIVE.downAtCorrect] },
                    then: { $max: [ADAPTIVE.min, { $subtract: ['$difficultyLevel', 1] }] },
                  },
                ],
                default: '$difficultyLevel',
              },
            },
            '$difficultyLevel',
          ],
        },
      },
    },
    {
      $set: {
        adaptWindow: {
          $cond: [{ $ne: ['$_next', '$difficultyLevel'] }, { $literal: [] }, '$adaptWindow'],
        },
        difficultyLevel: '$_next',
      },
    },
    { $unset: ['_hits', '_full', '_next'] },
  ];
}

/** One atomic update per answer. Upserts the row if onboarding never created it. */
export async function recordAnswer(
  userId: string,
  topicSlug: TopicSlug,
  isCorrect: boolean,
  difficulty: number,
): Promise<void> {
  const update = () =>
    UserTopicProgressModel.updateOne(
      { userId: new Types.ObjectId(userId), topicSlug },
      answerPipeline(isCorrect, difficulty, new Date()),
      { upsert: true, updatePipeline: true },
    );
  try {
    await update();
  } catch (err) {
    // Two concurrent first answers can both try to insert the row; the loser retries as an update.
    if (!isDuplicateKey(err)) throw err;
    await update();
  }
}

/** Sets a topic's difficulty and clears its adapt window (used by the baseline). */
export async function setDifficulty(
  userId: string,
  topicSlug: TopicSlug,
  difficulty: 1 | 2 | 3,
): Promise<void> {
  await UserTopicProgressModel.updateOne(
    { userId, topicSlug },
    { $set: { difficultyLevel: difficulty, adaptWindow: [] } },
    { upsert: true },
  );
}
