import type { ProgressView } from '@luna/shared';

/** 0..1 through the current rank: how closed the ensō is. 1 at the top rank. */
export function rankProgress(level: ProgressView['level']): number {
  if (level.nextLevelXP === null) return 1;
  const span = level.nextLevelXP - level.levelStartXP;
  return span > 0 ? (level.totalXP - level.levelStartXP) / span : 1;
}
