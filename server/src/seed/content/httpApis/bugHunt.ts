import type { ChallengeSeed } from '../../schema';

const topicSlug = 'http-apis' as const;
const type = 'BUG_HUNT' as const;

/** HTTP & APIs: Bug Hunt, 6 per level (P10). answerKey is the 1-based buggy line. */
export const HTTP_APIS_BUG_HUNT: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'http-missing-return',
    title: 'Headers already sent',
    topicSlug,
    subtopic: 'express handlers',
    type,
    difficulty: 1,
    prompt:
      'A login with no email crashes with "Cannot set headers after they are sent". Which line is the bug?',
    codeSnippet:
      "app.post('/login', (req, res) => {\n  if (!req.body.email) {\n    res.status(400).json({ error: 'Email required' });\n  }\n  const user = findUser(req.body.email);\n  res.json(user);\n});",
    answerKey: '3',
    explanation:
      'Sending a response does not stop the function. Without return, execution continues to line 6 and tries to send a second response. Write return res.status(400).json(...).',
    misconception: 'res.json() is not like throw: the handler keeps running after it.',
  },
  {
    slug: 'http-param-name-mismatch',
    title: 'Every user is missing',
    topicSlug,
    subtopic: 'routing',
    type,
    difficulty: 1,
    prompt: 'GET /users/64f1c… returns 404 for users that exist. Which line is the bug?',
    codeSnippet:
      "app.get('/users/:userId', async (req, res) => {\n  const user = await User.findById(req.params.id);\n  if (!user) return res.status(404).json({ error: 'Not found' });\n  res.json(user);\n});",
    answerKey: '2',
    explanation:
      'The route names its parameter userId, so the value is in req.params.userId. req.params.id is undefined, findById(undefined) finds nothing, and every request gets 404.',
    misconception:
      'req.params keys come from the names in the route path, not from a fixed "id" field.',
  },
  {
    slug: 'http-query-string-number',
    title: 'Page "21"',
    topicSlug,
    subtopic: 'validation',
    type,
    difficulty: 1,
    prompt: 'GET /products?page=2 responds with next: "21". Which line is the root cause?',
    codeSnippet:
      "app.get('/products', async (req, res) => {\n  const page = req.query.page ?? 1;\n  const skip = (page - 1) * 20;\n  const items = await Product.find().skip(skip).limit(20);\n  res.json({ items, next: page + 1 });\n});",
    answerKey: '2',
    explanation:
      'Query values are strings, so page is "2". Subtraction happens to convert it (skip is right), but + joins strings, giving "21". Convert and validate once where the value enters: const page = Number(req.query.page ?? 1), rejecting NaN or values below 1.',
    misconception:
      'Line 5 is where the symptom shows, not where the bug lives. Fix types at the boundary so every later line is correct.',
  },
  {
    slug: 'http-unencoded-query',
    title: 'Salt and... nothing',
    topicSlug,
    subtopic: 'URLs',
    type,
    difficulty: 1,
    prompt:
      'Searching for "salt & pepper" only returns results for "salt ". Which line is the bug?',
    codeSnippet:
      'async function search(term) {\n  const url = `/api/search?q=${term}`;\n  const res = await fetch(url);\n  return res.json();\n}',
    answerKey: '2',
    explanation:
      'In a query string, & separates parameters. The URL becomes ?q=salt & pepper, so q is "salt " and " pepper" is read as a second parameter with no value. Encode user input: ?q=${encodeURIComponent(term)}, or build it with URLSearchParams.',
    misconception:
      'A template string does not make text URL-safe. Characters like &, # and + have meanings in a URL.',
  },
  {
    slug: 'http-error-with-200',
    title: 'Welcome, again',
    topicSlug,
    subtopic: 'status codes',
    type,
    difficulty: 1,
    prompt:
      'The app shows "Welcome!" when someone signs up with an email that is already taken. The app checks res.ok. Which line is the bug?',
    codeSnippet:
      "app.post('/signup', async (req, res) => {\n  const exists = await User.exists({ email: req.body.email });\n  if (exists) {\n    return res.json({ error: 'Email already registered' });\n  }\n  const user = await createUser(req.body.email, req.body.password);\n  res.status(201).json({ id: user.id });\n});",
    answerKey: '4',
    explanation:
      'res.json() defaults to status 200, so the app sees res.ok === true and shows the welcome screen. Send a status that says what happened: return res.status(409).json({ error: ... }).',
    misconception:
      'An error message in the body is not an error to HTTP clients. They read the status code first.',
  },
  {
    slug: 'http-next-not-called',
    title: 'Requests that never finish',
    topicSlug,
    subtopic: 'middleware',
    type,
    difficulty: 1,
    prompt:
      'Requests with a wrong key get 401 as expected, but requests with the right key hang until they time out. Which line is the bug?',
    codeSnippet:
      "function requireApiKey(req, res, next) {\n  if (req.get('x-api-key') !== config.apiKey) {\n    return res.status(401).json({ error: 'Bad key' });\n  }\n  next;\n}",
    answerKey: '5',
    explanation:
      'next; only mentions the function; it does not call it. The middleware neither responds nor passes the request on, so it hangs. Write next().',
    misconception:
      'A middleware must either send a response or call next(). Doing neither leaves the request open forever.',
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'http-missing-ownership-check',
    title: 'Anyone can delete anything',
    topicSlug,
    subtopic: 'authorization',
    type,
    difficulty: 2,
    prompt: "Any logged-in user can delete any other user's post. Which line is the bug?",
    codeSnippet:
      "app.delete('/posts/:id', requireAuth, async (req, res) => {\n  const post = await Post.findById(req.params.id);\n  if (!post) return res.status(404).end();\n  await post.deleteOne();\n  res.status(204).end();\n});",
    answerKey: '4',
    explanation:
      'requireAuth checks who the user is (authentication), but nothing checks whether this user owns the post (authorization). The delete on line 4 runs for anyone. Check post.authorId against req.userId first and return 404 or 403 if they differ.',
    misconception:
      'Being logged in is not permission. Every resource needs its own ownership check.',
    hint: 'Logged in, yes. But is it their post?',
  },
  {
    slug: 'http-jwt-decode-not-verify',
    title: 'Tokens anyone can write',
    topicSlug,
    subtopic: 'authentication',
    type,
    difficulty: 2,
    prompt:
      'A pen tester logs in as any user by editing the "sub" field of their own token. Which line is the bug?',
    codeSnippet:
      "function requireAuth(req, res, next) {\n  const token = req.get('authorization')?.replace('Bearer ', '');\n  if (!token) return res.status(401).end();\n  const payload = jwt.decode(token);\n  req.userId = payload.sub;\n  next();\n}",
    answerKey: '4',
    explanation:
      'jwt.decode only base64-decodes the payload; it never checks the signature. Anyone can change the payload and the server believes it. Use jwt.verify(token, secret, { algorithms: ["HS256"] }) in a try/catch and return 401 when it throws.',
    misconception:
      'A JWT is signed, not encrypted. Its contents are readable and editable by anyone; only verifying the signature proves the server issued it.',
  },
  {
    slug: 'http-unbounded-limit',
    title: 'limit=1000000',
    topicSlug,
    subtopic: 'pagination',
    type,
    difficulty: 2,
    prompt:
      'One client calls GET /orders?limit=1000000 and the API runs out of memory. Which line is the bug?',
    codeSnippet:
      "app.get('/orders', requireAuth, async (req, res) => {\n  const limit = Number(req.query.limit) || 20;\n  const orders = await Order.find({ userId: req.userId })\n    .sort({ createdAt: -1 })\n    .limit(limit);\n  res.json(orders);\n});",
    answerKey: '2',
    explanation:
      'The default is fine, but nothing caps what the client asks for, so one request can load a million documents. Clamp it where it enters: Math.min(Math.max(Number(req.query.limit) || 20, 1), 100).',
    misconception:
      'Having a limit parameter is not the same as having a limit. A client-chosen bound needs a server-side maximum.',
  },
  {
    slug: 'http-mass-assignment',
    title: 'Validated, then ignored',
    topicSlug,
    subtopic: 'validation',
    type,
    difficulty: 2,
    prompt:
      'A user created a note with { "title": "Hi", "pinned": true, "likes": 9999 }, and all three fields were saved. Which line is the bug?',
    codeSnippet:
      "const NoteBody = z.object({ title: z.string().min(1).max(100) });\napp.post('/notes', requireAuth, async (req, res) => {\n  const parsed = NoteBody.safeParse(req.body);\n  if (!parsed.success) return res.status(400).json({ error: 'Invalid note' });\n  const note = await Note.create({ ...req.body, ownerId: req.userId });\n  res.status(201).json(note);\n});",
    answerKey: '5',
    explanation:
      'The schema strips unknown keys, but only from parsed.data. Line 5 spreads the raw req.body, so every extra field the client sent goes into the database. Use { ...parsed.data, ownerId: req.userId }.',
    misconception:
      'Validating a request does not clean it in place. You have to use the validated output, not the original.',
  },
  {
    slug: 'http-retry-on-client-error',
    title: 'Six seconds to fail a typo',
    topicSlug,
    subtopic: 'retries',
    type,
    difficulty: 2,
    prompt:
      'A request with a typo in its body takes 6 s to fail with 400, and the partner complains about repeated bad requests. Which line is the bug?',
    codeSnippet:
      "async function sendWithRetry(body, attempts = 3) {\n  for (let i = 1; i <= attempts; i++) {\n    const res = await fetch(PARTNER_URL, { method: 'PUT', body });\n    if (res.ok) return res.json();\n    if (i === attempts) throw new Error(`HTTP ${res.status}`);\n    await sleep(1000 * 2 ** i);\n  }\n}",
    answerKey: '5',
    explanation:
      'Every non-2xx response is retried, including 400, which will fail the same way every time. Only retry what can succeed later (network errors, 429, 502–504): throw immediately when res.status is a 4xx other than 408 or 429.',
    misconception:
      'Retries are for transient failures. A 4xx says the request itself is wrong; sending it again is wasted load.',
  },
  {
    slug: 'http-error-leaks-stack',
    title: 'Internals in the response',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 2,
    prompt:
      'A security scan reports that failed requests reveal file paths and SQL fragments. Which line is the bug?',
    codeSnippet:
      "app.use((err, req, res, next) => {\n  logger.error({ err, path: req.path }, 'request failed');\n  res.status(err.status ?? 500).json({ error: err.message, stack: err.stack });\n});",
    answerKey: '3',
    explanation:
      'Logging the full error on the server is right (line 2). Sending err.message and err.stack to the client hands attackers file paths, library versions and query text. Send a generic message and an error code; keep the details in the logs.',
    misconception:
      'Helpful for debugging is not the same as safe to show. Detailed errors belong in logs, not responses.',
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'http-trust-proxy-all',
    title: 'A rate limit anyone can dodge',
    topicSlug,
    subtopic: 'rate limiting',
    type,
    difficulty: 3,
    prompt:
      'The app runs behind exactly one load balancer. An attacker makes 10,000 login attempts without being limited by sending a random X-Forwarded-For header each time. Which line is the bug?',
    codeSnippet:
      "const app = express();\napp.set('trust proxy', true);\napp.use(express.json());\nconst loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 5 });\napp.post('/login', loginLimiter, login);",
    answerKey: '2',
    explanation:
      'trust proxy = true makes req.ip the left-most X-Forwarded-For entry, which the client controls. The limiter keys on req.ip, so each fake header is a fresh bucket. Trust exactly the hops you have: app.set("trust proxy", 1), so req.ip is the address your load balancer saw.',
    misconception:
      'X-Forwarded-For is a list anyone can prepend to. Only the entries added by your own proxies are trustworthy.',
    hint: 'Which part of X-Forwarded-For can the client write?',
  },
  {
    slug: 'http-webhook-signature-reserialized',
    title: 'Genuine webhooks rejected',
    topicSlug,
    subtopic: 'webhooks',
    type,
    difficulty: 3,
    prompt:
      'About 3% of genuine payment webhooks fail the signature check, mostly ones containing non-ASCII names. Which line is the bug?',
    codeSnippet:
      "app.post('/webhooks/pay', express.json(), (req, res) => {\n  const sig = req.get('X-Signature') ?? '';\n  const expected = hmacHex(config.webhookSecret, JSON.stringify(req.body));\n  if (!safeEqual(sig, expected)) return res.status(401).end();\n  enqueue(req.body);\n  res.sendStatus(200);\n});",
    answerKey: '3',
    explanation:
      'The provider signed the exact bytes it sent. JSON.stringify of the parsed body produces different bytes whenever the original had other spacing, key order or escaped characters like \\u00e9. Sign-check the raw body: use express.raw({ type: "application/json" }) for this route and HMAC the buffer, then parse.',
    misconception:
      'Parsing and re-serialising JSON is not a round trip at the byte level. Signatures are over bytes, not meaning.',
  },
  {
    slug: 'http-open-redirect',
    title: 'A login link to somewhere else',
    topicSlug,
    subtopic: 'security',
    type,
    difficulty: 3,
    prompt:
      "Phishing emails link to your real login page with ?next=https://evil.example. After logging in, users land on the attacker's copy of your site. Which line is the bug?",
    codeSnippet:
      "app.get('/login/callback', async (req, res) => {\n  const session = await finishLogin(req.query.code);\n  setSessionCookie(res, session);\n  res.redirect(req.query.next || '/');\n});",
    answerKey: '4',
    explanation:
      'The redirect target comes straight from the URL, so anyone can make your trusted domain forward users anywhere. Allow only relative paths on your own site (starts with "/" but not "//"), or map next to a list of known destinations.',
    misconception:
      'A redirect is not harmless because it is only a Location header. Users trust the domain they started on.',
  },
  {
    slug: 'http-samesite-none-csrf',
    title: "A form on someone else's site",
    topicSlug,
    subtopic: 'cookies',
    type,
    difficulty: 3,
    prompt:
      'A malicious page auto-submits a hidden form to POST /transfer, and it runs as the logged-in victim. The API is only used by your own site on the same domain. Which line is the bug?',
    codeSnippet:
      "res.cookie('sid', session.id, {\n  httpOnly: true,\n  secure: true,\n  sameSite: 'none',\n  maxAge: 7 * 24 * 3600 * 1000,\n});",
    answerKey: '4',
    explanation:
      'SameSite=None tells the browser to attach the cookie to requests started by any site, including a cross-site form POST, which is exactly what CSRF needs. Your own site is same-site, so SameSite=Lax (or Strict) loses nothing and blocks the attack; add a CSRF token for defence in depth.',
    misconception:
      'HttpOnly and Secure do not stop CSRF. They hide and encrypt the cookie, but the browser still sends it with forged requests.',
  },
  {
    slug: 'http-cors-reflects-origin',
    title: 'Every site is allowed',
    topicSlug,
    subtopic: 'CORS',
    type,
    difficulty: 3,
    prompt:
      'Any website a logged-in user visits can read their account data from your API with fetch(..., { credentials: "include" }). Which line is the bug?',
    codeSnippet:
      "app.use((req, res, next) => {\n  res.set('Access-Control-Allow-Origin', req.get('origin') ?? '');\n  res.set('Access-Control-Allow-Credentials', 'true');\n  res.set('Vary', 'Origin');\n  next();\n});",
    answerKey: '2',
    explanation:
      'Echoing back whatever Origin the request carries means every site passes the CORS check, and with credentials allowed, the browser hands them the response. Compare the origin against an allow-list and only set the header when it matches.',
    misconception:
      'Reflecting the origin is not a safer "*". Browsers refuse * with credentials for a reason; reflection removes that protection.',
  },
  {
    slug: 'http-keepalive-shorter-than-lb',
    title: 'Random 502s at low traffic',
    topicSlug,
    subtopic: 'connections',
    type,
    difficulty: 3,
    prompt:
      'The load balancer keeps idle connections to the app open for 60 s. At quiet times, about 1 in 2,000 requests fails with 502. Which line is the bug?',
    codeSnippet:
      'const server = app.listen(config.port);\n// The load balancer in front reuses idle connections for up to 60 s.\nserver.headersTimeout = 66_000;\nserver.keepAliveTimeout = 5_000;\nserver.requestTimeout = 30_000;',
    answerKey: '4',
    explanation:
      "Node closes an idle keep-alive connection after 5 s, but the load balancer believes it can reuse it for 60 s. When it sends a request on a socket Node has just closed, the request fails and the balancer returns 502. The app's keepAliveTimeout must be longer than the balancer's idle timeout, for example 65_000.",
    misconception:
      'Keep-alive is not just a performance knob. Both ends must agree on who closes an idle connection first, and it must be the client side.',
    hint: 'Who closes an idle connection first, and does the other side know?',
  },
];
