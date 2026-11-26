import { z } from 'zod';
import type { AvatarId, SessionType, TopicSlug } from './domain';
import type { SessionSummary } from './sessions';

/** Another player, as anyone else may see them: no email, no ids beyond the user id. */
export type PlayerView = {
  id: string;
  username: string;
  avatarId: AvatarId;
  rankName: string;
};

/** A cursor-paginated list. `nextCursor` is null on the last page. */
export type Page<T> = { items: T[]; nextCursor: string | null };

export const PageQuery = z.object({
  cursor: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
export type PageQuery = z.infer<typeof PageQuery>;

// ---- Dojo Board (competition.md §1) ----

export type BoardRow = {
  rank: number;
  player: PlayerView;
  weeklyXP: number;
  /** 1–3 when this player was in last week's top 3. */
  lastWeekPlace: 1 | 2 | 3 | null;
};

export type BoardView = {
  weekKey: string;
  /** Next Monday 00:00 UTC. */
  resetsAt: string;
  rows: BoardRow[];
  nextCursor: string | null;
  /** The caller's own row; null when they have no XP this week. */
  me: BoardRow | null;
};

// ---- Achievements (progression.md §7) ----

export const ACHIEVEMENT_KEYS = [
  'FIRST_COMMIT',
  'BUG_HUNTER',
  'DAILY_GRINDER',
  'INCIDENT_COMMANDER',
  'PERFECT_RUN',
] as const;
export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];

export type AchievementView = {
  key: AchievementKey;
  name: string;
  condition: string;
  icon: string;
  /** Null while locked. */
  awardedAt: string | null;
};

// ---- Session history ----

export type SessionHistoryItem = {
  id: string;
  type: SessionType;
  topicSlug: TopicSlug | null;
  completedAt: string;
  correctAnswers: number;
  totalAnswers: number;
  grade: SessionSummary['grade'];
  xpEarned: number;
};

// ---- Duels (competition.md §2) ----

/** 6 characters from an alphabet without 0/O/1/I. Lower case is accepted and upper-cased. */
export const DUEL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const DuelCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/, 'Enter the 6-character duel code');

export const JoinDuelRequest = z.object({ code: DuelCode });
export type JoinDuelRequest = z.infer<typeof JoinDuelRequest>;

/**
 * The answer recorded for a question nobody answered before the deadline. Only the server writes it
 * (live duels, D-052); a client can't submit it.
 */
export const DUEL_TIMEOUT_ANSWER = 'TIMEOUT';

/** game-modes.md §4: the per-challenge Classic duel countdown. */
export const DUEL_TIMER_MS = 60_000;

/** The three blades (D-039). Classic is the original duel; the others arrived with P7. */
export const DUEL_FORMATS = ['CLASSIC', 'BLITZ', 'SUDDEN_DEATH'] as const;
export type DuelFormat = (typeof DUEL_FORMATS)[number];

/**
 * Size and clock of each format, read by the server engine and the app. Sudden Death ends at the
 * first question where exactly one player is wrong (D-052), so `questions` is its maximum.
 */
export const DUEL_FORMAT_RULES: Record<
  DuelFormat,
  { questions: number; timerMs: number; endsOnMiss: boolean }
> = {
  CLASSIC: { questions: 5, timerMs: DUEL_TIMER_MS, endsOnMiss: false },
  BLITZ: { questions: 10, timerMs: 10_000, endsOnMiss: false },
  SUDDEN_DEATH: { questions: 10, timerMs: 30_000, endsOnMiss: true },
};

/** `POST /duels`. The body is optional; an empty one makes a Classic duel. */
export const CreateDuelRequest = z.object({ format: z.enum(DUEL_FORMATS).default('CLASSIC') });
export type CreateDuelRequest = z.infer<typeof CreateDuelRequest>;
