import type {
  AuthResponse,
  LoginRequest,
  PublicUser,
  RegisterRequest,
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
};

export const topicsApi = {
  list: () => api.get<Topic[]>('/topics'),
};
