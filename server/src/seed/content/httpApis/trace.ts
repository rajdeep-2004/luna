import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'http-apis' as const;
const type = 'TRACE' as const;

/** HTTP & APIs: Trace the Stack, 6 per level (P10). */
export const HTTP_APIS_TRACE: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'http-put-retries',
    title: 'Retrying a PUT',
    topicSlug,
    subtopic: 'idempotency',
    type,
    difficulty: 1,
    prompt:
      'A client times out and retries PUT /users/7 with { "name": "Asha" } three times. All three reach the server. What is the end state?',
    options: opts(
      'Three users named Asha',
      'User 7 is named Asha',
      'User 7 is named "AshaAshaAsha"',
      'An error, because PUT cannot be repeated',
    ),
    answerKey: 'b',
    explanation:
      'PUT replaces the resource at a known URL, so repeating it leaves the same result. That property is called idempotency, and it is what makes PUT safe to retry.',
    misconception:
      'Not every method is safe to retry: POST usually creates something new each time.',
  },
  {
    slug: 'http-middleware-order',
    title: 'Is /health protected?',
    topicSlug,
    subtopic: 'middleware',
    type,
    difficulty: 1,
    prompt: 'A request with no token calls GET /health. What does it get back?',
    codeSnippet:
      "app.get('/health', (req, res) => res.send('ok'));\napp.use(requireAuth);\napp.get('/me', (req, res) => res.json(req.user));",
    options: opts('401 from requireAuth', '404 Not Found', '200 with "ok"', '403 Forbidden'),
    answerKey: 'c',
    explanation:
      'Express runs middleware and routes in the order they were registered. /health is matched and answered before requireAuth is reached, so it is public. /me comes after requireAuth, so it is protected.',
    misconception:
      'app.use does not apply to every route in the file, only to the ones registered after it.',
    hint: 'In what order does Express look at these lines?',
  },
  {
    slug: 'http-no-body-parser',
    title: 'A body that is not there',
    topicSlug,
    subtopic: 'express handlers',
    type,
    difficulty: 1,
    prompt:
      'This Express 5 app has no other middleware. A client sends POST /notes with a JSON body { "title": "Hi" }. What is the response?',
    codeSnippet:
      "const app = express();\napp.post('/notes', (req, res) => {\n  res.status(201).json({ title: req.body.title });\n});",
    options: opts(
      '500, because req.body is undefined',
      '201 with { "title": "Hi" }',
      '201 with {}',
      '415 Unsupported Media Type',
    ),
    answerKey: 'a',
    explanation:
      'Express does not parse request bodies unless you add a parser such as app.use(express.json()). Without one, req.body is undefined, reading .title throws a TypeError, and Express answers 500.',
    misconception:
      'The JSON on the wire is not an object in your handler until some middleware parses it.',
  },
  {
    slug: 'http-fetch-404-resolves',
    title: 'fetch and a 404',
    topicSlug,
    subtopic: 'HTTP clients',
    type,
    difficulty: 1,
    prompt: 'The API answers this request with 404. What is logged?',
    codeSnippet:
      "try {\n  const res = await fetch('/api/users/999');\n  console.log('ok', res.status);\n} catch (err) {\n  console.log('failed');\n}",
    options: opts('failed', 'ok 200', 'A thrown HTTPError: 404', 'ok 404'),
    answerKey: 'd',
    explanation:
      'fetch only rejects when no HTTP response arrives at all (network down, DNS failure, aborted). A 404 or 500 is still a response, so the promise resolves and you must check res.ok or res.status yourself.',
    misconception:
      'An HTTP error status is not a JavaScript error. Libraries like axios throw on 4xx, which is why people expect fetch to.',
  },
  {
    slug: 'http-missing-content-type',
    title: 'JSON without a label',
    topicSlug,
    subtopic: 'headers',
    type,
    difficulty: 1,
    prompt:
      "The server uses app.post('/echo', express.json(), (req, res) => res.json({ got: req.body?.a ?? null })). What does this client receive?",
    codeSnippet:
      "await fetch('/echo', {\n  method: 'POST',\n  body: JSON.stringify({ a: 1 }),\n});",
    options: opts(
      '{ "got": 1 }',
      '{ "got": null }',
      '400 invalid JSON',
      '415 Unsupported Media Type',
    ),
    answerKey: 'b',
    explanation:
      'With a string body and no Content-Type header, fetch sends text/plain. express.json() only parses requests labelled application/json, so it skips this one and req.body stays undefined. Add headers: { "Content-Type": "application/json" }.',
    misconception:
      'The server does not sniff the body to guess its format. The Content-Type header tells it how to parse.',
    hint: 'What Content-Type does fetch send for a plain string body?',
  },
  {
    slug: 'http-httponly-cookie',
    title: 'Where did the cookie go?',
    topicSlug,
    subtopic: 'cookies',
    type,
    difficulty: 1,
    prompt:
      'After login the server sent Set-Cookie: sid=abc123; HttpOnly; Secure; SameSite=Lax. No other cookies exist. What does page JavaScript see in document.cookie?',
    options: opts(
      'sid=abc123',
      'sid=abc123; HttpOnly; Secure',
      'An empty string',
      'undefined, until the page reloads',
    ),
    answerKey: 'c',
    explanation:
      'HttpOnly cookies are sent with requests but hidden from JavaScript, so document.cookie is "". That is the point: an XSS script cannot read the session id.',
    misconception:
      'Hidden from JavaScript does not mean not sent. The browser still attaches the cookie to every matching request.',
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'http-param-type-mismatch',
    title: 'The item that exists but 404s',
    topicSlug,
    subtopic: 'routing',
    type,
    difficulty: 2,
    prompt:
      'items = [{ id: 42, name: "Lamp" }]. A client calls GET /items/42. What is the response?',
    codeSnippet:
      "app.get('/items/:id', (req, res) => {\n  const item = items.find((i) => i.id === req.params.id);\n  if (!item) return res.status(404).json({ error: 'Not found' });\n  res.json(item);\n});",
    options: opts('200 with the Lamp item', '404 Not found', '500 server error', '400 bad request'),
    answerKey: 'b',
    explanation:
      'Route params are always strings, so req.params.id is "42" while the stored id is the number 42. Strict equality fails, find returns undefined, and the handler sends 404.',
    misconception:
      'Express does not convert path params to numbers. You must parse and validate them yourself.',
    hint: 'What type is req.params.id?',
  },
  {
    slug: 'http-cors-preflight',
    title: 'The request before the request',
    topicSlug,
    subtopic: 'CORS',
    type,
    difficulty: 2,
    prompt:
      'A web page on app.example.com sends PUT https://api.example.com/profile with a JSON body. What does the browser send first?',
    options: opts(
      'The PUT request immediately',
      'An OPTIONS preflight request',
      'A GET request to /profile',
      'Nothing: cross-origin PUT is never allowed',
    ),
    answerKey: 'b',
    explanation:
      'A PUT with a JSON content type is not a "simple" request, so the browser first sends an OPTIONS preflight. It asks whether the API allows that origin, method and headers. Only if the API says yes does the real PUT go out.',
    misconception:
      'CORS is enforced by the browser, not the server. curl or a mobile app never sends a preflight.',
    hint: 'Some cross-origin requests need permission before they are sent.',
  },
  {
    slug: 'http-etag-304',
    title: 'Asking "has it changed?"',
    topicSlug,
    subtopic: 'caching',
    type,
    difficulty: 2,
    prompt:
      'The first GET /catalog returned 200 with ETag: "v7". The app now sends GET /catalog with If-None-Match: "v7", and the catalog has not changed. What comes back?',
    options: opts(
      '200 with the full catalog again',
      '412 Precondition Failed',
      '304 Not Modified with no body',
      '204 No Content',
    ),
    answerKey: 'c',
    explanation:
      'If-None-Match asks the server to send the body only if the current ETag differs. It still matches, so the server replies 304 with no body and the client reuses its cached copy, saving the transfer.',
    misconception:
      '412 is for If-Match (write only if unchanged). If-None-Match on a GET answers "nothing new" with 304, not an error.',
    hint: 'The client already has version v7.',
  },
  {
    slug: 'http-error-handler-order',
    title: 'The error handler that never runs',
    topicSlug,
    subtopic: 'middleware',
    type,
    difficulty: 2,
    prompt: 'A client calls GET /boom. What does it get?',
    codeSnippet:
      "app.use(express.json());\napp.use((err, req, res, next) => {\n  res.status(500).json({ error: 'Something broke' });\n});\napp.get('/boom', () => {\n  throw new Error('x');\n});",
    options: opts(
      "A 500 from Express's built-in handler, not your JSON",
      '500 with { "error": "Something broke" }',
      'The server process crashes with an uncaught Error',
      '404, because the route is shadowed by the handler',
    ),
    answerKey: 'a',
    explanation:
      'An error only travels forward to error handlers registered after the place it was thrown. This one sits before the route, so Express falls back to its default handler and sends its own 500 page. Register error middleware last.',
    misconception:
      'Error middleware is not global. Like everything in Express, it depends on registration order.',
  },
  {
    slug: 'http-express5-async-error',
    title: 'A rejected handler in Express 5',
    topicSlug,
    subtopic: 'express handlers',
    type,
    difficulty: 2,
    prompt:
      'The app runs Express 5 with a JSON error handler registered last. The database is down, so findUser rejects. What does the client get?',
    codeSnippet:
      "app.get('/users/:id', async (req, res) => {\n  const user = await db.findUser(req.params.id);\n  res.json(user);\n});",
    options: opts(
      'The request hangs until the client times out',
      'The process crashes on an unhandled rejection',
      '200 with null',
      'The error handler runs and sends its 500',
    ),
    answerKey: 'd',
    explanation:
      'Express 5 watches the promise an async handler returns. When it rejects, Express passes the error to next(), so your error handler answers 500. In Express 4 the same code left the request hanging and logged an unhandled rejection.',
    misconception:
      'The "async handlers hang" advice is from Express 4. Version 5 forwards rejections for you.',
  },
  {
    slug: 'http-offset-page-shift',
    title: 'Page two, again',
    topicSlug,
    subtopic: 'pagination',
    type,
    difficulty: 2,
    prompt:
      'A feed sorted newest first uses ?limit=20&offset=N. A user loads page 1 (offset 0). Before they scroll to page 2 (offset 20), 3 new posts are published. What does page 2 show?',
    options: opts(
      'The 20 posts that come right after page 1',
      'The 3 new posts and 17 older ones',
      'Three posts from page 1 again, then 17 new-to-them posts',
      'Three posts are skipped, then 20 older ones',
    ),
    answerKey: 'c',
    explanation:
      'Offset counts positions, not posts. The 3 new posts push everything down by 3, so positions 21–40 now start with the last 3 posts the user already saw on page 1. Cursor (keyset) pagination, "posts older than the last id I saw", avoids it.',
    misconception:
      'An offset is not a bookmark. Inserts before it cause repeats; deletes before it cause skips.',
    hint: 'Where did the last 3 posts of page 1 move?',
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'http-retry-after-date',
    title: 'Retry-After, but a date',
    topicSlug,
    subtopic: 'rate limiting',
    type,
    difficulty: 3,
    prompt:
      'The API answers 429 with Retry-After: Wed, 25 Nov 2026 10:30:00 GMT, two minutes from now. What does this client do?',
    codeSnippet:
      "const res = await fetch(url);\nif (res.status === 429) {\n  const waitMs = Number(res.headers.get('Retry-After')) * 1000;\n  await new Promise((r) => setTimeout(r, waitMs));\n  return fetch(url);\n}",
    options: opts(
      'Waits two minutes, then retries',
      'Retries almost at once, because the wait is NaN',
      'Throws a TypeError on Number()',
      'Hangs forever: setTimeout(r, NaN) never fires',
    ),
    answerKey: 'b',
    explanation:
      'Retry-After may be a number of seconds or an HTTP date. Number() of a date string is NaN, and setTimeout treats an invalid delay like NaN as 1 ms, so the client retries immediately, gets another 429, and adds to the overload. Parse both forms.',
    misconception:
      'Number() never throws; it returns NaN. And timers do not hang on bad delays; they fire right away.',
  },
  {
    slug: 'http-idempotency-check-race',
    title: 'An idempotency key that still double-charges',
    topicSlug,
    subtopic: 'idempotency',
    type,
    difficulty: 3,
    prompt:
      'The charge takes 12 s. The app times out at 10 s and retries with the same Idempotency-Key while the first request is still running. What happens?',
    codeSnippet:
      "app.post('/payments', async (req, res) => {\n  const key = req.get('Idempotency-Key');\n  const seen = await Payments.findOne({ key });\n  if (seen) return res.json(seen.result);\n  const result = await provider.charge(req.body);\n  await Payments.create({ key, result });\n  res.status(201).json(result);\n});",
    options: opts(
      'One charge: the retry finds the saved key',
      'The retry waits for the first request to finish',
      'One charge, and the retry gets a 409 Conflict',
      'Two charges: the key is saved too late',
    ),
    answerKey: 'd',
    explanation:
      'The key is only written after the 12 s charge. The retry arrives at 10 s, finds nothing, and charges again. Claim the key first, with an atomic insert on a unique index (status: "processing"), and make a concurrent repeat wait or get 409.',
    misconception:
      'Check-then-act is not atomic. An idempotency key only protects you if it is recorded before the side effect.',
    hint: 'When is the key saved, relative to when the retry arrives?',
  },
  {
    slug: 'http-lost-update-put',
    title: 'Two editors, one product',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 3,
    prompt:
      'Admins A and B both open product 9 (price 10, description "Old"). A saves price 12. A minute later B saves description "New". Both clients PUT the whole product they loaded. No If-Match is sent. What is stored?',
    options: opts(
      'Price 12, description "New": the edits merge',
      'Price 10, description "New": A\'s price change is lost',
      'B gets 409 Conflict and nothing changes',
      'Price 12, description "Old": B\'s save is ignored',
    ),
    answerKey: 'b',
    explanation:
      "PUT replaces the whole resource. B's body still carries the price 10 it loaded, so it silently overwrites A's change. This is a lost update. Send the ETag back in If-Match so a stale PUT gets 412, or use PATCH for the changed field.",
    misconception:
      'HTTP does not detect conflicting writes for you. Without a precondition, the last write simply wins.',
  },
  {
    slug: 'http-cdn-missing-vary',
    title: 'Bonjour, English user',
    topicSlug,
    subtopic: 'caching',
    type,
    difficulty: 3,
    prompt:
      'GET /home picks its language from Accept-Language and responds with Cache-Control: public, max-age=600 and no Vary header. A CDN sits in front. A French user loads it first, then an English user. What does the English user get?',
    options: opts(
      'The English page: the CDN reads Accept-Language',
      'A 406 Not Acceptable',
      'A cache miss, because the request headers differ',
      'The French page, served from the CDN cache',
    ),
    answerKey: 'd',
    explanation:
      'A shared cache keys on the URL unless the response says otherwise. Without Vary: Accept-Language, the CDN thinks one copy fits everyone and serves the French page for 10 minutes. Add Vary or put the language in the URL.',
    misconception:
      'Caches do not know which request headers your server looked at. The Vary header is how you tell them.',
  },
  {
    slug: 'http-stream-fails-midway',
    title: 'A 200 with half a file',
    topicSlug,
    subtopic: 'streaming',
    type,
    difficulty: 3,
    prompt:
      'The database connection drops after about 5,000 of 20,000 rows have been written. What does the client receive?',
    codeSnippet:
      "app.get('/report.csv', async (req, res) => {\n  res.status(200).type('text/csv');\n  res.write('id,total\\n');\n  for await (const row of db.streamOrders()) {\n    res.write(`${row.id},${row.total}\\n`);\n  }\n  res.end();\n});",
    options: opts(
      'A 500 from the error handler',
      'A 200 and about 5,000 rows, then the connection is cut',
      'A 200 with all 20,000 rows, after a retry',
      'A 503, then the client retries automatically',
    ),
    answerKey: 'b',
    explanation:
      'The status and headers went out with the first write. When the loop throws, it is too late to change them, so Express can only abort the connection. The client has a 200 and a truncated file. Detect it with a trailer row or a known length, or build the file first and send it complete.',
    misconception:
      'Error handlers cannot rewrite a status that is already on the wire. Once a response starts streaming, failures look like truncation.',
    hint: 'When was the 200 sent?',
  },
  {
    slug: 'http-301-post-becomes-get',
    title: 'The order that became a list',
    topicSlug,
    subtopic: 'redirects',
    type,
    difficulty: 3,
    prompt:
      'You moved the API and made POST /orders answer 301 Moved Permanently, Location: /v2/orders. A browser client sends POST /orders with a JSON body using fetch (default redirect: "follow"). What happens?',
    options: opts(
      'fetch re-sends the POST with its body to /v2/orders',
      'fetch stops and returns the 301 to the code',
      'fetch follows with a GET to /v2/orders, so no order is created',
      'The browser blocks the redirect as unsafe',
    ),
    answerKey: 'c',
    explanation:
      'For historical reasons, fetch turns a POST into a GET when following a 301 or 302, and drops the body. The client receives the order list (or a 404) instead of creating an order. Use 308 Permanent Redirect (or 307), which keeps the method and body.',
    misconception:
      '"Permanent" does not mean "same request again". Only 307 and 308 promise to keep the method.',
  },
];
