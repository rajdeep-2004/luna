import type { PublicOption, PublicStage, SessionItemView, SessionView } from '@luna/shared';

/** What the player is looking at right now: one challenge, or one stage of an incident. */
export type Step = {
  item: SessionItemView;
  stageIndex: number;
  /** Incident only: the stage being answered. */
  stage: PublicStage | null;
  prompt: string;
  options: PublicOption[];
  hasHint: boolean;
};

/**
 * The first unfinished item and, inside it, the first unanswered stage. This is what lets a closed app resume
 * exactly where it stopped: the server holds the truth, the client only derives the position.
 * Returns null when everything is answered.
 */
export function findStep(session: SessionView): Step | null {
  const item = [...session.items].sort((a, b) => a.order - b.order).find((i) => !i.isComplete);
  if (!item) return null;
  const stageIndex = item.attempts.length;
  if (item.challenge.type === 'INCIDENT') {
    const stage = item.revealedStages[stageIndex] ?? null;
    if (!stage) return null;
    return {
      item,
      stageIndex,
      stage,
      prompt: stage.prompt,
      options: stage.options,
      hasHint: stage.hasHint,
    };
  }
  return {
    item,
    stageIndex: 0,
    stage: null,
    prompt: item.challenge.prompt,
    options: item.challenge.options ?? [],
    hasHint: item.challenge.hasHint,
  };
}

export function answeredCount(session: SessionView): number {
  return session.items.reduce((n, i) => n + i.attempts.length, 0);
}

export function progressOf(session: SessionView): number {
  return session.totalAnswers > 0 ? answeredCount(session) / session.totalAnswers : 0;
}

/** game-modes.md §4: the duel countdown. The server enforces the same limit. */
export const DUEL_TIMER_MS = 60_000;
/** How long a duel shows ✓/✗ before moving on by itself. */
export const DUEL_VERDICT_MS = 900;
