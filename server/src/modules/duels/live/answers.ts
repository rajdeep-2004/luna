import type { DuelAnswerPayload, DuelAnswerReceipt, DuelFormat } from '@luna/shared';
import { conflict, isDuplicateKey, notFound } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import { DuelModel, type DuelDoc } from '../../../models/Duel';
import { DuelAnswerModel } from '../../../models/DuelAnswer';
import { evaluate } from '../../sessions/sessions.evaluator';
import { challengesRepo } from '../../challenges/challenges.repository';
import { responseTime, type Timings } from './engine';
import { seatOf } from './store';
import { syncAttempt } from './progress';

type Stored = { index: number; responseMs: number; timedOut?: boolean | null };
const receipt = (a: Stored): DuelAnswerReceipt => ({
  index: a.index,
  responseMs: a.responseMs,
  timedOut: Boolean(a.timedOut),
});

function reject(duelId: string, userId: string, index: number, reason: string, message: string) {
  logger.info({ duelId, userId, index, reason }, 'duel answer rejected');
  return conflict(message);
}

/**
 * One player's answer to the current question (D-052). Accepted only for the current index, in the
 * QUESTION phase, until `deadlineAt + networkGraceMs`, and only once: the unique index on
 * `(duelId, userId, index)` makes a repeat return the stored result (even after the reveal), and a
 * timeout written at the deadline wins over an answer that arrives after it.
 */
export async function submitLiveAnswer(
  userId: string,
  p: DuelAnswerPayload,
  now: number,
  t: Timings,
): Promise<{ receipt: DuelAnswerReceipt; duel: DuelDoc; fresh: boolean }> {
  const duel = await DuelModel.findById(p.duelId);
  if (!duel || !seatOf(duel, userId)) throw notFound('Duel');
  const prior = await DuelAnswerModel.findOne({ duelId: duel._id, userId, index: p.index }).lean();
  if (prior) return { receipt: receipt(prior), duel, fresh: false };

  if (duel.phase !== 'QUESTION' || duel.currentIndex !== p.index)
    throw reject(p.duelId, userId, p.index, 'NOT_CURRENT', 'This question is closed');
  if (
    !duel.deadlineAt ||
    !duel.questionStartedAt ||
    now > duel.deadlineAt.getTime() + t.networkGraceMs
  )
    throw reject(p.duelId, userId, p.index, 'LATE', 'Time is up for this question');

  const item = duel.items[p.index];
  const challenge = item ? await challengesRepo.findById(item.challengeId) : null;
  if (!challenge) throw notFound('Question');
  // Throws VALIDATION_ERROR for an unknown option or line, before anything is stored.
  const { isCorrect } = evaluate(challenge, 0, p.answer);
  const timerMs = t.questionMs[(duel.format ?? 'CLASSIC') as DuelFormat];
  const row = {
    duelId: duel._id,
    userId,
    index: p.index,
    answer: p.answer,
    isCorrect,
    timedOut: false,
    responseMs: responseTime(duel.questionStartedAt, now, timerMs),
    receivedAt: new Date(now),
  };
  try {
    await DuelAnswerModel.create(row);
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    // Lost to a double submit or to the deadline's timeout: report what is stored.
    const stored = await DuelAnswerModel.findOne({
      duelId: duel._id,
      userId,
      index: p.index,
    }).lean();
    if (stored) return { receipt: receipt(stored), duel, fresh: false };
    throw err;
  }
  await syncAttempt(duel, challenge, row);
  return { receipt: receipt(row), duel, fresh: true };
}
