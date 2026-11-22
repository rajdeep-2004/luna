import type {
  AnswerResult,
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
