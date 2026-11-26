import type { ChallengeSeed } from '../../schema';
import { CACHING_QUEUES_TRACE } from './trace';
import { CACHING_QUEUES_BUG_HUNT } from './bugHunt';
import { CACHING_QUEUES_CHOICE } from './choice';
import { CACHING_QUEUES_INCIDENTS } from './incidents';

/** Caching & queues topic: 54 singles (Trace, Bug Hunt, Choice × 3 levels × 6) and 4 incidents. */
export const CACHING_QUEUES: ChallengeSeed[] = [
  ...CACHING_QUEUES_TRACE,
  ...CACHING_QUEUES_BUG_HUNT,
  ...CACHING_QUEUES_CHOICE,
  ...CACHING_QUEUES_INCIDENTS,
];
