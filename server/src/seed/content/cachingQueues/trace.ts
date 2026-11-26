import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'caching-queues' as const;
const type = 'TRACE' as const;

/** Caching & queues: Trace the Stack, 6 per level (P11). */
export const CACHING_QUEUES_TRACE: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'cache-stale-within-ttl',
    title: 'A price that will not change',
    topicSlug,
    subtopic: 'TTL',
    type,
    difficulty: 1,
    prompt:
      'At t = 0 the app caches the price. At t = 30 s the price in the database changes to 80, and nobody touches the cache. What does the read at t = 45 s return?',
    codeSnippet:
      "await cache.set('price:1', 100, { ttlSeconds: 60 });\n// t = 30 s: database price becomes 80\n// t = 45 s:\nconst price = await cache.get('price:1');",
    options: opts('80', '100', 'null, because the data changed', 'An error'),
    answerKey: 'b',
    explanation:
      'The cache knows nothing about the database. The entry stays valid until its 60-second TTL runs out, so the read at 45 s still returns the old value, 100.',
    misconception:
      'A cache does not update itself. Without invalidation, a TTL is the upper bound on staleness.',
  },
  {
    slug: 'cache-aside-db-calls',
    title: 'How often does the database work?',
    topicSlug,
    subtopic: 'cache-aside',
    type,
    difficulty: 1,
    prompt: 'The cache starts empty and nothing expires. How many times is the database queried?',
    codeSnippet:
      'async function getUser(id) {\n  const hit = cache.get(id);\n  if (hit) return hit;\n  const user = await db.findUser(id); // counted\n  cache.set(id, user);\n  return user;\n}\nawait getUser(7); await getUser(7); await getUser(8);',
    options: opts('1', '3', '2', '0'),
    answerKey: 'c',
    explanation:
      'The first getUser(7) misses and queries the database, then stores the user. The second getUser(7) is a hit. getUser(8) is a different key, so it misses and queries again: 2 queries.',
    misconception:
      'A cache stores one entry per key. Warming it for user 7 does nothing for user 8.',
  },
  {
    slug: 'redis-incr-missing-key',
    title: 'Counting from nothing',
    topicSlug,
    subtopic: 'Redis counters',
    type,
    difficulty: 1,
    prompt: 'The key page:views does not exist yet. What does the last command return?',
    codeSnippet: 'INCR page:views\nINCR page:views\nINCR page:views\nGET page:views',
    options: opts(
      '"3"',
      '"2", because the first INCR only creates the key',
      '(nil), because the key was never SET',
      'An error: INCR needs an existing key',
    ),
    answerKey: 'a',
    explanation:
      'INCR treats a missing key as 0, so the first call creates it with the value 1, then 2, then 3. GET returns the string "3", because Redis stores every value as a string.',
    misconception:
      'You do not need to SET a counter before incrementing it. INCR creates it, which is why it is the usual building block for counters and rate limits.',
  },
  {
    slug: 'queue-lpush-rpop-order',
    title: 'Which job comes out first?',
    topicSlug,
    subtopic: 'queues',
    type,
    difficulty: 1,
    prompt: 'A Redis list is used as a job queue. Which job does the worker get?',
    codeSnippet: 'LPUSH jobs "resize-1"\nLPUSH jobs "resize-2"\nLPUSH jobs "resize-3"\nRPOP jobs',
    options: opts('"resize-3"', '"resize-2"', 'All three, as a list', '"resize-1"'),
    answerKey: 'd',
    explanation:
      'LPUSH adds to the left (head) of the list, so it ends up as resize-3, resize-2, resize-1. RPOP takes from the right (tail): resize-1, the oldest job. Pushing on one end and popping from the other makes a first-in, first-out queue.',
    misconception:
      'LPUSH with LPOP would be a stack (newest first). A queue needs the two operations on opposite ends.',
  },
  {
    slug: 'cache-lru-eviction',
    title: 'Who gets evicted?',
    topicSlug,
    subtopic: 'eviction',
    type,
    difficulty: 1,
    prompt:
      'An in-memory cache holds at most 2 entries and evicts the least recently used one when full. Which key is gone after the last line?',
    codeSnippet: "cache.set('a', 1);\ncache.set('b', 2);\ncache.get('a');\ncache.set('c', 3);",
    options: opts("'a', because it was added first", "'b'", "'c', because there is no room", 'None: the cache grows to 3'),
    answerKey: 'b',
    explanation:
      "Reading 'a' makes it the most recently used. When 'c' arrives the cache is full, so it evicts the entry nobody has touched for longest: 'b'.",
    misconception:
      'LRU is not first-in, first-out. Every read refreshes an entry, so popular keys survive even if they are old.',
  },
  {
    slug: 'queue-single-worker-finish',
    title: 'One worker, three jobs',
    topicSlug,
    subtopic: 'background jobs',
    type,
    difficulty: 1,
    prompt:
      'Three jobs are queued at t = 0. One worker runs one job at a time, and each job takes 2 s. When does the third job finish?',
    codeSnippet: "queue.process(1, async (job) => {\n  await renderPdf(job.data); // 2 s\n});\nawait queue.add('pdf', a);\nawait queue.add('pdf', b);\nawait queue.add('pdf', c);",
    options: opts('t = 6 s', 't = 2 s', 't = 4 s', 'Never, the worker only takes one job'),
    answerKey: 'a',
    explanation:
      'With concurrency 1 the worker finishes a job before taking the next: job 1 ends at 2 s, job 2 at 4 s, job 3 at 6 s. Adding workers or raising concurrency is how a queue gets through work faster.',
    misconception:
      'Queuing work does not make it run in parallel. Throughput is set by how many workers (and how much concurrency) consume the queue.',
  },
  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'redis-set-clears-ttl',
    title: 'The session that stopped expiring',
    topicSlug,
    subtopic: 'TTL',
    type,
    difficulty: 2,
    prompt: 'Both commands run 20 s apart. What does TTL return right after the second SET?',
    codeSnippet: 'SET session:9 "v1" EX 60\n# 20 seconds later\nSET session:9 "v2"\nTTL session:9',
    options: opts('40', '60, because the write resets the timer', '-1', '-2'),
    answerKey: 'c',
    explanation:
      'A plain SET replaces the value and removes any existing expiry, so the key now lives forever and TTL returns -1. (-2 would mean the key does not exist.) Pass EX again, or use SET ... KEEPTTL, to keep a timeout.',
    misconception:
      'An expiry belongs to the write that set it, not to the key name. Overwriting without EX quietly turns a session into a permanent key.',
    hint: 'What does SET do to a key it overwrites?',
  },
  {
    slug: 'cache-falsy-zero-miss',
    title: 'Zero unread messages',
    topicSlug,
    subtopic: 'cache-aside',
    type,
    difficulty: 2,
    prompt: 'User 5 has 0 unread messages. After these three calls, how many database queries ran?',
    codeSnippet:
      'const cache = new Map();\nasync function unread(userId) {\n  const hit = cache.get(userId);\n  if (hit) return hit;\n  const n = await db.countUnread(userId); // counted\n  cache.set(userId, n);\n  return n;\n}\nawait unread(5); await unread(5); await unread(5);',
    options: opts('1', '0', '2', '3'),
    answerKey: 'd',
    explanation:
      'The cached value is the number 0, which is falsy, so if (hit) treats every lookup as a miss and the database runs all 3 times. Check presence, not truthiness: if (cache.has(userId)).',
    misconception:
      'A cache can store values that look like "nothing": 0, empty strings, false. Testing the value instead of the key turns those into permanent misses.',
  },
  {
    slug: 'cache-shared-mutable-object',
    title: 'The vanishing email',
    topicSlug,
    subtopic: 'in-process cache',
    type,
    difficulty: 2,
    prompt:
      'The public endpoint strips the email before responding. Then the account page asks for the same user. What does the last line print?',
    codeSnippet:
      "const cache = new Map();\nasync function getUser(id) {\n  if (!cache.has(id)) cache.set(id, await db.findUser(id));\n  return cache.get(id);\n}\nconst pub = await getUser(1);\ndelete pub.email;          // public view\nconst me = await getUser(1);\nconsole.log(me.email);",
    options: opts(
      'undefined',
      "'asha@example.com'",
      'An error: cannot delete from a cached object',
      "'asha@example.com', and the public view still has it too",
    ),
    answerKey: 'a',
    explanation:
      'An in-process Map stores a reference to the object, and getUser returns that same object every time. delete pub.email changes the cached copy, so every later caller sees the user without an email. Return a copy, or never mutate what a cache gives you.',
    misconception:
      'Unlike Redis, which hands you a fresh string to parse, an in-memory cache hands out shared objects. Mutating one mutates it for everyone.',
  },
  {
    slug: 'queue-visibility-timeout-redelivery',
    title: 'The job that ran twice',
    topicSlug,
    subtopic: 'delivery guarantees',
    type,
    difficulty: 2,
    prompt:
      'An SQS-style queue hides a received message for 30 s (visibility timeout) and redelivers it if it is not deleted by then. Two workers are idle. A job takes 45 s, and the worker deletes the message when done (a delete removes it for good). How many times does the job start?',
    codeSnippet:
      "const msg = await queue.receive();        // hidden for 30 s\nawait transcode(JSON.parse(msg.body));    // 45 s\nawait queue.delete(msg.receiptHandle);",
    options: opts('1', '2', '3, one every 30 s until deleted', '0: the message expires first'),
    answerKey: 'b',
    explanation:
      'At t = 30 s the message becomes visible again and the idle second worker receives it. At 45 s the first worker deletes it, so it is not handed out a third time: 2 starts. The visibility timeout must be longer than the job, or extended while it runs.',
    misconception:
      'A queue does not know a worker is still busy. If the job outlives the timeout, the queue assumes the worker died and gives the job to someone else.',
    hint: 'Where is the message at t = 30 s?',
  },
  {
    slug: 'cache-concurrent-miss-fanout',
    title: 'Three calls at once',
    topicSlug,
    subtopic: 'cache-aside',
    type,
    difficulty: 2,
    prompt: 'The cache is empty and fetchRates takes 100 ms. How many times does fetchRates run?',
    codeSnippet:
      "const cache = new Map();\nasync function getRates() {\n  if (cache.has('rates')) return cache.get('rates');\n  const rates = await fetchRates();\n  cache.set('rates', rates);\n  return rates;\n}\nawait Promise.all([getRates(), getRates(), getRates()]);",
    options: opts(
      '1, because the first call fills the cache',
      '3',
      '1, because Map operations are atomic',
      '2: the third call sees the first result',
    ),
    answerKey: 'b',
    explanation:
      'All three calls check the cache before any fetch has finished, so all three miss and each starts its own fetchRates. Caching the promise instead (cache.set before awaiting) would make the second and third calls share the first fetch.',
    misconception:
      'The cache is only filled after the await. Until then, every concurrent caller sees the same miss.',
    hint: 'When does cache.set run relative to the three has() checks?',
  },
  {
    slug: 'queue-backoff-total-wait',
    title: 'How long before it gives up?',
    topicSlug,
    subtopic: 'retries',
    type,
    difficulty: 2,
    prompt:
      'A job is allowed 4 attempts in total, with exponential backoff starting at 1 s (delay doubles after each failure). Every attempt fails instantly. How long after the first attempt does the job give up?',
    codeSnippet: "await queue.add('sync', data, {\n  attempts: 4,\n  backoff: { type: 'exponential', delay: 1000 },\n});",
    options: opts('15 s', '8 s', '4 s', '7 s'),
    answerKey: 'd',
    explanation:
      '4 attempts means 3 retries, so there are 3 waits between them: 1 s, 2 s and 4 s, which adds up to 7 s. 15 s would be four waits (1 + 2 + 4 + 8), one more than 4 attempts can have.',
    misconception:
      '"Attempts" counts the first try. The number of waits is always one less than the number of attempts.',
  },
  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'redis-watch-exec-aborts',
    title: 'Optimistic stock check',
    topicSlug,
    subtopic: 'Redis transactions',
    type,
    difficulty: 3,
    prompt:
      'Stock is 1. Client A runs the steps on the left; between A\'s GET and EXEC, client B runs DECR stock. What does A\'s EXEC return, and what is stock afterwards?',
    codeSnippet:
      '# Client A\nWATCH stock\nGET stock        # "1"\nMULTI\nDECR stock\nEXEC\n# Client B, before A\'s EXEC:\nDECR stock',
    options: opts(
      'A\'s EXEC returns an array with -1; stock is -1',
      'B\'s DECR waits until A\'s EXEC finishes; stock is -1',
      'EXEC returns nil and A\'s DECR never runs; stock is 0',
      'EXEC fails with a lock-timeout error; stock is 0',
    ),
    answerKey: 'c',
    explanation:
      'WATCH makes the transaction conditional: if any watched key changes before EXEC, Redis discards the queued commands and EXEC returns nil. B changed stock, so A\'s DECR never runs and stock is 0. A should re-read and retry, and will then see 0 left.',
    misconception:
      'MULTI is not a lock. Other clients keep writing freely; WATCH only lets you notice that they did and abort.',
    hint: 'What does WATCH do when the key changes?',
  },
  {
    slug: 'redis-lock-unconditional-del',
    title: 'Two workers, one lock',
    topicSlug,
    subtopic: 'distributed locks',
    type,
    difficulty: 3,
    prompt:
      'Each worker takes the lock with SET NX PX 10000 and releases it with a plain DEL. Worker A takes it at t = 0 and pauses for 15 s. What does C\'s SET return at t = 16, and who is inside the critical section then?',
    codeSnippet:
      't = 0   A: SET lock A NX PX 10000   -> OK\nt = 12  B: SET lock B NX PX 10000   -> ?\nt = 15  A: DEL lock\nt = 16  C: SET lock C NX PX 10000   -> ?',
    options: opts(
      'nil; only B is inside',
      'OK; only C is inside, because B lost the lock',
      'nil; A still holds it until its DEL',
      'OK; B and C are both inside',
    ),
    answerKey: 'd',
    explanation:
      'A\'s lock expired at 10 s, so B got it at 12 s. A\'s DEL at 15 s deleted B\'s lock, not its own, so C\'s SET NX at 16 s succeeds. B was never told and is still working: two workers in the critical section. Release with a check-and-delete script that compares the stored token.',
    misconception:
      'A lease that expires is not a lock you still hold. Releasing without checking the owner deletes someone else\'s lock.',
    hint: 'Whose lock does A delete at t = 15?',
  },
  {
    slug: 'redis-volatile-lru-no-ttl',
    title: 'Memory full, no evictions',
    topicSlug,
    subtopic: 'eviction',
    type,
    difficulty: 3,
    prompt:
      'Redis has maxmemory 1gb and maxmemory-policy volatile-lru. Memory is full, and none of the keys has a TTL. What happens to the next SET of a new key?',
    codeSnippet: 'CONFIG GET maxmemory-policy   # volatile-lru\nINFO memory                   # used_memory at maxmemory\nSET cart:991 "{...}"',
    options: opts(
      'It fails with an OOM "command not allowed" error',
      'Redis evicts the least recently used key, then stores it',
      'Redis stores it on disk until memory frees up',
      'Redis evicts the oldest key by insertion time',
    ),
    answerKey: 'a',
    explanation:
      'volatile-* policies only evict keys that have an expiry. With none to choose from, Redis behaves like noeviction and rejects writes with an OOM error. For a pure cache use allkeys-lru, or give cache keys TTLs.',
    misconception:
      'An LRU policy name does not mean every key is evictable. "volatile" limits eviction to keys with a TTL.',
  },
  {
    slug: 'queue-retry-reorders-updates',
    title: 'The email that went back in time',
    topicSlug,
    subtopic: 'ordering',
    type,
    difficulty: 3,
    prompt:
      'Three "set email" messages for the same user are queued in order. Message 1 fails once and is retried after a 5 s backoff; the others succeed at once. What email does the user end up with?',
    codeSnippet:
      "// queued in this order\n1: { userId: 4, email: 'a@x.io' }   // fails once, retried after 5 s\n2: { userId: 4, email: 'b@x.io' }\n3: { userId: 4, email: 'c@x.io' }\n// consumer: UPDATE users SET email = $email WHERE id = $userId",
    options: opts("'c@x.io'", "'b@x.io'", "'a@x.io'", 'It depends on the queue: FIFO queues keep the original order'),
    answerKey: 'c',
    explanation:
      'Messages 2 and 3 are applied while message 1 waits out its backoff. When the retry succeeds, it overwrites the newest value with the oldest one: a@x.io. Fixes: per-key ordering (a FIFO message group that blocks on failure), or a version number the UPDATE checks.',
    misconception:
      'A FIFO queue delivers in order, but retries with backoff re-deliver later. Order is only preserved if a failure blocks the messages behind it.',
    hint: 'Which message is applied last?',
  },
  {
    slug: 'cache-aside-slow-read-race',
    title: 'The slow reader',
    topicSlug,
    subtopic: 'invalidation',
    type,
    difficulty: 3,
    prompt:
      'The writer updates the database first and then deletes the cache key, which is normally safe. With this timing, what is in the cache at t = 4, and until when?',
    codeSnippet:
      't = 0  reader: cache miss; SELECT price -> 100 (slow network)\nt = 1  writer: UPDATE price = 80\nt = 2  writer: DEL product:1\nt = 3  reader: SET product:1 100 EX 600\nt = 4  ?',
    options: opts(
      'Nothing: the writer\'s DEL removed it',
      '80, because the reader re-reads before writing',
      '100, until the 600 s TTL expires',
      'Nothing: SET is ignored for a key deleted a moment ago',
    ),
    answerKey: 'c',
    explanation:
      'The reader read 100 before the update but wrote it to the cache after the delete, so the stale value lands in the cache with a fresh 10-minute TTL. Delete-after-write narrows the race to this rare ordering; a TTL (or a delayed second delete) bounds it.',
    misconception:
      'Delete-after-write is not perfectly consistent. A slow read that straddles the write can still re-cache the old value; the TTL is what bounds the damage.',
    hint: 'When did the reader read, and when did it write?',
  },
  {
    slug: 'queue-dual-write-crash',
    title: 'Saved but never announced',
    topicSlug,
    subtopic: 'outbox',
    type,
    difficulty: 3,
    prompt: 'The process is killed (deploy, OOM) right after line 3 finishes. What is the state afterwards?',
    codeSnippet:
      "await db.query('BEGIN');\nconst id = await insertOrder(db, order);\nawait db.query('COMMIT');\nawait queue.publish('order.placed', { id });\nres.status(201).json({ id });",
    options: opts(
      'No order and no event: the transaction rolls back',
      'The order is saved, but no event is ever published',
      'The order and the event both exist: the queue retries the publish',
      'The order is saved and the client gets a 201',
    ),
    answerKey: 'b',
    explanation:
      'COMMIT is durable, so the order exists. The publish never ran, and nothing will run it later, so the warehouse never hears about the order. The client also got no response, so it may retry. The transactional outbox fixes this: write the event to a table in the same transaction, and let a relay publish it.',
    misconception:
      'Writing to a database and to a queue are two separate operations. Without a shared transaction, any crash in between leaves them out of sync.',
  },
];
