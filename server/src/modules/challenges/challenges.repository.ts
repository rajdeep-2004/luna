import type { Types } from 'mongoose';
import type { ChallengeType, Difficulty, TopicSlug } from '@luna/shared';
import { ChallengeModel, type ChallengeDoc } from '../../models/Challenge';
import { SELECTION } from '../../config/game';

export const challengesRepo = {
  findById: (id: string | Types.ObjectId): Promise<ChallengeDoc | null> =>
    ChallengeModel.findById(id),
  findByIds: (ids: (string | Types.ObjectId)[]): Promise<ChallengeDoc[]> =>
    ChallengeModel.find({ _id: { $in: ids } }),
  /**
   * Bounded by SELECTION.poolMax (D-050). The bound must stay above the whole active bank: a cut-off
   * pool silently drops whole topics from cross-topic picks such as the checkpoint.
   */
  findActive: (filter: {
    topicSlug?: TopicSlug;
    type?: ChallengeType | { $ne: ChallengeType };
    difficulty?: Difficulty;
  }): Promise<ChallengeDoc[]> => ChallengeModel.find({ ...filter, isActive: true }).limit(SELECTION.poolMax),
};
