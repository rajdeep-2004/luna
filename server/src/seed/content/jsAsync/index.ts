import type { ChallengeSeed } from '../../schema';
import { JS_ASYNC_TRACE } from './trace';
import { JS_ASYNC_BUG_HUNT } from './bugHunt';
import { JS_ASYNC_CHOICE } from './choice';
import { JS_ASYNC_INCIDENTS } from './incidents';

/** JavaScript async topic: 54 singles (Trace, Bug Hunt, Choice × 3 levels × 6) and 4 incidents. */
export const JS_ASYNC: ChallengeSeed[] = [
  ...JS_ASYNC_TRACE,
  ...JS_ASYNC_BUG_HUNT,
  ...JS_ASYNC_CHOICE,
  ...JS_ASYNC_INCIDENTS,
];
