import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { PublicUser } from '@luna/shared';
import { ApiError, configureApi, queryClient, usersApi } from '../api';
import { configureSocket } from '../api/socket';

const TOKEN_KEY = 'luna.token';

/**
 * hydrating: reading the saved token on launch · signedOut: no valid session
 * signedIn: token + user · error: could not reach the server to check the saved token (offer Retry)
 */
type Status = 'hydrating' | 'signedOut' | 'signedIn' | 'error';

type AuthState = {
  status: Status;
  token: string | null;
  user: PublicUser | null;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: PublicUser) => Promise<void>;
  setUser: (user: PublicUser) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'hydrating',
  token: null,
  user: null,

  async hydrate() {
    set({ status: 'hydrating' });
    const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    if (!token) return set({ status: 'signedOut', token: null, user: null });
    set({ token });
    try {
      set({ user: await usersApi.me(), status: 'signedIn' });
    } catch (e) {
      // An expired or rejected token signs out (the client already called signOut on 401).
      if (e instanceof ApiError && e.code === 'UNAUTHORIZED') return;
      set({ status: 'error' });
    }
  },

  async signIn(token, user) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, user, status: 'signedIn' });
  },

  setUser: (user) => set({ user }),

  async signOut() {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    queryClient.clear();
    set({ token: null, user: null, status: 'signedOut' });
  },
}));

configureApi({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => {
    if (useAuthStore.getState().status !== 'signedOut') void useAuthStore.getState().signOut();
  },
});

configureSocket(() => useAuthStore.getState().token);
