import type { Types } from 'mongoose';
import type { ChallengeType, Difficulty, TopicSlug } from '@luna/shared';
import { ChallengeModel, type ChallengeDoc } from '../../models/Challenge';

export const challengesRepo = {
  findById: (id: string | Types.ObjectId): Promise<ChallengeDoc | null> =>
    ChallengeModel.findById(id),
  findByIds: (ids: (string | Types.ObjectId)[]): Promise<ChallengeDoc[]> =>
    ChallengeModel.find({ _id: { $in: ids } }),
  /** Bounded: a topic holds about 10 challenges, the whole bank about 60. */
  findActive: (filter: {
    topicSlug?: TopicSlug;
    type?: ChallengeType | { $ne: ChallengeType };
    difficulty?: Difficulty;
  }): Promise<ChallengeDoc[]> => ChallengeModel.find({ ...filter, isActive: true }).limit(200),
};
