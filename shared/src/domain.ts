/** Domain constants shared by the app and the server. Values come from docs/product/. */
export const TOPIC_SLUGS = [
  'js-async',
  'http-apis',
  'databases',
  'caching-queues',
  'debugging-prod',
] as const;
export type TopicSlug = (typeof TOPIC_SLUGS)[number];

export const AVATAR_IDS = [
  'kitsune',
  'tanuki',
  'oni',
  'tengu',
  'neko',
  'ryu',
  'usagi',
  'kappa',
] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const CHALLENGE_TYPES = ['TRACE', 'BUG_HUNT', 'ENGINEER_CHOICE', 'INCIDENT'] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

/** The single-challenge kinds a player can pick as a round's mode in Explore (D-039). */
export const PRACTICE_MODES = ['TRACE', 'BUG_HUNT', 'ENGINEER_CHOICE'] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export const DIFFICULTIES = [1, 2, 3] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const SESSION_TYPES = [
  'PRACTICE',
  'INCIDENT',
  'BASELINE',
  'DAILY',
  'CHECKPOINT',
  'DUEL',
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const MASTERY_PHASES = ['NEW', 'CRESCENT', 'HALF', 'FULL'] as const;
export type MasteryPhase = (typeof MASTERY_PHASES)[number];
