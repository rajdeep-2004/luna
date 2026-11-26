import { DUEL_TIMEOUT_ANSWER, type DuelFormat } from '@luna/shared';
import type { ChallengeDoc } from '../../../models/Challenge';
import { AnswerAttemptModel } from '../../../models/AnswerAttempt';
import { DuelModel, type DuelDoc } from '../../../models/Duel';
import { SessionModel, type SessionDoc } from '../../../models/Session';
import { logger } from '../../../lib/logger';
import { challengesRepo } from '../../challenges/challenges.repository';
import { createSession, finishSession, recordAttempt } from '../../sessions/sessions.service';
import { payWinBonus } from '../duels.settle';
import { markFinalized } from './store';

/**
 * The bridge from live duels to the normal progress pipeline (D-052). Each player plays a DUEL
 * session on the duel's questions, so mastery, the revisit queue, first-correct XP and
 * achievements update exactly as in V1 duels and every other mode.
 */

const players = (d: DuelDoc) => [d.creatorId, d.opponentId].filter(Boolean).map(String);

/** The duel's challenges in order, keyed by index. Missing (deactivated) ones are skipped. */
export async function duelChallenges(d: DuelDoc): Promise<(ChallengeDoc | undefined)[]> {
  const found = await challengesRepo.findByIds(d.items.map((i) => i.challengeId));
  const byId = new Map(found.map((c) => [c._id.toString(), c]));
  return d.items.map((i) => byId.get(i.challengeId.toString()));
}

/** Both players' DUEL sessions. Idempotent: the `{duelId, userId}` unique index keeps one each. */
export async function ensureSessions(d: DuelDoc): Promise<void> {
  // Lean read: Mongoose wraps nested arrays; the session needs plain string[][].
  const lean = await DuelModel.findById(d._id).select('items').lean();
  if (!lean) return;
  const challenges = await duelChallenges(d);
  const picked = lean.items.flatMap((item, i) => {
    const challenge = challenges[i];
    return challenge
      ? [{ challenge, isRevisit: false, optionOrders: item.optionOrders as unknown as string[][] }]
      : [];
  });
  for (const userId of players(d)) {
    await createSession(userId, {
      type: 'DUEL',
      duelId: d._id.toString(),
      duelFormat: (d.format ?? 'CLASSIC') as DuelFormat,
      picked,
    });
  }
}

async function sessionFor(d: DuelDoc, userId: string): Promise<SessionDoc | null> {
  const find = () => SessionModel.findOne({ duelId: d._id, userId, type: 'DUEL' });
  const found = await find();
  if (found) return found;
  await ensureSessions(d);
  return find();
}

type StoredAnswer = {
  userId: { toString(): string };
  answer?: string | null;
  isCorrect: boolean;
  timedOut?: boolean;
  responseMs: number;
};

/**
 * Writes the AnswerAttempt (and its progress and XP) for one stored duel answer. Safe to call
 * again: the attempt's unique index turns a repeat into a no-op, so the reveal step re-runs it for
 * both answers and heals a crash between the duel answer and the attempt.
 */
export async function syncAttempt(d: DuelDoc, challenge: ChallengeDoc, a: StoredAnswer) {
  const session = await sessionFor(d, a.userId.toString());
  if (!session || session.status !== 'ACTIVE') return;
  await recordAttempt(a.userId.toString(), session, challenge, {
    stageIndex: 0,
    answer: a.answer ?? DUEL_TIMEOUT_ANSWER,
    isCorrect: a.isCorrect,
    usedHint: false,
    isTimeout: Boolean(a.timedOut),
    timeTakenMs: a.responseMs,
  });
}

/**
 * After a duel ends: pay the win bonus (claimed once), then complete both DUEL sessions so the
 * streak, summary and achievements settle. Every step is idempotent, so a concurrent call or a
 * retry after a crash (boot recovery) is safe; `finalizedAt` marks it done.
 */
export async function finalizeDuel(duelId: string, now: number): Promise<void> {
  const d = await DuelModel.findById(duelId);
  if (!d || d.finalizedAt || (d.phase !== 'COMPLETED' && d.phase !== 'ABANDONED')) return;
  await payWinBonus(d._id);
  for (const userId of players(d)) {
    const session = await SessionModel.findOne({ duelId: d._id, userId, type: 'DUEL' });
    if (!session || session.status !== 'ACTIVE') continue;
    const attempts = await AnswerAttemptModel.find({ sessionId: session._id })
      .select('challengeId topicSlug isCorrect timeTakenMs xpEarned')
      .lean();
    await finishSession(userId, session, attempts);
  }
  await markFinalized(d._id, now);
  logger.info({ duelId, endReason: d.endReason }, 'duel finalized');
}
