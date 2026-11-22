import { useReducedMotion } from 'react-native-reanimated';

/**
 * The one Reduce Motion gate (DESIGN.md: Motion). Every authored moment checks it and falls back
 * to a crossfade or an instant change. Haptics stay on either way.
 */
export const useReduceMotion = (): boolean => useReducedMotion();

/** Durations from DESIGN.md: Motion. */
export const DURATION = { micro: 80, short: 200, medium: 400, long: 700 } as const;
