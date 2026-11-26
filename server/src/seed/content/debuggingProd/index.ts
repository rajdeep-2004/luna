import type { ChallengeSeed } from '../../schema';
import { DEBUGGING_PROD_TRACE } from './trace';
import { DEBUGGING_PROD_BUG_HUNT } from './bugHunt';
import { DEBUGGING_PROD_CHOICE } from './choice';
import { DEBUGGING_PROD_INCIDENTS } from './incidents';

/** Debugging & production topic: 54 singles (Trace, Bug Hunt, Choice × 3 levels × 6) and 4 incidents. */
export const DEBUGGING_PROD: ChallengeSeed[] = [
  ...DEBUGGING_PROD_TRACE,
  ...DEBUGGING_PROD_BUG_HUNT,
  ...DEBUGGING_PROD_CHOICE,
  ...DEBUGGING_PROD_INCIDENTS,
];
