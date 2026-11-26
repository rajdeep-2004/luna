import type {
  AchievementView,
  AnswerResult,
  BoardView,
  DuelFormat,
  DuelSnapshot,
  DuelView,
  Page,
  SessionHistoryItem,
  AuthResponse,
  DailyView,
  HintRequest,
  HintResult,
  LoginRequest,
  ProgressView,
  PublicUser,
  RegisterRequest,
  SessionSummary,
  SessionView,
  StartSessionRequest,
  SubmitAnswerRequest,
  Topic,
  UpdateMeRequest,
} from '@luna/shared';
import { api } from './client';

export const authApi = {
  register: (body: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', body, { auth: false }),
  login: (body: LoginRequest) => api.post<AuthResponse>('/auth/login', body, { auth: false }),
};

export const usersApi = {
  me: () => api.get<PublicUser>('/users/me'),
  updateMe: (body: UpdateMeRequest) => api.patch<PublicUser>('/users/me', body),
  progress: () => api.get<ProgressView>('/users/me/progress'),
  achievements: () => api.get<AchievementView[]>('/users/me/achievements'),
  sessions: (cursor?: string) =>
    api.get<Page<SessionHistoryItem>>(`/users/me/sessions${cursorQuery(cursor)}`),
};

const cursorQuery = (cursor?: string) => (cursor ? `?cursor=${encodeURIComponent(cursor)}` : '');

export const leaderboardApi = {
  weekly: (cursor?: string) => api.get<BoardView>(`/leaderboard/weekly${cursorQuery(cursor)}`),
};

export const duelsApi = {
  /** Newest first; live duels and finished ones (D-052). */
  list: (cursor?: string) => api.get<Page<DuelView>>(`/duels${cursorQuery(cursor)}`),
  create: (format: DuelFormat = 'CLASSIC') => api.post<DuelSnapshot>('/duels', { format }),
  join: (code: string) => api.post<DuelSnapshot>('/duels/join', { code }),
  get: (id: string) => api.get<DuelSnapshot>(`/duels/${id}`),
  cancel: (id: string) => api.post<DuelSnapshot>(`/duels/${id}/cancel`, {}),
};

export const dailyApi = {
  /** Builds today's Kata on the first call of the day; later calls resume it or return its result. */
  today: () => api.get<DailyView>('/daily'),
};

export const topicsApi = {
  list: () => api.get<Topic[]>('/topics'),
};

export const sessionsApi = {
  start: (body: StartSessionRequest) => api.post<SessionView>('/sessions', body),
  get: (id: string) => api.get<SessionView>(`/sessions/${id}`),
  answer: (id: string, body: SubmitAnswerRequest) =>
    api.post<AnswerResult>(`/sessions/${id}/answers`, body),
  hint: (id: string, body: HintRequest) => api.post<HintResult>(`/sessions/${id}/hint`, body),
  complete: (id: string) => api.post<SessionSummary>(`/sessions/${id}/complete`, {}),
};
