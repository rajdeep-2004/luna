import { create } from 'zustand';

/** True while at least one request has been slow enough to suggest a cold-starting server. */
export const useConnectionStore = create<{ waking: boolean; setWaking: (waking: boolean) => void }>(
  (set) => ({
    waking: false,
    setWaking: (waking) => set({ waking }),
  }),
);
