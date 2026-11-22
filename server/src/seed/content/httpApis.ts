import { opts, type ChallengeSeed } from '../schema';

const topicSlug = 'http-apis' as const;

export const HTTP_APIS: ChallengeSeed[] = [
  {
    slug: 'http-param-type-mismatch',
    title: 'The item that exists but 404s',
    topicSlug,
    subtopic: 'routing',
    type: 'TRACE',
    difficulty: 2,
    prompt: 'items = [{ id: 42, name: "Lamp" }]. A client calls GET /items/42. What is the response?',
    codeSnippet:
      "app.get('/items/:id', (req, res) => {\n  const item = items.find((i) => i.id === req.params.id);\n  if (!item) return res.status(404).json({ error: 'Not found' });\n  res.json(item);\n});",
    options: opts('200 with the Lamp item', '404 Not found', '500 server error', '400 bad request'),
    answerKey: 'b',
    explanation:
      'Route params are always strings, so req.params.id is "42" while the stored id is the number 42. Strict equality fails, find returns undefined, and the handler sends 404.',
    misconception: 'Express does not convert path params to numbers. You must parse and validate them yourself.',
    hint: 'What type is req.params.id?',
  },
  {
    slug: 'http-cors-preflight',
    title: 'The request before the request',
    topicSlug,
    subtopic: 'CORS',
    type: 'TRACE',
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
    misconception: 'CORS is enforced by the browser, not the server. curl or a mobile app never sends a preflight.',
    hint: 'Some cross-origin requests need permission before they are sent.',
  },
  {
    slug: 'http-put-retries',
    title: 'Retrying a PUT',
    topicSlug,
    subtopic: 'idempotency',
    type: 'TRACE',
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
    misconception: 'Not every method is safe to retry: POST usually creates something new each time.',
  },
  {
    slug: 'http-missing-return',
    title: 'Headers already sent',
    topicSlug,
    subtopic: 'express handlers',
    type: 'BUG_HUNT',
    difficulty: 1,
    prompt: 'A login with no email crashes with "Cannot set headers after they are sent". Which line is the bug?',
    codeSnippet:
      "app.post('/login', (req, res) => {\n  if (!req.body.email) {\n    res.status(400).json({ error: 'Email required' });\n  }\n  const user = findUser(req.body.email);\n  res.json(user);\n});",
    answerKey: '3',
    explanation:
      'Sending a response does not stop the function. Without return, execution continues to line 6 and tries to send a second response. Write return res.status(400).json(...).',
    misconception: 'res.json() is not like throw: the handler keeps running after it.',
  },
  {
    slug: 'http-missing-ownership-check',
    title: 'Anyone can delete anything',
    topicSlug,
    subtopic: 'authorization',
    type: 'BUG_HUNT',
    difficulty: 3,
    prompt: 'Any logged-in user can delete any other user\'s post. Which line is the bug?',
    codeSnippet:
      "app.delete('/posts/:id', requireAuth, async (req, res) => {\n  const post = await Post.findById(req.params.id);\n  if (!post) return res.status(404).end();\n  await post.deleteOne();\n  res.status(204).end();\n});",
    answerKey: '4',
    explanation:
      'requireAuth checks who the user is (authentication), but nothing checks whether this user owns the post (authorization). The delete on line 4 runs for anyone. Check post.authorId against req.userId first and return 404 or 403 if they differ.',
    misconception: 'Being logged in is not permission. Every resource needs its own ownership check.',
    hint: 'Logged in, yes. But is it their post?',
  },
  {
    slug: 'http-status-validation',
    title: 'A missing field',
    topicSlug,
    subtopic: 'status codes',
    type: 'ENGINEER_CHOICE',
    difficulty: 1,
    prompt: 'A client sends POST /orders without the required "productId" field. What should the API return?',
    options: opts('200 with { "error": "missing productId" }', '400 Bad Request with a clear message', '404 Not Found', '500 Internal Server Error'),
    answerKey: 'b',
    explanation:
      '400 tells the client the request itself is wrong and should not be retried unchanged. A clear message saying which field is missing lets the client fix it.',
    misconception: 'Returning 200 with an error inside hides failures from clients, retries and monitoring.',
    optionFeedback: {
      a: '200 says it worked, so clients and dashboards miss the failure.',
      c: '404 means the resource or route does not exist.',
      d: '500 blames the server for a client mistake and invites useless retries.',
    },
  },
  {
    slug: 'http-401-vs-403',
    title: 'Logged in, but not allowed',
    topicSlug,
    subtopic: 'status codes',
    type: 'ENGINEER_CHOICE',
    difficulty: 1,
    prompt: 'A logged-in student calls GET /admin/reports, which only admins may see. Which status fits best?',
    options: opts('401 Unauthorized', '403 Forbidden', '400 Bad Request', '204 No Content'),
    answerKey: 'b',
    explanation:
      'The server knows who the user is but refuses the action, which is 403. 401 means the request has no valid credentials, so the client should log in.',
    misconception: '401 is about who you are (authentication). 403 is about what you may do (authorization).',
    optionFeedback: {
      a: 'The user is authenticated; logging in again will not help.',
      c: 'The request is well formed; the problem is permission.',
      d: '204 claims success with an empty body.',
    },
  },
  {
    slug: 'http-pagination',
    title: 'An endpoint that returns everything',
    topicSlug,
    subtopic: 'API design',
    type: 'ENGINEER_CHOICE',
    difficulty: 2,
    prompt: 'GET /orders returns all 200,000 orders in one response. The app is slow and the server runs out of memory. What do you change?',
    options: opts(
      'Paginate: return a limited page plus a cursor for the next one',
      'Gzip the response and keep returning everything',
      'Raise the server memory and request timeout',
      'Return everything once and cache it on the phone',
    ),
    answerKey: 'a',
    explanation:
      'Every list endpoint should be bounded. Cursor pagination returns, say, 50 orders and a cursor, so memory, query time and payload stay small no matter how big the table grows.',
    misconception: 'Compression and bigger servers delay the problem. The response still grows with your data.',
    optionFeedback: {
      b: 'Smaller over the wire, but the server still loads 200,000 rows.',
      c: 'Buys time until the table doubles.',
      d: 'The first load is still huge, and the cache goes stale.',
    },
    hint: 'Does the app ever need all 200,000 orders at once?',
  },
  {
    slug: 'http-idempotency-key',
    title: 'Charged twice',
    topicSlug,
    subtopic: 'idempotency',
    type: 'ENGINEER_CHOICE',
    difficulty: 2,
    prompt:
      'The mobile app retries POST /payments when the network times out. Some customers are charged twice. What is the robust fix?',
    options: opts(
      'Turn off retries in the app',
      'Send an idempotency key with each payment and have the server ignore repeats of the same key',
      'Increase the client timeout to 2 minutes',
      'Ask users to check their bank before retrying',
    ),
    answerKey: 'b',
    explanation:
      'The first request may have succeeded even though the response was lost. An idempotency key lets the server recognise a retry and return the original result instead of charging again.',
    misconception: 'A timeout does not mean the request failed. It means you do not know whether it did.',
    optionFeedback: {
      a: 'Real network failures then leave payments unconfirmed.',
      c: 'Timeouts still happen; double charges just become rarer.',
      d: 'Pushes an engineering problem onto customers.',
    },
    hint: 'How can the server tell a retry apart from a new payment?',
  },
  {
    slug: 'http-breaking-change',
    title: 'Renaming a field safely',
    topicSlug,
    subtopic: 'API versioning',
    type: 'ENGINEER_CHOICE',
    difficulty: 3,
    prompt:
      'You must rename "user_name" to "username" in a public API. An installed mobile app reads "user_name", and many users update slowly. What do you do?',
    options: opts(
      'Rename it today; the app will update eventually',
      'Return both fields for now, mark "user_name" deprecated, and remove it once old app versions are gone',
      'Return 410 Gone for old clients',
      'Rename it and force everyone to update the app tomorrow',
    ),
    answerKey: 'b',
    explanation:
      'An additive change never breaks existing clients. Sending both fields keeps old apps working while new ones move over. Remove the old field only when usage data shows old versions are gone.',
    misconception: 'You cannot deploy a mobile client the way you deploy a server. Old versions live for months.',
    optionFeedback: {
      a: 'Every user on the old version breaks immediately.',
      c: 'Turns a rename into an outage for old clients.',
      d: 'Forced updates frustrate users and still leave a broken window.',
    },
    hint: 'Can you make the change without removing anything yet?',
  },
];
