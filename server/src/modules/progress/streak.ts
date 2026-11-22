import { addDays } from '../../lib/time';

export type StreakState = { current: number; longest: number; lastDate: string | null };
export type StreakResult = StreakState & { extended: boolean };

/**
 * progression.md §6, pure. `today` is the user's local date (`YYYY-MM-DD`).
 * Same day → no change; the day after the last Kata → +1; any gap → 1.
 * A `lastDate` later than `today` (the user moved their timezone west) is also "no change",
 * so switching timezones can never add a day.
 */
export function nextStreak(prev: StreakState, today: string): StreakResult {
  if (prev.lastDate !== null && prev.lastDate >= today) return { ...prev, extended: false };
  const current = prev.lastDate === addDays(today, -1) ? prev.current + 1 : 1;
  return { current, longest: Math.max(prev.longest, current), lastDate: today, extended: true };
}

/** First day of the current run; keys milestone bonuses so each is paid once per run. */
export function runStartDate(current: number, lastDate: string): string {
  return addDays(lastDate, -(current - 1));
}

export type StreakStatus = { current: number; longest: number; doneToday: boolean; wentOut: boolean };

/**
 * What the lantern shows now. The stored streak only changes when a Kata completes, so a run
 * that broke (last Kata before yesterday) still holds its old number: report it as 0 and
 * flag `wentOut` for the kind "Light it again today" message.
 */
export function streakStatus(state: StreakState, today: string): StreakStatus {
  const doneToday = state.lastDate !== null && state.lastDate >= today;
  const alive = doneToday || state.lastDate === addDays(today, -1);
  return {
    current: alive ? state.current : 0,
    longest: state.longest,
    doneToday,
    wentOut: !alive && state.current > 0,
  };
}
