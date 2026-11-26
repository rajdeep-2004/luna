import type { DuelSnapshot, DuelView } from '@luna/shared';

/** One player's line in a duel result: the score and, with a snapshot, each revealed question. */
export type PlayerLine = {
  correct: number;
  totalTimeMs: number;
  perQuestion?: { isCorrect: boolean; timeTakenMs: number; timedOut: boolean }[];
};

function lineFor(d: DuelView, userId: string | undefined): PlayerLine | null {
  const s = userId ? d.result?.score.find((x) => x.userId === userId) : undefined;
  if (!s) return null;
  const rounds = 'rounds' in d ? (d as DuelSnapshot).rounds : null;
  const perQuestion = rounds?.flatMap((r) => {
    const a = r.results.find((x) => x.userId === userId);
    return a ? [{ isCorrect: a.isCorrect, timeTakenMs: a.responseMs, timedOut: a.timedOut }] : [];
  });
  return {
    correct: s.correct,
    totalTimeMs: s.totalResponseMs,
    ...(perQuestion?.length ? { perQuestion } : {}),
  };
}

/** Both players' lines from the caller's side (live duels, D-052). */
export function duelLines(d: DuelView): { mine: PlayerLine | null; rivals: PlayerLine | null } {
  return { mine: lineFor(d, d.me.id), rivals: lineFor(d, d.rival?.id) };
}
