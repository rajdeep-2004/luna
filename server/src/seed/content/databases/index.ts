import type { ChallengeSeed } from '../../schema';
import { DATABASES_TRACE } from './trace';
import { DATABASES_BUG_HUNT } from './bugHunt';
import { DATABASES_CHOICE } from './choice';
import { DATABASES_INCIDENTS } from './incidents';

/** Databases topic: 54 singles (Trace, Bug Hunt, Choice × 3 levels × 6) and 4 incidents. */
export const DATABASES: ChallengeSeed[] = [
  ...DATABASES_TRACE,
  ...DATABASES_BUG_HUNT,
  ...DATABASES_CHOICE,
  ...DATABASES_INCIDENTS,
];
