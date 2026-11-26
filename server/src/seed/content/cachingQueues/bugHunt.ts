import type { ChallengeSeed } from '../../schema';

const topicSlug = 'caching-queues' as const;
const type = 'BUG_HUNT' as const;

/** Caching & queues: Bug Hunt, 6 per level (P11). answerKey is the 1-based buggy line. */
export const CACHING_QUEUES_BUG_HUNT: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'cache-otp-no-ttl',
    title: 'The code that works forever',
    topicSlug,
    subtopic: 'TTL',
    type,
    difficulty: 1,
    prompt:
      'Login codes should be valid for 5 minutes, but a code from last week still works. Which line is the bug?',
    codeSnippet:
      'async function sendLoginCode(phone) {\n  const code = randomInt(100000, 1000000).toString();\n  await redis.set(`otp:${phone}`, code);\n  await sms.send(phone, `Your code is ${code}`);\n}',
    answerKey: '3',
    explanation:
      'The code is stored without an expiry, so it lives until someone deletes it. Store it with a TTL: redis.set(key, code, { EX: 300 }).',
    misconception:
      'Redis keys do not expire by default. Anything that should stop working after a while needs an explicit TTL.',
  },
  {
    slug: 'cache-key-mismatch',
    title: 'A hit rate of zero',
    topicSlug,
    subtopic: 'cache-aside',
    type,
    difficulty: 1,
    prompt:
      'Every cache in the app uses keys like user:<id>. The dashboard shows a 0% cache hit rate for users, even for the same user requested again and again. Which line is the bug?',
    codeSnippet:
      'async function getUser(id) {\n  const cached = await redis.get(`user:${id}`);\n  if (cached) return JSON.parse(cached);\n  const user = await db.users.findById(id);\n  await redis.set(`users:${id}`, JSON.stringify(user), { EX: 600 });\n  return user;\n}',
    answerKey: '5',
    explanation:
      'Values are written under users:<id> but read from user:<id>. Every read misses, and the cache fills with entries nobody reads. Build the key once (const key = `user:${id}`) and use it for both calls.',
    misconception:
      'A cache that is written to is not necessarily used. If the read and write keys differ by one character, every request still goes to the database.',
  },
  {
    slug: 'cache-forgot-json-parse',
    title: 'undefined, but only sometimes',
    topicSlug,
    subtopic: 'serialization',
    type,
    difficulty: 1,
    prompt:
      'The first request for a product shows its name. Every request after that shows "undefined". Which line is the bug?',
    codeSnippet:
      'async function getProduct(id) {\n  const cached = await redis.get(`product:${id}`);\n  if (cached) return cached;\n  const product = await db.products.findById(id);\n  await redis.set(`product:${id}`, JSON.stringify(product));\n  return product;\n}',
    answerKey: '3',
    explanation:
      'Redis stores and returns strings. The miss path returns the real object, but a hit returns the JSON text, and "text".name is undefined. Parse it on the way out: return JSON.parse(cached).',
    misconception:
      'A Redis cache does not hand back the object you put in. Whatever you stringify on the way in, you must parse on the way out.',
  },
  {
    slug: 'queue-ack-before-work',
    title: 'Lost when the worker crashed',
    topicSlug,
    subtopic: 'acknowledgements',
    type,
    difficulty: 1,
    prompt:
      'When a worker crashes in the middle of sending, that email is never sent, not even after the worker restarts. Which line is the bug?',
    codeSnippet:
      "channel.consume('emails', async (msg) => {\n  channel.ack(msg);\n  const job = JSON.parse(msg.content.toString());\n  await mailer.send(job.to, job.template);\n});",
    answerKey: '2',
    explanation:
      'The ack tells the broker the work is done, so it deletes the message. Here that happens before the email is sent, so a crash afterwards loses the job for good. Ack after mailer.send succeeds.',
    misconception:
      'Acknowledging is a promise that the work is finished, not a receipt that the message arrived.',
  },
  {
    slug: 'queue-nack-every-message',
    title: 'The SMS that kept coming',
    topicSlug,
    subtopic: 'acknowledgements',
    type,
    difficulty: 1,
    prompt:
      'Customers receive the same delivery SMS again and again, even though sending works. Which line is the bug?',
    codeSnippet:
      "channel.consume('sms', async (msg) => {\n  try {\n    await sms.send(JSON.parse(msg.content.toString()));\n  } catch (err) {\n    logger.error({ err }, 'sms failed');\n  }\n  channel.nack(msg);\n});",
    answerKey: '7',
    explanation:
      'nack (with the default requeue) tells the broker the message failed and should be delivered again. It runs after every message, including successful ones, so each SMS is resent forever. Ack on success; nack (or dead-letter) only in the catch.',
    misconception:
      'The broker only knows what you tell it. Rejecting a message you handled correctly puts it straight back on the queue.',
  },
  {
    slug: 'redis-rate-limit-never-expires',
    title: 'Blocked forever',
    topicSlug,
    subtopic: 'rate limiting',
    type,
    difficulty: 1,
    prompt:
      'This should allow 100 requests per minute per IP. Instead, once an IP reaches 100 it is blocked for good. Which line is the bug?',
    codeSnippet:
      'async function allow(ip) {\n  const key = `rate:${ip}`;\n  const count = await redis.incr(key);\n  if (count === 0) await redis.expire(key, 60);\n  return count <= 100;\n}',
    answerKey: '4',
    explanation:
      'INCR returns the value after incrementing, so the first request gets 1, never 0. The expiry is never set, the counter never resets, and the IP stays over the limit. Check count === 1.',
    misconception:
      'INCR on a new key returns 1, not 0. The first request in a window is the one that should start the timer.',
    hint: 'What does INCR return for a key that did not exist?',
  },
  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'cache-key-missing-viewer',
    title: "Seeing someone else's view",
    topicSlug,
    subtopic: 'cache keys',
    type,
    difficulty: 2,
    prompt:
      'Profiles include viewer-specific fields (like "you follow them"). Users sometimes see another viewer\'s version. Which line is the bug?',
    codeSnippet:
      'async function getProfile(userId, viewerId) {\n  const key = `profile:${userId}`;\n  const cached = await redis.get(key);\n  if (cached) return JSON.parse(cached);\n  const profile = await buildProfile(userId, viewerId);\n  await redis.set(key, JSON.stringify(profile), { EX: 300 });\n  return profile;\n}',
    answerKey: '2',
    explanation:
      "The result depends on both userId and viewerId, but the key only contains userId. The first viewer's version is served to everyone. The key must include every input that changes the result, or the viewer-specific parts must not be cached.",
    misconception:
      'A cache key is not just "the thing being looked up". It is every input that affects the output.',
    hint: 'What does the cached value depend on?',
  },
  {
    slug: 'cache-fallback-cached-long',
    title: 'A five-second blip, an hour of wrong rates',
    topicSlug,
    subtopic: 'failure handling',
    type,
    difficulty: 2,
    prompt:
      'The exchange-rate API was down for 5 seconds. For the next hour, every user saw the hard-coded default rates. Which line is the bug?',
    codeSnippet:
      "async function getRates() {\n  const cached = await redis.get('rates');\n  if (cached) return JSON.parse(cached);\n  try {\n    const rates = await fetchRates();\n    await redis.set('rates', JSON.stringify(rates), { EX: 3600 });\n    return rates;\n  } catch {\n    await redis.set('rates', JSON.stringify(DEFAULT_RATES), { EX: 3600 });\n    return DEFAULT_RATES;\n  }\n}",
    answerKey: '9',
    explanation:
      'Returning a fallback during an outage is fine. Caching it for the full hour is not: once the API recovers, the cache keeps serving the fallback. Do not cache the fallback, or cache it for a few seconds so the next request retries soon.',
    misconception:
      'A fallback is a temporary answer. Caching it with the same TTL as real data turns a short outage into a long one.',
  },
  {
    slug: 'queue-enqueue-before-commit',
    title: 'Order not found',
    topicSlug,
    subtopic: 'transactions and queues',
    type,
    difficulty: 2,
    prompt:
      'The receipt worker sometimes logs "order not found" for orders that do exist when you check a second later. Which line is the bug?',
    codeSnippet:
      "await db.query('BEGIN');\nconst { rows } = await db.query(\n  'INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id', [userId, total]);\nawait queue.add('receipt', { orderId: rows[0].id });\nawait db.query('INSERT INTO order_items (order_id, sku) SELECT $1, unnest($2::text[])', [rows[0].id, skus]);\nawait db.query('COMMIT');",
    answerKey: '4',
    explanation:
      'The job is queued while the transaction is still open. A fast worker reads the order before COMMIT, and other connections cannot see uncommitted rows. If the transaction rolls back, the job refers to an order that never existed. Enqueue after COMMIT, or use an outbox table.',
    misconception:
      'A worker is another database client. It sees only committed data, and it can start the moment the job is queued.',
    hint: 'What can another connection see before line 6 runs?',
  },
  {
    slug: 'queue-jobid-timestamp',
    title: 'Charged twice for one click',
    topicSlug,
    subtopic: 'idempotency',
    type,
    difficulty: 2,
    prompt:
      'The team uses BullMQ\'s jobId to stop duplicate charge jobs (adding a job whose id already exists is ignored). A double tap on "Pay" still charges twice. Which line is the bug?',
    codeSnippet:
      "app.post('/orders/:id/pay', async (req, res) => {\n  const order = await orders.findOwned(req.params.id, req.user.id);\n  await chargeQueue.add('charge', { orderId: order.id }, {\n    jobId: `charge-${order.id}-${Date.now()}`,\n  });\n  res.status(202).json({ status: 'processing' });\n});",
    answerKey: '4',
    explanation:
      'Date.now() differs between the two taps, so each request gets a new jobId and the queue accepts both. The id must come from what makes the job unique, the order: jobId: `charge-${order.id}`.',
    misconception:
      'Deduplication only works if a retry produces the same key. Anything time-based or random in the key defeats it.',
  },
  {
    slug: 'cache-query-string-key',
    title: 'Same search, different key',
    topicSlug,
    subtopic: 'cache keys',
    type,
    difficulty: 2,
    prompt:
      'Search results are cached, but the hit rate is low: the app and the website build the same filters with parameters in a different order. Which line is the bug?',
    codeSnippet:
      "app.get('/search', async (req, res) => {\n  const key = 'search:' + JSON.stringify(req.query);\n  const cached = await redis.get(key);\n  if (cached) return res.json(JSON.parse(cached));\n  const results = await searchProducts(req.query);\n  await redis.set(key, JSON.stringify(results), { EX: 120 });\n  res.json(results);\n});",
    answerKey: '2',
    explanation:
      '?color=red&size=m and ?size=m&color=red are the same search, but JSON.stringify keeps insertion order, so they produce two keys and two misses. Normalise the key: sort the parameters (and drop ones that do not affect results) before building it.',
    misconception:
      'Two requests that mean the same thing must map to the same key. A key built from raw input caches the spelling, not the meaning.',
  },
  {
    slug: 'cache-in-process-multi-instance',
    title: 'The flag that would not turn off',
    topicSlug,
    subtopic: 'in-process cache',
    type,
    difficulty: 2,
    prompt:
      'The API runs on 4 instances behind a load balancer. flagCache is a module-level Map, filled on first read and never expired. After an admin turns a feature flag off, most requests still see it on, for hours. Which line is the bug?',
    codeSnippet:
      "app.put('/admin/flags/:name', async (req, res) => {\n  await db.flags.update(req.params.name, req.body);\n  flagCache.delete(req.params.name);\n  res.sendStatus(204);\n});",
    answerKey: '3',
    explanation:
      'Each instance has its own Map. This delete runs only on the instance that handled the admin request; the other three keep their copy forever. Invalidate everywhere (move the flags to a shared cache such as Redis, or broadcast the invalidation), and give local copies a short TTL as a backstop.',
    misconception:
      'An in-process cache is per process. Invalidating it on one instance does nothing for the others.',
    hint: 'How many copies of flagCache exist in production?',
  },
  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'cache-delete-before-write',
    title: 'The old price came back',
    topicSlug,
    subtopic: 'invalidation',
    type,
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
    slug: 'redis-lock-release-other-owner',
    title: 'The lock that let two in',
    topicSlug,
    subtopic: 'distributed locks',
    type,
    difficulty: 3,
    prompt:
      'Under load, two workers sometimes run the nightly payout at the same time, even though both go through withLock. fn sometimes runs longer than 10 s. Which line is the bug?',
    codeSnippet:
      "async function withLock(key, fn) {\n  const token = randomUUID();\n  const ok = await redis.set(key, token, { NX: true, PX: 10_000 });\n  if (!ok) throw new Error('lock busy');\n  try {\n    return await fn();\n  } finally {\n    await redis.del(key);\n  }\n}",
    answerKey: '8',
    explanation:
      "If fn outlives the 10 s lease, the lock expires and another worker takes it. The finally block then deletes that worker's lock, letting a third one in. Release only if the stored value is still your token, atomically, with a small Lua script (GET, compare, DEL). Long jobs should also extend the lease or use a fencing token.",
    misconception:
      'The token is generated for a reason: a lock must only be released by its owner, and a plain DEL does not check who that is.',
    hint: 'The token is written but never read.',
  },
  {
    slug: 'cache-synchronized-expiry',
    title: 'Every hour, on the hour',
    topicSlug,
    subtopic: 'cache stampede',
    type,
    difficulty: 3,
    prompt:
      'A job warms 50,000 product keys at deploy time. Exactly one hour after every deploy, database CPU spikes to 100% for a minute. Which line is the bug?',
    codeSnippet:
      'async function warmCache(products) {\n  for (const p of products) {\n    await redis.set(`product:${p.id}`, JSON.stringify(p), { EX: 3600 });\n  }\n}',
    answerKey: '3',
    explanation:
      'Every key gets the same TTL at the same moment, so all 50,000 expire together and the next requests miss at once and hit the database. Add jitter (for example 3600 plus a random 0–600 s) so expiries spread out.',
    misconception:
      'A TTL is per key, but keys written together expire together. Uniform TTLs turn a warm cache into a scheduled stampede.',
  },
  {
    slug: 'queue-visibility-shorter-than-job',
    title: 'Transcoded six times',
    topicSlug,
    subtopic: 'delivery guarantees',
    type,
    difficulty: 3,
    prompt:
      'Each uploaded video is transcoded several times, and the bill for compute has tripled. The handler itself never fails. Which line is the bug?',
    codeSnippet:
      'const consumer = Consumer.create({\n  queueUrl: config.videoQueueUrl,\n  visibilityTimeout: 30, // seconds\n  handleMessage: async (msg) => {\n    await transcodeVideo(JSON.parse(msg.Body)); // takes 2–5 minutes\n  },\n});',
    answerKey: '3',
    explanation:
      'The queue hides a received message for only 30 s. Transcoding takes minutes, so the message reappears and other workers start the same job, several times over. Set the visibility timeout above the longest job (or extend it with a heartbeat while the job runs), and keep the handler idempotent.',
    misconception:
      'The queue cannot tell a slow worker from a dead one. A visibility timeout shorter than the job guarantees duplicate work.',
  },
  {
    slug: 'buffer-lost-on-sigterm',
    title: 'Views lost on every deploy',
    topicSlug,
    subtopic: 'write-behind',
    type,
    difficulty: 3,
    prompt:
      'Page views are buffered in memory and flushed every 10 s. The database is healthy, but every deploy loses a few seconds of views. Which line is the bug?',
    codeSnippet:
      "let pending = 0;\nexport const recordView = () => { pending += 1; };\nasync function flush() {\n  const n = pending;\n  pending = 0;\n  if (n > 0) await db.query('UPDATE stats SET views = views + $1', [n]);\n}\nsetInterval(flush, 10_000);\nprocess.on('SIGTERM', () => process.exit(0));",
    answerKey: '9',
    explanation:
      "A deploy sends SIGTERM, and the handler exits immediately, dropping whatever is still in pending. Flush before exiting: process.on('SIGTERM', async () => { await flush(); process.exit(0); }), and stop accepting new requests first.",
    misconception:
      'Write-behind buffers trade durability for speed. Whatever is in memory at shutdown is lost unless shutdown flushes it.',
  },
  {
    slug: 'redis-keys-in-request-path',
    title: 'One profile update, everyone waits',
    topicSlug,
    subtopic: 'Redis performance',
    type,
    difficulty: 3,
    prompt:
      'Redis holds 20 million keys. Every time a user edits their profile, latency for all Redis clients jumps to ~800 ms. Which line is the bug?',
    codeSnippet:
      'async function clearUserCache(userId) {\n  const keys = await redis.keys(`user:${userId}:*`);\n  if (keys.length > 0) await redis.del(keys);\n}',
    answerKey: '2',
    explanation:
      "KEYS scans the entire keyspace, all 20 million keys, no matter how specific the pattern is. Redis runs commands one at a time, so every other client waits for it. Track a user's keys in a set, use a version number in the key, or at least use SCAN, which works in small steps.",
    misconception:
      'A narrow pattern does not make KEYS cheap. Its cost is the size of the whole database, and it blocks the single command thread while it runs.',
  },
];
