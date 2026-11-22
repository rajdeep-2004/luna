import { opts, type ChallengeSeed } from '../schema';

const topicSlug = 'caching-queues' as const;

export const CACHING_QUEUES: ChallengeSeed[] = [
  {
    slug: 'cache-stale-within-ttl',
    title: 'A price that will not change',
    topicSlug,
    subtopic: 'TTL',
    type: 'TRACE',
    difficulty: 1,
    prompt:
      'At t = 0 the app caches the price. At t = 30 s the price in the database changes to 80, and nobody touches the cache. What does the read at t = 45 s return?',
    codeSnippet:
      "await cache.set('price:1', 100, { ttlSeconds: 60 });\n// t = 30 s: database price becomes 80\n// t = 45 s:\nconst price = await cache.get('price:1');",
    options: opts('80', '100', 'null', 'An error'),
    answerKey: 'b',
    explanation:
      'The cache knows nothing about the database. The entry stays valid until its 60-second TTL runs out, so the read at 45 s still returns the old value, 100.',
    misconception:
      'A cache does not update itself. Without invalidation, a TTL is the upper bound on staleness.',
  },
  {
    slug: 'cache-key-missing-viewer',
    title: "Seeing someone else's view",
    topicSlug,
    subtopic: 'cache keys',
    type: 'BUG_HUNT',
    difficulty: 2,
    prompt:
      'Profiles include viewer-specific fields (like "you follow them"). Users sometimes see another viewer\'s version. Which line is the bug?',
    codeSnippet:
      "async function getProfile(userId, viewerId) {\n  const key = `profile:${userId}`;\n  const cached = await redis.get(key);\n  if (cached) return JSON.parse(cached);\n  const profile = await buildProfile(userId, viewerId);\n  await redis.set(key, JSON.stringify(profile), 'EX', 300);\n  return profile;\n}",
    answerKey: '2',
    explanation:
      "The result depends on both userId and viewerId, but the key only contains userId. The first viewer's version is served to everyone. The key must include every input that changes the result, or the viewer-specific parts must not be cached.",
    misconception:
      'A cache key is not just "the thing being looked up". It is every input that affects the output.',
    hint: 'What does the cached value depend on?',
  },
  {
    slug: 'cache-delete-before-write',
    title: 'The old price came back',
    topicSlug,
    subtopic: 'invalidation',
    type: 'BUG_HUNT',
    difficulty: 3,
    prompt:
      'Reads fill the cache from the database on a miss. After a price update, the cache sometimes holds the old price for 10 minutes. Which line is the bug?',
    codeSnippet:
      'async function updatePrice(id, price) {\n  await redis.del(`product:${id}`);\n  await db.products.update(id, { price });\n}',
    answerKey: '2',
    explanation:
      'Deleting first opens a window: a read between line 2 and line 3 misses the cache, loads the old price from the database and caches it again. Update the database first, then delete the cache entry.',
    misconception:
      'Invalidation order matters under concurrency. "Delete, then write" races with readers.',
    hint: 'What happens if a read arrives between the two lines?',
  },
  {
    slug: 'cache-hot-reads',
    title: 'Repeated reads',
    topicSlug,
    subtopic: 'when to cache',
    type: 'ENGINEER_CHOICE',
    difficulty: 1,
    prompt:
      'Your API receives thousands of reads per minute for the same product data, which rarely changes. The database is doing the same work over and over. What do you add?',
    options: opts(
      'A caching layer (e.g. Redis) with a sensible TTL',
      'A much larger database connection pool',
      "Store all product data in the phone's local storage only",
      'Switch from HTTP to WebSockets',
    ),
    answerKey: 'a',
    explanation:
      'Data that is read often and changes rarely is the ideal cache candidate. Serving it from memory removes repeated identical queries, and the TTL bounds how stale it can get.',
    misconception:
      'A bigger pool lets the database do more of the same work at once. It does not remove the work.',
    optionFeedback: {
      b: 'More connections mean more load on an already busy database.',
      c: 'Each device still fetches once, and prices go stale with no expiry.',
      d: 'The transport is not the problem; the repeated query is.',
    },
  },
  {
    slug: 'queue-welcome-email',
    title: 'A slow signup',
    topicSlug,
    subtopic: 'background jobs',
    type: 'ENGINEER_CHOICE',
    difficulty: 1,
    prompt:
      'Signup sends the welcome email inside the request. When the email provider is slow, signups take 8 s or fail. What do you change?',
    options: opts(
      'Put the email on a background job queue and respond right away',
      'Increase the signup request timeout',
      'Send the email from the mobile app',
      'Skip welcome emails',
    ),
    answerKey: 'a',
    explanation:
      'The user does not need to wait for the email. A queued job decouples signup from the provider: the request stays fast, and the job can retry if the provider is down.',
    misconception:
      'Not all work belongs in the request path. Only what the response actually needs does.',
    optionFeedback: {
      b: 'Signups get slower, not more reliable.',
      c: 'Exposes email credentials in the app.',
      d: 'Removes a feature instead of fixing the design.',
    },
  },
  {
    slug: 'cache-bad-candidate',
    title: 'What not to cache',
    topicSlug,
    subtopic: 'when to cache',
    type: 'ENGINEER_CHOICE',
    difficulty: 2,
    prompt: 'Which of these is the worst candidate for a 10-minute cache?',
    options: opts(
      'The list of supported countries',
      'A published blog post',
      "A user's wallet balance during checkout",
      'The product catalogue page',
    ),
    answerKey: 'c',
    explanation:
      'A balance used to approve a payment must be exact at that moment. A stale value can allow overspending. The other three change rarely and tolerate a few minutes of staleness.',
    misconception:
      'Caching is a trade-off between speed and freshness. Some data cannot be even slightly stale.',
    optionFeedback: {
      a: 'Almost never changes: a great candidate.',
      b: 'Changes rarely once published.',
      d: 'Read-heavy and tolerant of brief staleness.',
    },
    hint: 'Where would a stale value cause real harm?',
  },
  {
    slug: 'queue-retry-backoff',
    title: 'A flaky partner API',
    topicSlug,
    subtopic: 'retries',
    type: 'ENGINEER_CHOICE',
    difficulty: 2,
    prompt:
      'A background job calls a partner API that fails about 5% of the time with timeouts. How should the job retry?',
    options: opts(
      'Retry immediately, forever, until it succeeds',
      'Never retry; log the failure',
      'Retry with exponential backoff up to a limit, then move it to a dead-letter queue',
      'Retry every millisecond for one minute',
    ),
    answerKey: 'c',
    explanation:
      'Backoff (e.g. 1 s, 2 s, 4 s...) gives the partner time to recover without hammering it. A retry limit plus a dead-letter queue means permanent failures stop retrying and can be inspected.',
    misconception:
      'Aggressive retries can turn a small outage into a big one by overloading the struggling service.',
    optionFeedback: {
      a: 'A permanently broken job blocks the worker forever.',
      b: 'Gives up on errors that a retry would fix.',
      d: 'Floods the partner exactly when it is struggling.',
    },
    hint: 'How do you give a struggling service room to recover?',
  },
  {
    slug: 'queue-idempotent-consumer',
    title: 'At least once means more than once',
    topicSlug,
    subtopic: 'delivery guarantees',
    type: 'ENGINEER_CHOICE',
    difficulty: 2,
    prompt:
      'Your queue delivers messages "at least once". The worker that charges cards occasionally charges a customer twice. What is the right fix?',
    options: opts(
      'Acknowledge the message before processing it',
      'Make the worker idempotent: record each processed message id and skip repeats',
      'Refund any duplicate charges at the end of the day',
      'Run only one worker',
    ),
    answerKey: 'b',
    explanation:
      'At-least-once delivery means duplicates will happen, for example when a worker crashes after charging but before acknowledging. An idempotent consumer makes a duplicate harmless by remembering what it already did.',
    misconception:
      'Exactly-once delivery is rarely what you get. Design consumers to tolerate repeats.',
    optionFeedback: {
      a: 'Then a crash mid-processing loses the message entirely.',
      c: 'Customers still see the double charge.',
      d: 'One worker still gets redeliveries after a crash.',
    },
    hint: 'Assume the same message will arrive twice.',
  },
  {
    slug: 'cache-stampede',
    title: 'The key everyone wanted',
    topicSlug,
    subtopic: 'cache stampede',
    type: 'ENGINEER_CHOICE',
    difficulty: 3,
    prompt:
      'The homepage key expires. In the next second, 5,000 requests miss the cache, all run the same heavy query, and the database falls over. What prevents this?',
    options: opts(
      'Use a shorter TTL so it expires more often',
      'Let one request rebuild the value while the others wait or get the stale value',
      'Remove the cache so load is steady',
      'Add a read replica and change nothing else',
    ),
    answerKey: 'b',
    explanation:
      'This is a cache stampede. A lock or "single flight" makes one request recompute while the rest wait briefly or keep serving the stale value (stale-while-revalidate). The query then runs once, not 5,000 times.',
    misconception:
      'A cache miss is not one event. On a hot key it is thousands of identical misses at once.',
    optionFeedback: {
      a: 'More expiries mean more stampedes.',
      c: 'The database takes the full load all the time.',
      d: 'A replica absorbs some of the spike but still runs the query thousands of times.',
    },
    hint: 'How many of those 5,000 requests actually need to run the query?',
  },
  {
    slug: 'cache-pick-ttl',
    title: 'Choosing a TTL',
    topicSlug,
    subtopic: 'TTL',
    type: 'ENGINEER_CHOICE',
    difficulty: 1,
    prompt: "A weather widget's data source updates every 10 minutes. What TTL fits?",
    options: opts('1 second', 'About 5–10 minutes', '1 week', 'No TTL, cache forever'),
    answerKey: 'b',
    explanation:
      'Match the TTL to how often the data really changes and how stale users can tolerate it. Every 5–10 minutes keeps it fresh without hitting the source on every request.',
    misconception: 'Longer is not always better. A TTL is a freshness promise to users.',
    optionFeedback: {
      a: 'Almost every request hits the source anyway.',
      c: 'Users see a forecast from days ago.',
      d: 'Data goes stale with no way out.',
    },
  },
];
