import {
  ENDED_PHASES,
  type DuelEndReason,
  type DuelFormat,
  type DuelPhase,
  type DuelResultView,
  type DuelRevealEvent,
  type DuelRoundResult,
  type DuelSeatView,
  type DuelSnapshot,
  type DuelView,
} from '@luna/shared';
import type { ChallengeDoc } from '../../models/Challenge';
import type { DuelDoc } from '../../models/Duel';
import { DuelAnswerModel } from '../../models/DuelAnswer';
import { toPublicChallenge } from '../challenges/challenges.projection';
import { timeoutEvaluation } from '../sessions/sessions.evaluator';
import { usersRepo } from '../users/users.repository';
import { toPlayerView } from '../users/users.mapper';
import { scoreOf } from './live/engine';
import { duelChallenges } from './live/progress';

/**
 * Every shape a duel leaves the server in (D-052). Answer keys appear only inside revealed rounds
 * (`roundReveal`), built from the challenge after both answered or the time ran out.
 */

type AnswerRow = {
  userId: string;
  index: number;
  answer: string | null;
  isCorrect: boolean;
  responseMs: number;
  timedOut: boolean;
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const isEnded = (phase: DuelPhase) => (ENDED_PHASES as readonly DuelPhase[]).includes(phase);
const ordersOf = (d: DuelDoc, index: number) =>
  (d.items[index]?.optionOrders ?? []) as unknown as string[][];

export async function answersOf(d: DuelDoc): Promise<AnswerRow[]> {
  const rows = await DuelAnswerModel.find({ duelId: d._id }).sort({ index: 1 }).lean();
  return rows.map((a) => ({
    userId: a.userId.toString(),
    index: a.index,
    answer: a.answer ?? null,
    isCorrect: a.isCorrect,
    responseMs: a.responseMs,
    timedOut: Boolean(a.timedOut),
  }));
}

const playersOf = (d: DuelDoc) => [d.creatorId.toString(), d.opponentId?.toString() ?? ''];

export function scores(d: DuelDoc, answers: AnswerRow[]) {
  return playersOf(d)
    .filter(Boolean)
    .map((u) => scoreOf(u, answers));
}

/** The reveal for one question: both results, the key and the explanation (this question only). */
export function roundReveal(
  d: DuelDoc,
  index: number,
  challenge: ChallengeDoc,
  answers: AnswerRow[],
): Omit<DuelRevealEvent, 'duelId'> {
  const key = timeoutEvaluation(challenge, 0);
  const results: DuelRoundResult[] = answers
    .filter((a) => a.index === index)
    .map(({ index: _i, ...a }) => a);
  return {
    index,
    correctAnswer: key.correctAnswer,
    explanation: key.explanation,
    misconception: key.misconception,
    ...(key.optionFeedback ? { optionFeedback: key.optionFeedback } : {}),
    results,
    score: scores(
      d,
      answers.filter((a) => a.index <= index),
    ),
  };
}

function resultView(d: DuelDoc, answers: AnswerRow[] | null): DuelResultView | null {
  if (!isEnded(d.phase as DuelPhase)) return null;
  const fromStored = playersOf(d)
    .filter(Boolean)
    .map((userId, i) => {
      const r = i === 0 ? d.creatorResult : d.opponentResult;
      return { userId, correct: r?.correct ?? 0, totalResponseMs: r?.totalTimeMs ?? 0 };
    });
  return {
    endReason: (d.endReason ?? 'CANCELLED') as DuelEndReason,
    winnerId: d.winnerId?.toString() ?? null,
    // Live duels can rebuild the score from answers; V1 rows only have the stored results.
    score: answers?.length ? scores(d, answers) : fromStored,
    winBonusXP: d.winBonusXP,
  };
}

type Players = Awaited<ReturnType<typeof usersRepo.findPlayers>>;

function baseView(
  userId: string,
  d: DuelDoc,
  players: Players,
  answers: AnswerRow[] | null,
): DuelView {
  const player = (id: { toString(): string } | null | undefined) => {
    const p = id ? players.find((x) => x._id.toString() === id.toString()) : undefined;
    return p ? toPlayerView(p) : null;
  };
  const isCreator = d.creatorId.toString() === userId;
  return {
    id: d._id.toString(),
    code: d.code,
    format: (d.format ?? 'CLASSIC') as DuelFormat,
    phase: d.phase as DuelPhase,
    role: isCreator ? 'CREATOR' : 'OPPONENT',
    me: player(userId)!,
    rival: player(isCreator ? d.opponentId : d.creatorId),
    total: d.items.length,
    createdAt: d.createdAt.toISOString(),
    lobbyExpiresAt: iso(d.lobbyExpiresAt),
    result: resultView(d, answers),
  };
}

/** History rows with one batched player read (no N+1). Scores come from the stored results. */
export async function toViews(userId: string, duels: DuelDoc[]): Promise<DuelView[]> {
  if (!duels.length) return [];
  const ids = duels.flatMap((d) => [d.creatorId, ...(d.opponentId ? [d.opponentId] : [])]);
  const players = await usersRepo.findPlayers(ids);
  return duels.map((d) => baseView(userId, d, players, null));
}

/** Which rounds are revealed: before the current one, plus the current one once it is revealed. */
function revealedThrough(d: DuelDoc): number {
  const phase = d.phase as DuelPhase;
  if (phase === 'REVEAL' || isEnded(phase)) return d.currentIndex;
  if (phase === 'QUESTION') return d.currentIndex - 1;
  return -1;
}

/** The full screen state for one player: `GET /duels/:id` and the `duel:state` event. */
export async function toSnapshot(userId: string, d: DuelDoc, now: number): Promise<DuelSnapshot> {
  const ids = [d.creatorId, ...(d.opponentId ? [d.opponentId] : [])];
  const [players, answers] = await Promise.all([usersRepo.findPlayers(ids), answersOf(d)]);
  const playing = ['COUNTDOWN', 'QUESTION', 'REVEAL'].includes(d.phase);
  const challenges = answers.length || playing ? await duelChallenges(d) : [];
  const isCreator = d.creatorId.toString() === userId;
  const seat = (s: DuelDoc['creatorSeat'] | null | undefined): DuelSeatView | null =>
    s ? { connected: s.connected, ready: Boolean(s.readyAt) } : null;
  const rivalId = (isCreator ? d.opponentId : d.creatorId)?.toString();
  const i = d.currentIndex;
  const showQuestion = d.phase === 'QUESTION' || d.phase === 'REVEAL';
  const current = showQuestion ? challenges[i] : undefined;
  const mine = answers.find((a) => a.userId === userId && a.index === i);
  const through = revealedThrough(d);
  const rounds = challenges.flatMap((c, idx) =>
    c && idx <= through && answers.some((a) => a.index === idx)
      ? [roundReveal(d, idx, c, answers)]
      : [],
  );
  return {
    ...baseView(userId, d, players, answers),
    seats: {
      me: seat(isCreator ? d.creatorSeat : d.opponentSeat) ?? { connected: false, ready: false },
      rival: d.opponentId ? seat(isCreator ? d.opponentSeat : d.creatorSeat) : null,
    },
    currentIndex: i,
    question: current ? toPublicChallenge(current, ordersOf(d, i)) : null,
    questionStartedAt: showQuestion ? iso(d.questionStartedAt) : null,
    deadlineAt: showQuestion ? iso(d.deadlineAt) : null,
    phaseEndsAt: iso(d.phaseEndsAt),
    serverNow: new Date(now).toISOString(),
    myAnswer:
      d.phase === 'QUESTION' && mine
        ? { index: i, responseMs: mine.responseMs, timedOut: mine.timedOut }
        : null,
    rivalAnswered:
      d.phase === 'QUESTION' && answers.some((a) => a.userId === rivalId && a.index === i),
    rounds,
  };
}
