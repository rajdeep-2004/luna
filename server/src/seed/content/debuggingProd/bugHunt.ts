import type { ChallengeSeed } from '../../schema';

const topicSlug = 'debugging-prod' as const;
const type = 'BUG_HUNT' as const;

/** Debugging & production: Bug Hunt, 6 per level (P12). answerKey is the 1-based buggy line. */
export const DEBUGGING_PROD_BUG_HUNT: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'prod-hardcoded-db-url',
    title: 'Works on my machine',
    topicSlug,
    subtopic: 'configuration',
    type,
    difficulty: 1,
    prompt:
      'The app runs locally but crashes on the server with "connect ECONNREFUSED 127.0.0.1:27017". Which line is the bug?',
    codeSnippet:
      "const PORT = process.env.PORT || 3000;\nconst DB_URL = 'mongodb://localhost:27017/app';\nmongoose.connect(DB_URL);\napp.listen(PORT);",
    answerKey: '2',
    explanation:
      'localhost on the server is the server itself, where no database runs. Connection strings belong in environment variables, such as process.env.MONGODB_URI, so each environment supplies its own.',
    misconception:
      '"localhost" is not a fixed place: it means whichever machine the code is running on.',
  },
  {
    slug: 'prod-logs-password',
    title: 'Too much detail',
    topicSlug,
    subtopic: 'logging',
    type,
    difficulty: 1,
    prompt: 'A security review flags this login handler. Which line is the problem?',
    codeSnippet:
      "app.post('/login', async (req, res) => {\n  logger.info({ body: req.body }, 'login attempt');\n  const user = await authenticate(req.body.email, req.body.password);\n  if (!user) return res.status(401).json({ error: 'Invalid credentials' });\n  res.json({ token: signToken(user.id) });\n});",
    answerKey: '2',
    explanation:
      'The whole request body goes into the log, and the body contains the plain-text password. Logs are copied to log services, kept for months and read by many people. Log only what you need (the email or a user id) and configure redaction for fields like password and token.',
    misconception:
      '"It is only the logs" is how passwords leak. Treat logs as data that many people and systems can read.',
  },
  {
    slug: 'prod-error-with-200',
    title: 'Zero errors on the dashboard',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 1,
    prompt:
      'Users see "Could not load orders", but the dashboard shows a 0% error rate for /orders. Which line is the bug?',
    codeSnippet:
      "app.get('/orders', async (req, res) => {\n  try {\n    res.json(await Order.find({ userId: req.user.id }));\n  } catch (err) {\n    logger.error({ err }, 'orders query failed');\n    res.json({ error: 'Could not load orders' });\n  }\n});",
    answerKey: '6',
    explanation:
      'res.json() sends status 200 unless you set another one. The failure is reported as a success, so monitoring, alerts, retries and the client all believe it worked. Send a real error status: res.status(500).json(...), or 503 if the database is unavailable.',
    misconception:
      'An error message in the body is not an error to anything that reads status codes. Dashboards and clients count statuses.',
  },
  {
    slug: 'prod-timeout-units',
    title: 'Five seconds, in theory',
    topicSlug,
    subtopic: 'timeouts',
    type,
    difficulty: 1,
    prompt:
      'Every call to the rates API fails with a TimeoutError, though the API answers in about 200 ms. Which line is the bug?',
    codeSnippet:
      'const RATES_URL = config.ratesUrl;\nconst TIMEOUT_MS = 5; // give the API 5 seconds\nasync function getRates() {\n  const res = await fetch(RATES_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });\n  if (!res.ok) throw new Error(`rates API returned ${res.status}`);\n  return res.json();\n}',
    answerKey: '2',
    explanation:
      'AbortSignal.timeout takes milliseconds, and the constant says 5. Every request is aborted after 5 ms, long before the API can answer. The fix is TIMEOUT_MS = 5000. Naming the unit (TIMEOUT_MS) helps only if the value matches it.',
    misconception:
      'Timeouts in Node and the browser are almost always milliseconds. A comment saying "seconds" does not change the unit.',
  },
  {
    slug: 'prod-match-error-message',
    title: 'Email taken, apparently not',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 1,
    prompt:
      'Signing up with an email that exists returns 500 instead of 409. The driver throws an error with code 11000 and a message that starts "E11000 duplicate key error". Which line is the bug?',
    codeSnippet:
      "try {\n  await User.create({ email });\n} catch (err) {\n  if (err.message === 'duplicate key') return res.status(409).json({ error: 'Email taken' });\n  throw err;\n}",
    answerKey: '4',
    explanation:
      'The message is a long string that includes the collection and the key, so it is never exactly "duplicate key". The check always fails and the error is rethrown as a 500. Match on the stable error code (err.code === 11000), not on message text, which drivers are free to change.',
    misconception:
      'Error messages are for humans and change between versions. Code should branch on error codes or types.',
  },
  {
    slug: 'prod-duration-logged-too-early',
    title: 'Every request takes 0 ms',
    topicSlug,
    subtopic: 'metrics',
    type,
    difficulty: 1,
    prompt:
      'Users wait seconds for some pages, but every "request done" log line says 0 or 1 ms. Which line is the bug?',
    codeSnippet:
      "app.use((req, res, next) => {\n  const start = Date.now();\n  next();\n  logger.info({ path: req.path, ms: Date.now() - start }, 'request done');\n});",
    answerKey: '4',
    explanation:
      'next() starts the rest of the chain, and with an async handler it returns as soon as the handler reaches its first await. It does not wait for the response. The log line runs straight away and measures almost nothing. Log inside res.on("finish", ...), which fires when the response has been sent.',
    misconception:
      'Middleware code after next() does not run "after the request". With async handlers it runs while the request is still in progress.',
    hint: 'Does next() wait for the handler to finish?',
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'prod-swallowed-error',
    title: 'Sync complete (it was not)',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 2,
    prompt:
      'The warehouse never receives orders, yet logs say "sync complete" every time. Which line is the bug?',
    codeSnippet:
      "async function syncOrders() {\n  try {\n    await pushToWarehouse(await getOrders());\n  } catch (err) {}\n  logger.info('sync complete');\n}",
    answerKey: '4',
    explanation:
      'The empty catch swallows every failure, so the code carries on and reports success. At minimum, log the error with context and rethrow or return a failure so the caller and alerts know.',
    misconception:
      'Catching an error is not handling it. Silent failures are the hardest bugs to find.',
    hint: 'Where does the failure go?',
  },
  {
    slug: 'prod-unbounded-map',
    title: 'Memory climbs all day',
    topicSlug,
    subtopic: 'memory leaks',
    type,
    difficulty: 2,
    prompt: "The server's memory grows until it restarts every few hours. Which line is the bug?",
    codeSnippet:
      "const cache = {};\napp.get('/user/:id', async (req, res) => {\n  const user = await User.findById(req.params.id);\n  cache[req.params.id + Date.now()] = user;\n  res.json(user);\n});",
    answerKey: '4',
    explanation:
      'Adding Date.now() makes every key unique, so entries are added but never reused or removed. The object grows forever. A real cache needs reusable keys plus a size limit or expiry (e.g. an LRU cache).',
    misconception:
      'Garbage collection cannot free objects your code still references, like entries in a global map.',
    hint: 'Is any key ever read or written twice?',
  },
  {
    slug: 'prod-sse-listener-leak',
    title: 'Possible EventEmitter memory leak',
    topicSlug,
    subtopic: 'memory leaks',
    type,
    difficulty: 2,
    prompt:
      'Clients open this live price stream and close the tab later. Memory grows all day and Node prints "MaxListenersExceededWarning: ... 11 update listeners added". Which line is the bug?',
    codeSnippet:
      "app.get('/prices/stream', (req, res) => {\n  res.setHeader('Content-Type', 'text/event-stream');\n  const onPrice = (p) => res.write(`data: ${JSON.stringify(p)}\\n\\n`);\n  prices.on('update', onPrice);\n  res.on('finish', () => prices.off('update', onPrice));\n});",
    answerKey: '5',
    explanation:
      "An event stream never ends the response, so 'finish' never fires and the listener is never removed. Every closed tab leaves a listener behind that holds its res object, and each price update writes to dead sockets. Clean up on res.on('close', ...), which fires when the client disconnects.",
    misconception:
      "'finish' means \"the response was fully sent\". A long-lived stream that the client abandons never gets there; 'close' is the event for disconnects.",
    hint: 'When does a response that never calls res.end() finish?',
  },
  {
    slug: 'prod-retry-client-errors',
    title: 'Banned for retrying',
    topicSlug,
    subtopic: 'retries',
    type,
    difficulty: 2,
    prompt:
      'The partner suspends your API key for abuse. Their logs show every rejected request (401 "invalid signature", 422 "bad payload") arriving five times. Which line is the bug?',
    codeSnippet:
      "async function callPartner(body) {\n  for (let attempt = 1; attempt <= 5; attempt++) {\n    const res = await fetch(PARTNER_URL, { method: 'POST', body, signal: AbortSignal.timeout(3000) });\n    if (res.ok) return res.json();\n    if (res.status === 400) throw new PartnerError(res.status);\n    await sleep(200 * 2 ** attempt);\n  }\n  throw new Error('partner unavailable');\n}",
    answerKey: '5',
    explanation:
      'Only 400 stops the loop, so every other 4xx, like 401, 403, 404 and 422, is retried five times. A client error will fail the same way every time; retrying it only adds load and looks like abuse. Retry 5xx and network errors (and 429 after its Retry-After); give up at once on other 4xx: if (res.status < 500 && res.status !== 429) throw ...',
    misconception:
      'Not every failure is worth retrying. A retry helps only when the next attempt could succeed.',
  },
  {
    slug: 'prod-pipe-unhandled-error',
    title: 'One missing file, one dead server',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 2,
    prompt:
      'When a user who has no export opens /export, the whole server crashes with "ENOENT: no such file or directory". Which line is the bug?',
    codeSnippet:
      "app.get('/export', (req, res) => {\n  const file = fs.createReadStream(path.join(EXPORT_DIR, `${req.user.id}.csv`));\n  res.setHeader('Content-Type', 'text/csv');\n  file.pipe(res);\n});",
    answerKey: '4',
    explanation:
      "A missing file makes the read stream emit an 'error' event. .pipe() does not forward errors, and an 'error' event with no listener is thrown as an uncaught exception, which ends the process. Use stream.pipeline(file, res, (err) => ...), which handles errors on both streams and cleans them up, and answer 404 when the file is missing.",
    misconception:
      "Streams report failures as 'error' events, not as thrown errors. Nobody listening means the process crashes.",
  },
  {
    slug: 'prod-request-id-not-forwarded',
    title: 'The trail goes cold',
    topicSlug,
    subtopic: 'observability',
    type,
    difficulty: 2,
    prompt:
      "Every API log line has a requestId, and the pricing service logs the x-request-id header it receives. Yet for a failed order, you can't find the pricing service's logs. Which line is the bug?",
    codeSnippet:
      "app.use((req, res, next) => {\n  req.id = req.get('x-request-id') ?? randomUUID();\n  req.log = logger.child({ requestId: req.id });\n  next();\n});\napp.post('/orders', async (req, res) => {\n  req.log.info('creating order');\n  const quote = await fetch(PRICING_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body) });\n  req.log.info({ status: quote.status }, 'priced');\n  res.status(201).json(await quote.json());\n});",
    answerKey: '8',
    explanation:
      "The request id is used in this service's logs but never sent on. The pricing call goes out without an x-request-id header, so the pricing service makes up its own id and the two sides cannot be joined. Add 'x-request-id': req.id to the headers of every downstream call (tracing libraries do this for you).",
    misconception:
      'A correlation id only correlates if every hop passes it along. One call without it breaks the chain.',
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'prod-shutdown-order',
    title: 'Errors on every deploy',
    topicSlug,
    subtopic: 'graceful shutdown',
    type,
    difficulty: 3,
    prompt:
      'Each deploy, a handful of requests fail with "MongoNotConnectedError: Client must be connected". Which line is the bug?',
    codeSnippet:
      "process.on('SIGTERM', async () => {\n  logger.info('SIGTERM: draining');\n  await mongoose.disconnect();\n  server.close(() => process.exit(0));\n});",
    answerKey: '3',
    explanation:
      'The database connection is closed first, while the HTTP server is still serving the requests that were in flight and even accepting new ones. Those requests then hit a closed client. Shut down in reverse order of startup: stop taking traffic and wait for in-flight requests (server.close), then disconnect from the database, then exit. Add a force-exit timer shorter than the platform grace period, because server.close() waits forever on a request that hangs.',
    misconception:
      'A graceful shutdown is about order. Close what depends on a resource before you close the resource.',
  },
  {
    slug: 'prod-rate-limit-proxy-ip',
    title: 'Everyone is rate limited',
    topicSlug,
    subtopic: 'rate limiting',
    type,
    difficulty: 3,
    prompt:
      'The API runs behind exactly one load balancer. At the morning peak, every user gets 429 at the same moment. Which line is the bug?',
    codeSnippet:
      "app.set('trust proxy', 1);\napp.use(async (req, res, next) => {\n  const key = `rl:${req.socket.remoteAddress}`;\n  const [count] = await redis.multi().incr(key).expire(key, 60, 'NX').exec();\n  if (count > 100) return res.status(429).json({ error: 'Too many requests' });\n  next();\n});",
    answerKey: '3',
    explanation:
      'req.socket.remoteAddress is the address of the machine that opened the TCP connection, which is the load balancer, for every user. All traffic shares one counter, and the first 100 requests in a minute lock everyone out. With trust proxy set to 1, req.ip is the client address from X-Forwarded-For; key on req.ip (or on the user id when logged in).',
    misconception:
      'Behind a proxy, the socket address is the proxy. The client address comes from a header, and you should only trust as many hops as you actually run.',
  },
  {
    slug: 'prod-idempotency-key-per-attempt',
    title: 'Charged twice in a slowdown',
    topicSlug,
    subtopic: 'idempotency',
    type,
    difficulty: 3,
    prompt:
      'During a slowdown at the payment provider, a few customers were charged twice. Charges are retried on timeouts. Which line is the bug?',
    codeSnippet:
      "async function chargeOrder(order) {\n  return withRetry(\n    () =>\n      payments.create(\n        { amountCents: order.totalCents, customerId: order.customerId },\n        { idempotencyKey: randomUUID() },\n      ),\n    { retries: 3, retryOn: ['ETIMEDOUT', 'ECONNRESET'] },\n  );\n}",
    answerKey: '6',
    explanation:
      'The key is created inside the function that withRetry calls, so every attempt gets a new one. When the first attempt reached the provider but the reply timed out, the retry looks like a brand-new payment, and the provider charges again. The key must be the same for every attempt at the same charge, for example derived from order.id.',
    misconception:
      'Sending an idempotency key is not enough. It only protects you if retries reuse the exact same key.',
    hint: 'How many different keys does one order send?',
  },
  {
    slug: 'prod-liveness-checks-db',
    title: 'A failover that restarted everything',
    topicSlug,
    subtopic: 'health checks',
    type,
    difficulty: 3,
    prompt:
      'A 20-second database failover made every pod restart at the same time, and the API took 6 minutes to recover. Which line is the bug?',
    codeSnippet:
      "// livenessProbe -> /livez: restart the pod when it fails\n// readinessProbe -> /readyz: stop sending traffic when it fails\napp.get('/livez', async (req, res) => {\n  await db.query('SELECT 1');\n  res.sendStatus(200);\n});\napp.get('/readyz', async (req, res) => {\n  await db.query('SELECT 1');\n  res.sendStatus(200);\n});",
    answerKey: '4',
    explanation:
      'Liveness asks "is this process stuck and in need of a restart?". Making it depend on the database means a database blip fails liveness on every pod at once, so all of them restart together, reconnect together and warm up together. Restarting a pod cannot fix a database. Keep liveness to the process itself; the database belongs in readiness, which only stops traffic until it recovers.',
    misconception:
      'Readiness and liveness are not two names for one check. One stops traffic, the other kills the process, and a shared dependency should never trigger a kill.',
  },
  {
    slug: 'prod-redos-regex',
    title: 'One signup, CPU at 100%',
    topicSlug,
    subtopic: 'event loop',
    type,
    difficulty: 3,
    prompt:
      'One request to /invite with a 40-character email pinned the CPU for minutes, and every other request timed out. Which line is the bug?',
    codeSnippet:
      "const EMAIL_RE = /^([a-z0-9]+\\.?)*@corp\\.example$/i;\napp.post('/invite', (req, res) => {\n  const email = String(req.body.email ?? '');\n  if (email.length > 254) return res.status(400).json({ error: 'Too long' });\n  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email' });\n  res.status(202).json({ invited: email });\n});",
    answerKey: '1',
    explanation:
      'Because \\.? is optional, ([a-z0-9]+\\.?)* can split a run of letters into groups in exponentially many ways. On an input like "aaaa...a!" that cannot match, the regex engine tries all of them before failing (catastrophic backtracking, or ReDoS). It runs on the main thread, so the whole server stalls. The length check does not help: 40 characters is already enough. Rewrite it without nested quantifiers, e.g. /^[a-z0-9]+(\\.[a-z0-9]+)*@corp\\.example$/i.',
    misconception:
      'A regex is not always linear. Nested quantifiers over the same characters can take exponential time on inputs that almost match.',
  },
  {
    slug: 'prod-metric-label-cardinality',
    title: 'An 80 MB metrics page',
    topicSlug,
    subtopic: 'metrics',
    type,
    difficulty: 3,
    prompt:
      "The /metrics response grew to 80 MB, scrapes time out, and the app's memory climbs steadily. Which line is the bug?",
    codeSnippet:
      "const httpDuration = new client.Histogram({ name: 'http_request_duration_seconds', help: 'Request duration', labelNames: ['method', 'route', 'status'] });\napp.use((req, res, next) => {\n  const end = httpDuration.startTimer();\n  res.on('finish', () => end({ method: req.method, route: req.originalUrl, status: res.statusCode }));\n  next();\n});",
    answerKey: '4',
    explanation:
      'Every distinct label value creates a new time series, kept in memory and written on every scrape. req.originalUrl contains ids and query strings (/users/8812?ref=mail), so the number of series grows with every new URL. Label with the route pattern (req.route?.path, like /users/:id) and keep every label to a small, fixed set of values.',
    misconception:
      'Metrics are cheap only while label values are bounded. Anything per user, per id or per URL belongs in logs or traces, not labels.',
  },
];
