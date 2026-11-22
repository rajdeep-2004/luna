import type { MasteryPhase } from '@luna/shared';
import type { MoonPhaseName } from '../components';

/** Server mastery phase → the moon drawn for it (progression.md §2). */
export const MOON_FOR: Record<MasteryPhase, MoonPhaseName> = {
  NEW: 'new',
  CRESCENT: 'crescent',
  HALF: 'half',
  FULL: 'full',
};

export const MOON_LABEL: Record<MasteryPhase, string> = {
  NEW: 'Unexplored',
  CRESCENT: 'Practising',
  HALF: 'Developing',
  FULL: 'Strong',
};
