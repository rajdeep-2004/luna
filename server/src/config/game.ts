/**
 * Game rules as data. Every number here comes from docs/product/ (approved 2026-11-22).
 * Change a rule here, not in services.
 */
import type { Difficulty } from '@luna/shared';

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = { 1: 10, 2: 15, 3: 20 };
/** A hint halves the XP for that answer, rounded down (scoring.md §2). */
export const HINT_XP_DIVISOR = 2;

/** scoring.md §3. Each bonus is a ledger entry under a unique key, so it can never be paid twice. */
export const BONUS_XP = {
  firstIncident: 25,
  dailyKata: 15,
  /** On top of the Kata bonus when every answer in the Kata is correct. */
  perfectKata: 10,
} as const;

/** scoring.md §3: paid once per streak run, keyed `streak<days>:<runStartDate>`. */
export const STREAK_MILESTONES = [
  { days: 3, xp: 10 },
  { days: 7, xp: 25 },
  { days: 30, xp: 50 },
] as const;

/** progression.md §1: 10 samurai ranks. `minXP` is total XP needed. */
export const LEVELS = [
  { level: 1, name: 'Deshi', kanji: '弟子', minXP: 0 },
  { level: 2, name: 'Ashigaru', kanji: '足軽', minXP: 50 },
  { level: 3, name: 'Ronin', kanji: '浪人', minXP: 150 },
  { level: 4, name: 'Bushi', kanji: '武士', minXP: 300 },
  { level: 5, name: 'Samurai', kanji: '侍', minXP: 500 },
  { level: 6, name: 'Hatamoto', kanji: '旗本', minXP: 750 },
  { level: 7, name: 'Kenshi', kanji: '剣士', minXP: 1050 },
  { level: 8, name: 'Sensei', kanji: '先生', minXP: 1400 },
  { level: 9, name: 'Daimyo', kanji: '大名', minXP: 1800 },
  { level: 10, name: 'Shogun', kanji: '将軍', minXP: 2300 },
] as const;

export const SESSION = {
  practiceSize: 5,
  /** Server-measured time per answer is capped so an idle phone doesn't skew stats. */
  maxAnswerTimeMs: 10 * 60 * 1000,
  recentResultsWindow: 10,
} as const;

/** progression.md §2: moon-phase mastery, judged on the rolling `recentResultsWindow`. */
export const MASTERY = {
  minAnswers: 5,
  fullMinAnswers: 10,
  /** Below this recent accuracy: crescent. */
  crescentBelow: 0.5,
  /** At or above this (plus an advanced correct): full moon. */
  fullAtLeast: 0.8,
} as const;

/** progression.md §4: per-topic difficulty moves after 5 answers, then the window resets. */
export const ADAPTIVE = { window: 5, upAtCorrect: 4, downAtCorrect: 2, min: 1, max: 3 } as const;

/** progression.md §5: light spaced repetition of missed single challenges. */
export const REVISIT = {
  /** A miss can come back only after this many other answers. */
  minOtherAnswers: 3,
  /** A revisit answered wrong waits this many local days. */
  retryWaitDays: 2,
  perKata: 2,
  perPractice: 1,
  /** Bounds the queue read; the bank is ~60 challenges. */
  maxScan: 100,
} as const;

/** scoring.md §5 grade bands, by accuracy. */
export const GRADES = [
  { grade: 'KANPEKI', minAccuracy: 1 },
  { grade: 'SUGOI', minAccuracy: 0.8 },
  { grade: 'YOSHI', minAccuracy: 0.5 },
  { grade: 'MADA_MADA', minAccuracy: 0 },
] as const;

/** A topic counts as weak in a session summary below this accuracy. */
export const WEAK_TOPIC_ACCURACY = 0.5;

/** Starting difficulty per topic from the onboarding segment (users.md §3). */
export const START_DIFFICULTY = { beginner: 1, intermediate: 2, advanced: 2 } as const;

export function levelForXP(totalXP: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) if (totalXP >= l.minXP) current = l;
  return current;
}
