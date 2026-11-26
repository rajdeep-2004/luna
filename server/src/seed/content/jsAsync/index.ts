import type { ChallengeSeed } from '../../schema';
import { JS_ASYNC_TRACE } from './trace';
import { JS_ASYNC_BUG_HUNT } from './bugHunt';
import { JS_ASYNC_CHOICE } from './choice';

/** JavaScript async topic: 54 singles (Trace, Bug Hunt, Choice × 3 levels × 6); incidents live in ../incidents.ts for now. */
export const JS_ASYNC: ChallengeSeed[] = [
  ...JS_ASYNC_TRACE,
  ...JS_ASYNC_BUG_HUNT,
  ...JS_ASYNC_CHOICE,
];
