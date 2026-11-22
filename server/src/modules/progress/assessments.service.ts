import type { AssessmentScore, AssessmentStatus } from '@luna/shared';
import { CHECKPOINT } from '../../config/game';
import { SessionModel } from '../../models/Session';

type Completed = { summary?: unknown; completedAt?: Date | null } | null;

function score(s: Completed): AssessmentScore | null {
  const sum = s?.summary as { correctAnswers?: number; totalAnswers?: number } | undefined;
  if (!s || !sum || !s.completedAt) return null;
  return {
    correct: sum.correctAnswers ?? 0,
    total: sum.totalAnswers ?? 0,
    completedAt: s.completedAt.toISOString(),
  };
}

/**
 * Checkpoints unlock after every `everyKatas` completed Daily Katas (one Kata per local day, so
 * this counts active days): the Nth Checkpoint needs N × 7 Katas. Taking it late doesn't bank
 * extra ones, and it can't be repeated within a window.
 */
export async function assessmentStatus(userId: string): Promise<AssessmentStatus> {
  const done = { userId, status: 'COMPLETED' } as const;
  const [baseline, checkpoint, katas, checkpoints] = await Promise.all([
    SessionModel.findOne({ ...done, type: 'BASELINE' })
      .select('summary completedAt')
      .lean(),
    SessionModel.findOne({ ...done, type: 'CHECKPOINT' })
      .sort({ completedAt: -1 })
      .select('summary completedAt')
      .lean(),
    SessionModel.countDocuments({ ...done, type: 'DAILY' }),
    SessionModel.countDocuments({ ...done, type: 'CHECKPOINT' }),
  ]);
  const needed = (checkpoints + 1) * CHECKPOINT.everyKatas;
  return {
    baseline: score(baseline),
    checkpoint: score(checkpoint),
    checkpointAvailable: katas >= needed,
    katasUntilCheckpoint: Math.max(0, needed - katas),
  };
}
