import type { ChallengeSeed } from '../../schema';
import { HTTP_APIS_TRACE } from './trace';
import { HTTP_APIS_BUG_HUNT } from './bugHunt';
import { HTTP_APIS_CHOICE } from './choice';
import { HTTP_APIS_INCIDENTS } from './incidents';

/** HTTP & APIs topic: 54 singles (Trace, Bug Hunt, Choice × 3 levels × 6) and 4 incidents. */
export const HTTP_APIS: ChallengeSeed[] = [
  ...HTTP_APIS_TRACE,
  ...HTTP_APIS_BUG_HUNT,
  ...HTTP_APIS_CHOICE,
  ...HTTP_APIS_INCIDENTS,
];
