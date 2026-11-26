import type { ChallengeSeed } from '../../schema';
import { HTTP_APIS_TRACE } from './trace';
import { HTTP_APIS_BUG_HUNT } from './bugHunt';
import { HTTP_APIS_CHOICE } from './choice';

/** HTTP & APIs topic: 54 singles (Trace, Bug Hunt, Choice × 3 levels × 6); incidents live in ../incidents.ts for now. */
export const HTTP_APIS: ChallengeSeed[] = [
  ...HTTP_APIS_TRACE,
  ...HTTP_APIS_BUG_HUNT,
  ...HTTP_APIS_CHOICE,
];
