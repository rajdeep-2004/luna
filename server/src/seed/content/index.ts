import { JS_ASYNC } from './jsAsync';
import { HTTP_APIS } from './httpApis';
import { DATABASES } from './databases';
import { CACHING_QUEUES } from './cachingQueues';
import { DEBUGGING_PROD } from './debuggingProd';

export { TOPICS } from './topics';
export const CHALLENGES = [
  ...JS_ASYNC,
  ...HTTP_APIS,
  ...DATABASES,
  ...CACHING_QUEUES,
  ...DEBUGGING_PROD,
];
