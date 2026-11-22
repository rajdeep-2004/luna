import { create } from 'zustand';

/**
 * What the Dojo has already shown in this app session, so its moments play once: the "coming home"
 * shoji opening on launch, and the lantern relight only when the streak really grew since last seen.
 * In memory on purpose: a fresh launch is a fresh homecoming.
 */
type DojoMoments = {
  homecomingPlayed: boolean;
  seenStreak: number | null;
  markHomecoming: () => void;
  setSeenStreak: (n: number) => void;
};

export const useDojoMoments = create<DojoMoments>((set) => ({
  homecomingPlayed: false,
  seenStreak: null,
  markHomecoming: () => set({ homecomingPlayed: true }),
  setSeenStreak: (seenStreak) => set({ seenStreak }),
}));
