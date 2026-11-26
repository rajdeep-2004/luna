/**
 * Game rules as data. Every number here comes from docs/product/ (approved 2026-11-22).
 * Change a rule here, not in services.
 */
import {
  type ChallengeType,
  type Difficulty,
  type DuelFormat,
  type SessionType,
} from '@luna/shared';

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = { 1: 10, 2: 15, 3: 20 };
/** scoring.md §2: a correct answer on content already earned, inside the Daily Kata only. */
export const REVIEW_XP = 2;
/** Measurements, not play: no answer XP and no bonuses (scoring.md §2 rule 4). */
export const NO_XP_SESSION_TYPES: readonly SessionType[] = ['BASELINE', 'CHECKPOINT'];

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

/** game-modes.md §2. Slot order is the play order; the incident closes the Kata. */
export const DAILY_KATA_SLOTS = [
  'TRACE',
  'BUG_HUNT',
  'ENGINEER_CHOICE',
  'ENGINEER_CHOICE',
  'INCIDENT',
] as const;

/** Daily Kata slot scoring (lower wins): unseen dominates, then difficulty fit, then variety (D-028). */
export const KATA_WEIGHTS = {
  seen: 10,
  preferred: -0.5,
  weakest: -0.75,
  repeatTopic: 0.75,
  jitter: 0.5,
} as const;

/** Sessions whose completion can pay the first-incident bonus (not baseline or checkpoint). */
export const INCIDENT_BONUS_SESSION_TYPES: readonly SessionType[] = ['INCIDENT', 'DAILY'];

/** benchmarks.md §1: a Checkpoint unlocks after every N completed Daily Katas (active days). */
export const CHECKPOINT = { everyKatas: 7, difficulty: 2 } as const;

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

/** competition.md §1: the Dojo Board shows the top 50 of the UTC week, paginated. */
export const BOARD = { maxRank: 50, defaultPageSize: 20, podium: 3 } as const;

/** Profile session history page size (`GET /users/me/sessions`). */
export const HISTORY = { defaultPageSize: 20 } as const;

/** competition.md §2. Slot order is the play order, the same for both players. */
/** `n` slots repeating `kinds` in order. */
function cycleKinds(kinds: ChallengeType[], n: number): ChallengeType[] {
  return Array.from({ length: n }, (_, i) => kinds[i % kinds.length]!);
}

export const DUEL = {
  /**
   * Preferred challenge kind per question, by format. Classic keeps its fixed slots. Blitz and
   * Sudden Death cycle the kinds; a slot falls back to any single challenge when its kind runs out.
   */
  slotsByFormat: {
    CLASSIC: ['TRACE', 'BUG_HUNT', 'ENGINEER_CHOICE', 'ENGINEER_CHOICE', 'ENGINEER_CHOICE'],
    BLITZ: cycleKinds(['TRACE', 'BUG_HUNT', 'ENGINEER_CHOICE'], 10),
    SUDDEN_DEATH: cycleKinds(['ENGINEER_CHOICE', 'TRACE', 'BUG_HUNT'], 10),
  } satisfies Record<DuelFormat, readonly ChallengeType[]>,
  codeLength: 6,
  codeRetries: 5,
  // Timers and grace per format live in DUEL_FORMAT_RULES (shared), so the app reads the same numbers.
  expiryMs: 48 * 60 * 60 * 1000,
  maxOpenPerUser: 5,
  winBonusXP: 10,
  winBonusesPerDay: 3,
  finishedListSize: 20,
  /** Bounds the "your turn" and "waiting" lists; a user has at most 5 open duels as creator. */
  activeListMax: 50,
  /** Penalty per earlier pick from the same topic, so a duel mixes topics. */
  repeatTopicPenalty: 2,
  /** How long a winner's completion waits for a concurrent bonus payment (D-033). */
  bonusWait: { tries: 10, delayMs: 50 },
} as const;

/** Practice, incident and checkpoint picks (lower score wins): unseen first, random among equals. */
export const PICK_WEIGHTS = { seen: 10, jitter: 0.5 } as const;

/**
 * V2 content targets and audit thresholds (docs/v2/plan.md §4, benchmarks.md §4). Read only by the
 * dev audit tool (`npm run audit:content -w server`), never by the running server.
 */
export const CONTENT_TARGETS = {
  /** Per topic × single type × difficulty. */
  singlesPerCell: 6,
  /** Per topic, by difficulty: 1 beginner, 2 intermediate, 1 advanced. */
  incidentsByDifficulty: { 1: 1, 2: 2, 3: 1 } as Record<Difficulty, number>,
  /** Warn when one answer position (a–d) holds more than this share of a topic's 4-option questions. */
  maxAnswerPositionShare: 0.4,
  /** Warn when the correct option is strictly the longest in more than this share of a topic's questions. */
  maxLongestCorrectShare: 0.5,
} as const;

/** progression.md §7. Awarded once each; no XP. `target` is the count the condition needs. */
export const ACHIEVEMENTS = [
  {
    key: 'FIRST_COMMIT',
    name: 'First Strike',
    condition: 'Complete your first challenge',
    icon: '⚔️',
    target: 1,
  },
  {
    key: 'BUG_HUNTER',
    name: 'Bug Slayer',
    condition: '10 Bug Hunt answers correct',
    icon: '🐞',
    target: 10,
  },
  {
    key: 'DAILY_GRINDER',
    name: 'Seven Katas',
    condition: 'Complete 7 Daily Katas',
    icon: '🏮',
    target: 7,
  },
  {
    key: 'INCIDENT_COMMANDER',
    name: 'Incident Commander',
    condition: 'Complete 5 Incident Rooms',
    icon: '🚨',
    target: 5,
  },
  {
    key: 'PERFECT_RUN',
    name: 'Kanpeki',
    condition: 'A Daily Kata with every answer correct',
    icon: '🌕',
    target: 1,
  },
] as const;
