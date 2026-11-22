import type { SessionType } from '@luna/shared';
import {
  HINT_XP_DIVISOR,
  NO_XP_SESSION_TYPES,
  REVIEW_XP,
  XP_BY_DIFFICULTY,
} from '../../config/game';
import type { ChallengeDoc } from '../../models/Challenge';
import { XpEventModel } from '../../models/XpEvent';
import { awardXP } from '../progress/xp.service';

/** Ledger key suffix for one answer: the challenge, or the challenge and incident stage. */
function answerKey(c: ChallengeDoc, stageIndex: number): string {
  const id = c._id.toString();
  return c.type === 'INCIDENT' ? `${id}:${stageIndex}` : id;
}

const halveIf = (xp: number, usedHint: boolean) =>
  usedHint ? Math.floor(xp / HINT_XP_DIVISOR) : xp;

type AnswerXPInput = {
  userId: string;
  session: { type: string; dailyDate?: string | null };
  challenge: ChallengeDoc;
  stageIndex: number;
  isCorrect: boolean;
  usedHint: boolean;
  /** When the attempt was recorded; tells a retry of this answer from an earlier earning. */
  attemptAt: Date;
};

/**
 * XP for one answer (scoring.md §2). Full XP the first time a challenge (or stage) is answered
 * correctly, ever. If it was already earned before this attempt, a Daily Kata pays review XP
 * once per Kata; other sessions pay nothing. Safe to call again for the same attempt: every
 * award goes through the ledger, and "earned before" is judged by the ledger row's timestamp,
 * so a retry never turns a first-correct into a review award.
 */
export async function answerXP(input: AnswerXPInput): Promise<number> {
  const { userId, session, challenge, stageIndex, isCorrect, usedHint, attemptAt } = input;
  if (!isCorrect || NO_XP_SESSION_TYPES.includes(session.type as SessionType)) return 0;
  const key = answerKey(challenge, stageIndex);
  const firstKey = `challenge:${key}`;
  const earlier = await XpEventModel.exists({
    userId,
    sourceKey: firstKey,
    createdAt: { $lt: attemptAt },
  });
  if (!earlier) {
    const full = XP_BY_DIFFICULTY[challenge.difficulty as 1 | 2 | 3];
    return awardXP(userId, firstKey, halveIf(full, usedHint));
  }
  if (session.type !== 'DAILY' || !session.dailyDate) return 0;
  return awardXP(userId, `review:${session.dailyDate}:${key}`, halveIf(REVIEW_XP, usedHint));
}

/**
 * The XP the ledger holds for this attempt: its first-correct row if created at or after the
 * attempt, else this Kata's review row. Lets a retry write the right `xpEarned` back onto the
 * attempt even when the award itself happened on the first try.
 */
export async function ownedXP(
  input: Omit<AnswerXPInput, 'isCorrect' | 'usedHint'>,
): Promise<number> {
  const { userId, session, challenge, stageIndex, attemptAt } = input;
  const key = answerKey(challenge, stageIndex);
  const keys = [`challenge:${key}`];
  if (session.type === 'DAILY' && session.dailyDate)
    keys.push(`review:${session.dailyDate}:${key}`);
  const rows = await XpEventModel.find({ userId, sourceKey: { $in: keys } })
    .select('sourceKey amount createdAt')
    .lean();
  const first = rows.find((r) => r.sourceKey === keys[0] && r.createdAt >= attemptAt);
  const review = rows.find((r) => r.sourceKey === keys[1]);
  return first?.amount ?? review?.amount ?? 0;
}
