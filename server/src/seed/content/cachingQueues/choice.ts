import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'caching-queues' as const;
const type = 'ENGINEER_CHOICE' as const;

/** Caching & queues: Engineer's Choice, 6 per level (P11). */
export const CACHING_QUEUES_CHOICE: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'cache-hot-reads',
    title: 'Repeated reads',
    topicSlug,
    subtopic: 'when to cache',
    type,
    difficulty: 1,
    prompt:
      'Your API receives thousands of reads per minute for the same product data, which rarely changes. The database is doing the same work over and over. What do you add?',
    options: opts(
      'A much larger database connection pool',
      "Store all product data in the phone's local storage, with no expiry",
      'Switch from HTTP to WebSockets',
      'A Redis cache with a sensible TTL',
    ),
    answerKey: 'd',
    explanation:
      'Data that is read often and changes rarely is the ideal cache candidate. Serving it from memory removes repeated identical queries, and the TTL bounds how stale it can get.',
    misconception:
      'A bigger pool lets the database do more of the same work at once. It does not remove the work.',
    optionFeedback: {
      a: 'More connections mean more load on an already busy database.',
      b: 'Each device still fetches once, and prices go stale with no way to refresh them.',
      c: 'The transport is not the problem; the repeated query is.',
    },
  },
  {
    slug: 'queue-welcome-email',
    title: 'A slow signup',
    topicSlug,
    subtopic: 'background jobs',
    type,
    difficulty: 1,
    prompt:
      'Signup sends the welcome email inside the request. When the email provider is slow, signups take 8 s or fail. What do you change?',
    options: opts(
      'Increase the signup request timeout to 30 s',
      'Send the email directly from the mobile app',
      'Queue the email as a background job',
      'Skip welcome emails when the provider is slow',
    ),
    answerKey: 'c',
    explanation:
      'The user does not need to wait for the email. A queued job decouples signup from the provider: the request stays fast, and the job can retry if the provider is down.',
    misconception:
      'Not all work belongs in the request path. Only what the response actually needs does.',
    optionFeedback: {
      a: 'Signups get slower, not more reliable.',
      b: 'Exposes email credentials in the app.',
      d: 'Removes a feature instead of fixing the design, and you cannot tell "slow" in advance.',
    },
  },
  {
    slug: 'cache-pick-ttl',
    title: 'Choosing a TTL',
    topicSlug,
    subtopic: 'TTL',
    type,
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
  {
    slug: 'cache-bad-candidate',
    title: 'What not to cache',
    topicSlug,
    subtopic: 'when to cache',
    type,
    difficulty: 1,
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
    slug: 'cache-shared-session-store',
    title: 'Logged out at random',
    topicSlug,
    subtopic: 'shared state',
    type,
    difficulty: 1,
    prompt:
      "You scaled the API from 1 to 3 instances behind a load balancer. Sessions are kept in each process's memory, and users now get logged out at random. You need to keep all 3 instances, and admins must be able to revoke a session instantly. What do you change?",
    options: opts(
      'Store sessions in a shared Redis that every instance reads',
      'Give each instance more memory',
      'Go back to one instance',
      'Save sessions to a file on each server',
    ),
    answerKey: 'a',
    explanation:
      'Each instance only knows the sessions it created, so a request routed to another instance looks logged out. A shared store gives every instance the same view, and deleting a session there revokes it everywhere at once.',
    misconception:
      'Once there is more than one instance, anything kept in process memory is local to one of them. Shared state needs a shared store.',
    optionFeedback: {
      b: 'Memory size is not the problem; the sessions are on the wrong instance.',
      c: 'Ruled out: you need the 3 instances for the traffic.',
      d: 'Still local to each server, so the same random logouts happen.',
    },
  },
  {
    slug: 'cache-eviction-policy',
    title: 'Cache full, writes failing',
    topicSlug,
    subtopic: 'eviction',
    type,
    difficulty: 1,
    prompt:
      'Redis is used only as a cache (the data can always be rebuilt from Postgres). It hit its memory limit and now rejects writes with OOM errors. Which setting fits?',
    options: opts(
      'maxmemory-policy noeviction, so no data is ever lost',
      'Restart Redis every night to clear it',
      'maxmemory-policy allkeys-lru',
      'Turn off maxmemory so Redis can use all RAM',
    ),
    answerKey: 'c',
    explanation:
      'allkeys-lru evicts the least recently used keys when memory is full, which is exactly what a cache wants: rarely used entries make room for new ones, and a miss just reloads from Postgres.',
    misconception:
      'Losing a cache entry is fine; that is what a cache miss is for. noeviction suits Redis as a primary store, not as a cache.',
    optionFeedback: {
      a: 'This is the current behaviour: writes fail when memory is full.',
      b: 'Every restart empties the cache and sends all traffic to Postgres.',
      d: 'Redis grows until the machine runs out of memory and the OS kills it.',
    },
  },
  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'queue-retry-backoff',
    title: 'A flaky partner API',
    topicSlug,
    subtopic: 'retries',
    type,
    difficulty: 2,
    prompt:
      'A background job calls a partner API that fails about 5% of the time with timeouts. How should the job retry?',
    options: opts(
      'Retry immediately, forever, until it succeeds',
      'Retry with exponential backoff up to a limit, then dead-letter it',
      'Never retry; log the failure for a human to look at',
      'Retry every 10 ms for one minute so it recovers as fast as possible',
    ),
    answerKey: 'b',
    explanation:
      'Backoff (e.g. 1 s, 2 s, 4 s...) gives the partner time to recover without hammering it. A retry limit plus a dead-letter queue means permanent failures stop retrying and can be inspected.',
    misconception:
      'Aggressive retries can turn a small outage into a big one by overloading the struggling service.',
    optionFeedback: {
      a: 'A permanently broken job blocks the worker forever.',
      c: 'Gives up on errors that a retry would fix, and buries people in 5% failures.',
      d: 'Floods the partner exactly when it is struggling.',
    },
    hint: 'How do you give a struggling service room to recover?',
  },
  {
    slug: 'queue-idempotent-consumer',
    title: 'At least once means more than once',
    topicSlug,
    subtopic: 'delivery guarantees',
    type,
    difficulty: 2,
    prompt:
      'Your queue delivers messages "at least once". The worker that charges cards occasionally charges a customer twice. What is the right fix?',
    options: opts(
      'Acknowledge the message before processing it',
      'Refund any duplicate charges in a nightly reconciliation job',
      'Run only one worker so no two workers share a message',
      'Store processed message ids and skip repeats',
    ),
    answerKey: 'd',
    explanation:
      'At-least-once delivery means duplicates will happen, for example when a worker crashes after charging but before acknowledging. An idempotent consumer makes a duplicate harmless by remembering what it already did.',
    misconception:
      'Exactly-once delivery is rarely what you get. Design consumers to tolerate repeats.',
    optionFeedback: {
      a: 'Then a crash mid-processing loses the message entirely.',
      b: 'Customers still see the double charge.',
      c: 'One worker still gets redeliveries after a crash.',
    },
    hint: 'Assume the same message will arrive twice.',
  },
  {
    slug: 'redis-shared-rate-limit',
    title: 'Five login attempts, three servers',
    topicSlug,
    subtopic: 'rate limiting',
    type,
    difficulty: 2,
    prompt:
      'Login must allow at most 5 failed attempts per account per 15 minutes. The API runs on 3 instances, and the load balancer spreads requests across them. Which design enforces the limit?',
    options: opts(
      'An in-memory counter per instance, with a limit of 5',
      'A Redis counter per account: INCR, and set a 15-minute EXPIRE on the first attempt',
      'Sticky sessions plus an in-memory counter',
      'A failed_attempts column on the users table, read, incremented and written back by the API',
    ),
    answerKey: 'b',
    explanation:
      'Every instance increments the same Redis key, and INCR is atomic, so the count is exact across servers. The expiry starts a fixed 15-minute window at the first failure; when the key expires, the count starts again from zero. In production, send INCR and EXPIRE together (MULTI or a small Lua script) so a crash between them cannot leave a counter with no TTL.',
    misconception:
      'A limit enforced per instance is really "limit × instances". Shared limits need shared, atomic counters.',
    optionFeedback: {
      a: 'An attacker gets 5 attempts on each instance: 15 in total.',
      c: 'An attacker controls the cookie that pins them; dropping it spreads requests again.',
      d: 'Read-modify-write loses increments under concurrent attempts, and needs its own reset logic.',
    },
  },
  {
    slug: 'queue-fanout-daily-digest',
    title: '50,000 emails at 9 a.m.',
    topicSlug,
    subtopic: 'background jobs',
    type,
    difficulty: 2,
    prompt:
      'A cron job at 9 a.m. loops over 50,000 users and sends each a digest. It takes 3 hours, and when it crashes halfway, nobody knows who already got one. What do you change?',
    options: opts(
      'Run the cron loop at 6 a.m. instead so it finishes in time',
      'Send all 50,000 emails at once with Promise.all',
      'Let the cron only enqueue one job per user (keyed by user and date); workers send with retries',
      'Move the loop to a bigger server',
    ),
    answerKey: 'c',
    explanation:
      'Splitting the work into one job per user lets many workers share it, retries one failed email instead of the whole run, and the user-and-date key stops a re-run from sending twice. The cron becomes a quick "enqueue" step.',
    misconception:
      'A long loop is one big unit of failure. Small, independent, idempotent jobs fail and retry one at a time.',
    optionFeedback: {
      a: 'Still one 3-hour loop that cannot resume after a crash.',
      b: "50,000 concurrent calls hit the email provider's rate limit and crash the process.",
      d: 'Sending emails is waiting on the network, not CPU; the crash problem stays.',
    },
  },
  {
    slug: 'queue-pubsub-vs-durable',
    title: 'Invoices that went missing',
    topicSlug,
    subtopic: 'pub/sub',
    type,
    difficulty: 2,
    prompt:
      'The orders service announces each new order with Redis PUBLISH. The invoicing service subscribes, but it restarts on every deploy, and orders placed during a restart never get invoices. What do you use instead?',
    options: opts(
      'Keep PUBLISH, but publish each message twice',
      'A Redis Stream with a consumer group, acked after the invoice is saved',
      'Make the invoicing service restart faster',
      'Have the orders service call invoicing over HTTP once per order, logging any failure',
    ),
    answerKey: 'b',
    explanation:
      'Redis Pub/Sub is fire-and-forget: a message goes only to subscribers connected at that moment. A Stream (or a queue) stores messages until a consumer acknowledges them, so invoicing catches up after a restart.',
    misconception:
      'Pub/Sub and queues look alike but promise different things. Pub/Sub has no memory; anything that must not be lost needs durable delivery.',
    optionFeedback: {
      a: 'Both copies are lost if nobody is listening.',
      c: 'Shrinks the window but never closes it.',
      d: 'A call made during a restart fails, and a log line does not create the invoice: the same orders are still lost.',
    },
    hint: 'Where does a published message go when nobody is subscribed?',
  },
  {
    slug: 'cache-negative-caching',
    title: 'Bots asking for products that do not exist',
    topicSlug,
    subtopic: 'negative caching',
    type,
    difficulty: 2,
    prompt:
      'Scrapers request about 50,000 random product ids a minute. They do not exist, so every request misses the cache and queries Postgres. Real products are cached fine. What do you add?',
    options: opts(
      'A longer TTL for real products',
      'An index on the product id column',
      'A bigger Redis instance',
      'Cache "not found" results too, with a short TTL',
    ),
    answerKey: 'd',
    explanation:
      'Storing a marker for "does not exist" for a minute or so turns repeated lookups of missing ids into cache hits. The short TTL means a product created later shows up quickly. Rate limiting the scrapers is a good companion fix.',
    misconception:
      'A cache that only stores successes cannot protect the database from lookups that always fail.',
    optionFeedback: {
      a: 'Real products already hit the cache; the misses are for ids that do not exist.',
      b: 'Lookups by primary key already use an index; the volume is the problem.',
      c: 'Nothing is being stored for those ids, so more memory changes nothing.',
    },
  },
  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'cache-stampede',
    title: 'The key everyone wanted',
    topicSlug,
    subtopic: 'cache stampede',
    type,
    difficulty: 3,
    prompt:
      'The homepage key expires. In the next second, 5,000 requests miss the cache, all run the same heavy query, and the database falls over. What prevents this?',
    options: opts(
      'Use a shorter TTL so each rebuild is smaller',
      'Remove the cache so load on the database is steady',
      'Add a read replica for the homepage query and change nothing else',
      'Let one request rebuild while others serve the stale value',
    ),
    answerKey: 'd',
    explanation:
      'This is a cache stampede. A lock or "single flight" makes one request recompute while the rest wait briefly or keep serving the stale value (stale-while-revalidate). The query then runs once, not 5,000 times.',
    misconception:
      'A cache miss is not one event. On a hot key it is thousands of identical misses at once.',
    optionFeedback: {
      a: 'More expiries mean more stampedes, and the query is the same size.',
      b: 'The database takes the full load all the time.',
      c: 'A replica absorbs some of the spike but still runs the query thousands of times.',
    },
    hint: 'How many of those 5,000 requests actually need to run the query?',
  },
  {
    slug: 'queue-transactional-outbox',
    title: 'Every order, exactly announced',
    topicSlug,
    subtopic: 'outbox',
    type,
    difficulty: 3,
    prompt:
      'Each order saved in Postgres must produce an "order placed" message for the warehouse. Publishing after COMMIT loses messages when the process crashes in between; publishing before COMMIT announces orders that then roll back. The message broker does not support distributed transactions, and the warehouse is another team\'s service that must not read your database. What do you build?',
    options: opts(
      'Insert the message into an outbox table in the same transaction; a relay publishes and marks it sent',
      'Publish before COMMIT and send a "cancel" message if the transaction fails',
      'Publish after COMMIT inside a retry loop with backoff',
      'Have the warehouse poll the orders table every 10 seconds for new rows',
    ),
    answerKey: 'a',
    explanation:
      'The outbox row commits or rolls back together with the order, so the two can never disagree. A relay reads unsent rows and publishes them, retrying until it succeeds; consumers must tolerate the occasional duplicate when the relay crashes after publishing.',
    misconception:
      'You cannot make two systems agree with code that writes to them one after the other. Put both writes in one transaction, then move the message out asynchronously.',
    optionFeedback: {
      b: 'A crash before the cancel is sent leaves the bogus order announced.',
      c: 'The retry loop lives in the process that just crashed, so it never runs.',
      d: 'Ruled out: the warehouse must not read your database, and polling by id misses rows from long transactions that commit late.',
    },
  },
  {
    slug: 'queue-backpressure',
    title: 'A queue that only grows',
    topicSlug,
    subtopic: 'backpressure',
    type,
    difficulty: 3,
    prompt:
      'During a sale, producers enqueue 2,000 jobs/s. Each job calls a partner API that is contractually capped at 500 requests/s. The queue grows by millions and Redis memory is close to full. What do you do?',
    options: opts(
      'Add workers until consumption matches the 2,000 jobs/s coming in',
      'Retry partner 429s immediately so jobs drain faster',
      'Raise Redis maxmemory and wait for the sale to end',
      'Bound the queue and push back on producers when it is full',
    ),
    answerKey: 'd',
    explanation:
      'The partner cap fixes throughput at 500/s, so more workers just collect 429s. When input permanently outruns capacity, the backlog must be bounded: the producer gets told "full" (a 429 or a deferred response) and decides what to drop or delay, instead of the queue silently eating memory until Redis falls over.',
    misconception:
      'A queue absorbs bursts; it cannot absorb a sustained gap between arrival and service rates. That gap has to be pushed back to whoever is producing.',
    optionFeedback: {
      a: 'Throughput is capped by the partner at 500/s; extra workers only add rejected calls.',
      b: 'Retrying at once multiplies traffic against the cap.',
      c: 'Buys minutes; the backlog grows by 1,500 jobs every second.',
    },
    hint: 'What limits throughput, no matter how many workers you add?',
  },
  {
    slug: 'cache-hot-key',
    title: 'One key, one hot shard',
    topicSlug,
    subtopic: 'hot keys',
    type,
    difficulty: 3,
    prompt:
      "A celebrity post's key gets 200,000 reads/s. It lives on one shard of a Redis cluster, whose CPU is at 100% while the other shards idle. The post can be up to 2 s stale. What helps most?",
    options: opts(
      'Add more shards to the cluster',
      'A 1–2 s in-process cache for that key on each API instance',
      "Raise the key's TTL from 60 s to 1 hour so it is never missed",
      'Move the post back to Postgres',
    ),
    answerKey: 'b',
    explanation:
      'A key lives on exactly one shard, so more shards do not split its load. A tiny local cache on each instance absorbs almost all reads: each instance asks Redis about once a second instead of thousands of times. The 2 s staleness budget is what makes this safe.',
    misconception:
      'Sharding spreads keys, not reads of a single key. A hot key needs to be copied closer to the readers.',
    optionFeedback: {
      a: 'The key still hashes to one shard; the new shards stay idle.',
      c: 'The problem is reads per second, not misses; a longer TTL does not reduce reads.',
      d: 'Postgres handles 200,000 reads/s far worse than Redis.',
    },
  },
  {
    slug: 'queue-per-key-ordering',
    title: 'Ordered per account, fast overall',
    topicSlug,
    subtopic: 'ordering',
    type,
    difficulty: 3,
    prompt:
      'Account events (deposit, withdraw, close) must be applied in order for each account. Volume is 5,000 events/s, which one consumer cannot keep up with. What design fits?',
    options: opts(
      'One consumer for the whole queue, on a bigger machine',
      'Many consumers on one queue; each sorts events by timestamp before applying them',
      'Partition by account id, so one consumer handles each account in order',
      'Many consumers, and retry any event that arrives out of order',
    ),
    answerKey: 'c',
    explanation:
      "Partitioning by key keeps one account's events in order on one consumer, while different accounts run in parallel across partitions. You only need ordering within an account, so that is the only ordering you pay for.",
    misconception:
      'Global ordering and parallelism fight each other. Most systems only need ordering per entity, and partitioning by that key gives both.',
    optionFeedback: {
      a: 'Keeps order but caps throughput at one consumer, which already cannot keep up.',
      b: 'A consumer only sees its own events, and clocks across producers are not reliable enough to order by.',
      d: 'A consumer cannot tell an event is out of order without knowing what it has not yet received.',
    },
  },
  {
    slug: 'queue-webhook-dedup-same-tx',
    title: 'Webhooks arrive twice',
    topicSlug,
    subtopic: 'idempotency',
    type,
    difficulty: 3,
    prompt:
      'The payment provider retries webhooks, so "payment succeeded" sometimes arrives twice, even concurrently. The handler marks the order paid and adds loyalty points in Postgres. How do you make the effect happen exactly once?',
    options: opts(
      'SET webhook:<id> NX in Redis before processing, and skip the event if it already exists',
      'Check whether the order is already marked paid before applying the update',
      'Ask the provider to stop retrying',
      'Insert the event id under a unique constraint in the same transaction as the update',
    ),
    answerKey: 'd',
    explanation:
      "The unique insert and the business update commit together: a duplicate fails on the constraint and does nothing, and a crash rolls back both, so the provider's retry can still succeed. The dedup record and the effect can never disagree.",
    misconception:
      'An idempotency check stored somewhere other than the data it protects can drift from it. Keep the dedup record in the same transaction as the effect.',
    optionFeedback: {
      a: 'If the process crashes after the SET but before the update, every retry is skipped and the payment is never applied.',
      b: 'Two concurrent deliveries both see "not paid" and both add points.',
      c: 'Retries are how the provider guarantees delivery; you need them.',
    },
    hint: 'What happens to each approach if the process crashes halfway?',
  },
];
