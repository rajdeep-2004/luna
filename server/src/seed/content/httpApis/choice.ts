import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'http-apis' as const;
const type = 'ENGINEER_CHOICE' as const;

/** HTTP & APIs: Engineer's Choice, 6 per level (P10). */
export const HTTP_APIS_CHOICE: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'http-status-validation',
    title: 'A missing field',
    topicSlug,
    subtopic: 'status codes',
    type,
    difficulty: 1,
    prompt:
      'A client sends POST /orders without the required "productId" field. What should the API return?',
    options: opts(
      '200 with { "error": "missing productId" }',
      '400 Bad Request with a clear message',
      '404 Not Found',
      '500 Internal Server Error',
    ),
    answerKey: 'b',
    explanation:
      '400 tells the client the request itself is wrong and should not be retried unchanged. A clear message saying which field is missing lets the client fix it.',
    misconception:
      'Returning 200 with an error inside hides failures from clients, retries and monitoring.',
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
    type,
    difficulty: 1,
    prompt:
      'A logged-in student calls GET /admin/reports, which only admins may see. Which status fits best?',
    options: opts('401 Unauthorized', '403 Forbidden', '400 Bad Request', '204 No Content'),
    answerKey: 'b',
    explanation:
      'The server knows who the user is but refuses the action, which is 403. 401 means the request has no valid credentials, so the client should log in.',
    misconception:
      '401 is about who you are (authentication). 403 is about what you may do (authorization).',
    optionFeedback: {
      a: 'The user is authenticated; logging in again will not help.',
      c: 'The request is well formed; the problem is permission.',
      d: '204 claims success with an empty body.',
    },
  },
  {
    slug: 'http-patch-one-field',
    title: 'Changing just the display name',
    topicSlug,
    subtopic: 'methods',
    type,
    difficulty: 1,
    prompt:
      'The profile screen lets a user change only their display name. Which request fits REST conventions best?',
    options: opts(
      'GET /users/me/update?displayName=Asha',
      'POST /users with { "displayName": "Asha" }',
      'DELETE /users/me, then POST the new profile',
      'PATCH /users/me with { "displayName": "Asha" }',
    ),
    answerKey: 'd',
    explanation:
      'PATCH means "apply these changes to this resource", so the client sends only the field it changes. The URL names the resource (the current user) and the method names the action.',
    misconception:
      'The method carries meaning. GET must never change data, and POST to a collection creates something new.',
    optionFeedback: {
      a: 'GET must be safe: caches, prefetchers and crawlers may call it without the user meaning to change anything.',
      b: 'POST to /users creates a new user rather than editing this one.',
      c: 'Deleting and recreating loses the id and everything linked to it.',
    },
  },
  {
    slug: 'http-token-in-header',
    title: 'Sending the access token',
    topicSlug,
    subtopic: 'authentication',
    type,
    difficulty: 1,
    prompt:
      'The mobile app has an access token and must send it with every API call. Where does it go?',
    options: opts(
      'Authorization: Bearer <token> header',
      'In the URL: ?token=…',
      'In a JSON body on every request, including GETs',
      'In the User-Agent string',
    ),
    answerKey: 'a',
    explanation:
      'The Authorization header is the standard place for credentials. Servers, proxies and libraries know to treat it as secret, and it works for every method.',
    misconception:
      'URLs are not private. They end up in logs, browser history and analytics, so a token there leaks.',
    optionFeedback: {
      b: 'Query strings are written to server and proxy logs, which leaks the token.',
      c: 'GET requests should not carry a body; many servers and proxies drop it.',
      d: 'User-Agent describes the client; servers log it and nothing treats it as a secret.',
    },
  },
  {
    slug: 'http-empty-list-200',
    title: 'A user with no orders',
    topicSlug,
    subtopic: 'status codes',
    type,
    difficulty: 1,
    prompt:
      'GET /users/7/orders is called for user 7, who exists but has never ordered. What should the API return?',
    options: opts('200 with { "items": [] }', '404 Not Found', '204 No Content', '400 Bad Request'),
    answerKey: 'a',
    explanation:
      'The collection exists and the request worked; it just has no items. 200 with an empty list lets the client render "No orders yet" with the same code it uses for a full list.',
    misconception:
      'Empty is not missing. 404 is for a resource that does not exist, like user 999.',
    optionFeedback: {
      b: 'Tells the client the user or route does not exist, which is false.',
      c: 'Technically allowed, but the client now needs a special case for "no body".',
      d: 'Nothing is wrong with the request.',
    },
  },
  {
    slug: 'http-validate-on-server',
    title: 'Who checks the input?',
    topicSlug,
    subtopic: 'validation',
    type,
    difficulty: 1,
    prompt:
      "The app's sign-up form already checks that the email looks valid and the password has 8+ characters. Where else must the API check them?",
    options: opts(
      'Nowhere: the form already checked',
      'Only in the database, with column types',
      'Only if the request came from a browser',
      'At the API boundary, with a schema, on every request',
    ),
    answerKey: 'd',
    explanation:
      'Anyone can call the API directly with curl or a script, skipping the form entirely. The server must validate every request itself; the form check just gives users faster feedback.',
    misconception:
      'Client-side validation is for user experience, not for security or correctness.',
    optionFeedback: {
      a: 'The form is easy to bypass; the API sees whatever is sent.',
      b: 'Column types catch some bad data late, with unfriendly errors, and miss rules like password length.',
      c: 'The server cannot tell reliably where a request came from.',
    },
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'http-pagination',
    title: 'An endpoint that returns everything',
    topicSlug,
    subtopic: 'API design',
    type,
    difficulty: 2,
    prompt:
      'GET /orders returns all 200,000 orders in one response. The app is slow and the server runs out of memory. What do you change?',
    options: opts(
      'Paginate: a limited page plus a cursor',
      'Gzip the response and keep returning everything',
      'Raise the server memory and request timeout',
      'Return everything once and cache it on the phone',
    ),
    answerKey: 'a',
    explanation:
      'Every list endpoint should be bounded. Cursor pagination returns, say, 50 orders and a cursor, so memory, query time and payload stay small no matter how big the table grows.',
    misconception:
      'Compression and bigger servers delay the problem. The response still grows with your data.',
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
    type,
    difficulty: 2,
    prompt:
      'The mobile app retries POST /payments when the network times out. Some customers are charged twice. What is the robust fix?',
    options: opts(
      'Turn off retries in the app',
      'An idempotency key per payment; the server ignores repeats',
      'Increase the client timeout to 2 minutes so fewer requests time out',
      'Ask users to check their bank before retrying',
    ),
    answerKey: 'b',
    explanation:
      'The first request may have succeeded even though the response was lost. An idempotency key lets the server recognise a retry and return the original result instead of charging again.',
    misconception:
      'A timeout does not mean the request failed. It means you do not know whether it did.',
    optionFeedback: {
      a: 'Real network failures then leave payments unconfirmed.',
      c: 'Timeouts still happen; double charges just become rarer.',
      d: 'Pushes an engineering problem onto customers.',
    },
    hint: 'How can the server tell a retry apart from a new payment?',
  },
  {
    slug: 'http-login-rate-limit',
    title: 'Thousands of password guesses',
    topicSlug,
    subtopic: 'rate limiting',
    type,
    difficulty: 2,
    prompt:
      'Logs show thousands of password guesses per hour against /login, spread across many accounts and a few hundred IPs. What do you add first?',
    options: opts(
      'A CAPTCHA on every page of the app',
      'Block every IP address outside your home country at the edge firewall',
      'Rate limits per IP and per account, with 429 and growing lockouts',
      'A longer minimum password length for new users',
    ),
    answerKey: 'c',
    explanation:
      'Limiting by IP slows a single attacker; limiting by account stops a distributed attack on one user. Growing lockouts (or delays) make guessing hopeless while a real user who mistypes twice is barely affected.',
    misconception:
      'Strong passwords do not stop guessing against existing weak ones. The endpoint itself must slow attackers down.',
    optionFeedback: {
      a: 'Annoys every user on every page and does nothing specific for /login abuse.',
      b: 'Blocks real travellers and is trivial to bypass with local proxies.',
      d: 'Only affects new passwords; existing accounts stay exposed.',
    },
  },
  {
    slug: 'http-202-long-job',
    title: 'A report that takes three minutes',
    topicSlug,
    subtopic: 'API design',
    type,
    difficulty: 2,
    prompt:
      "POST /reports builds a report that takes 2–3 minutes. The hosting platform's proxy cuts any request at 30 s. What do you change?",
    options: opts(
      'Ask the platform to raise its proxy timeout',
      'Have the app retry the POST until it succeeds',
      'Send a space every 10 s to keep the connection open until the report is ready',
      'Return 202 Accepted with a job id; the app polls GET /reports/:id',
    ),
    answerKey: 'd',
    explanation:
      'The slow work moves to a background job. The API answers at once with 202 and where to check, and the client polls (or is notified) until the report is ready. No request has to live for minutes.',
    misconception:
      'Not every operation fits in one request. Long work needs an asynchronous API shape.',
    optionFeedback: {
      a: 'Usually not possible on shared platforms, and long requests still break on flaky mobile networks.',
      b: 'Each retry starts another 3-minute report, and none of them ever finishes in 30 s.',
      c: 'A fragile hack: any proxy or client may still cut it, and the result has nowhere to go if it does.',
    },
  },
  {
    slug: 'http-static-asset-caching',
    title: 'Caching the web app',
    topicSlug,
    subtopic: 'caching',
    type,
    difficulty: 2,
    prompt:
      'Your web app ships index.html plus bundles whose names include a content hash, like app.3f9c1.js. Users must see a new release within a minute of deploying. Which cache headers do you use?',
    options: opts(
      'Hashed files: max-age=31536000, immutable. index.html: no-cache',
      'Everything: max-age=31536000',
      'Everything: no-store',
      'Everything: max-age=300, a short cache that is safe for every file',
    ),
    answerKey: 'a',
    explanation:
      'A hashed file never changes (a new build gets a new name), so it can be cached for a year. index.html is the entry point that names the bundles; no-cache makes browsers revalidate it every time, so a new release is picked up at once.',
    misconception:
      'One policy does not fit every file. Cache-busting filenames are what make long caching safe.',
    optionFeedback: {
      b: 'index.html would be stuck for a year, pointing at old bundles.',
      c: 'Users re-download every bundle on every visit.',
      d: 'Releases take up to 5 minutes to appear, and bundles are fetched again needlessly.',
    },
  },
  {
    slug: 'http-spa-token-storage',
    title: 'Keeping a web user logged in',
    topicSlug,
    subtopic: 'cookies',
    type,
    difficulty: 2,
    prompt:
      "A single-page web app on the same site as its API needs to keep users logged in. The security review's top concern is XSS stealing sessions. Where does the session token live?",
    options: opts(
      'In localStorage, sent as a Bearer header',
      'In sessionStorage, cleared when the tab closes',
      'In a cookie that JavaScript sets and reads',
      'In an HttpOnly, Secure, SameSite=Lax cookie',
    ),
    answerKey: 'd',
    explanation:
      'An HttpOnly cookie cannot be read by any script, so an XSS bug cannot copy the token out. Secure keeps it off plain HTTP, and SameSite=Lax blocks most cross-site request forgery; add a CSRF token for state-changing forms.',
    misconception: 'Storage that JavaScript can read is storage that injected JavaScript can read.',
    optionFeedback: {
      a: 'Any injected script can read localStorage and send the token away.',
      b: 'Same exposure as localStorage, just shorter-lived.',
      c: 'A JS-readable cookie is exactly what an XSS script looks for.',
    },
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'http-breaking-change',
    title: 'Renaming a field safely',
    topicSlug,
    subtopic: 'API versioning',
    type,
    difficulty: 3,
    prompt:
      'You must rename "user_name" to "username" in a public API. An installed mobile app reads "user_name", and many users update slowly. What do you do?',
    options: opts(
      'Rename it today; the app will update eventually',
      'Send both, deprecate the old one, remove it when unused',
      'Return 410 Gone to old clients so they are forced to update',
      'Rename it and force everyone to update the app tomorrow',
    ),
    answerKey: 'b',
    explanation:
      'An additive change never breaks existing clients. Sending both fields keeps old apps working while new ones move over. Remove the old field only when usage data shows old versions are gone.',
    misconception:
      'You cannot deploy a mobile client the way you deploy a server. Old versions live for months.',
    optionFeedback: {
      a: 'Every user on the old version breaks immediately.',
      c: 'Turns a rename into an outage for old clients.',
      d: 'Forced updates frustrate users and still leave a broken window.',
    },
    hint: 'Can you make the change without removing anything yet?',
  },
  {
    slug: 'http-webhook-receiver',
    title: 'Webhooks that arrive twice',
    topicSlug,
    subtopic: 'webhooks',
    type,
    difficulty: 3,
    prompt:
      'A payment provider sends webhooks at least once and retries any that do not get a 2xx within 10 s. Fulfilling an order takes about 15 s. Orders must never ship twice or be lost. How do you handle the webhook?',
    options: opts(
      'Fulfil the order inside the handler, then reply 200 when it is done',
      'Reply 200 at once, then fulfil in the same process',
      'Verify, store the event id (unique), enqueue a job, reply 200',
      'Reply 500 so the provider retries when you are less busy',
    ),
    answerKey: 'c',
    explanation:
      'Verifying and storing the event is fast, so the provider gets its 2xx well within 10 s. The unique event id turns retries and duplicates into no-ops, and the durable job survives a crash while the 15 s fulfilment runs.',
    misconception:
      'Delivered once is never guaranteed. Webhook receivers must be idempotent and fast, with the real work done elsewhere.',
    optionFeedback: {
      a: 'Every call times out at 10 s, so each event is delivered again and fulfilled several times.',
      b: 'Fast, but a crash or deploy mid-fulfilment loses the order, and duplicates still ship twice.',
      d: 'Every event fails on purpose; the provider eventually gives up and orders are lost.',
    },
  },
  {
    slug: 'http-bff-aggregate',
    title: 'Fourteen calls on 3G',
    topicSlug,
    subtopic: 'API design',
    type,
    difficulty: 3,
    prompt:
      'The mobile home screen makes 14 API calls on cold start, in chains where each needs the previous result. On 3G (about 300 ms per round trip) users wait 6 s. You have two weeks. What do you do?',
    options: opts(
      'A /home endpoint that gathers the data server-side in one call',
      'Turn on HTTP/2 so all the calls are multiplexed over one connection',
      'Cache every response on the phone for 24 hours',
      'Rewrite the whole API in GraphQL',
    ),
    answerKey: 'a',
    explanation:
      'The cost is round trips in a dependency chain, so remove them from the slow link. One screen-shaped endpoint (a backend-for-frontend) makes the dependent calls inside the data centre, where each hop takes milliseconds, and sends one response over 3G.',
    misconception:
      'Parallel transport does not fix sequential dependencies. HTTP/2 can only overlap requests the client is able to send at once.',
    optionFeedback: {
      b: 'Helps independent requests, but each call here waits for the previous answer, so the chain stays.',
      c: 'Cold start has nothing cached yet, and a day-old home screen is stale.',
      d: 'Could solve it, but not safely in two weeks across the whole API.',
    },
  },
  {
    slug: 'http-if-match-conflicts',
    title: 'Two agents, one ticket',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 3,
    prompt:
      'Support agents edit tickets in a web app. Sometimes two agents change the same field of the same ticket a few seconds apart, and one change silently disappears. Edits must never be lost without the agent knowing. What do you build?',
    options: opts(
      'Last write wins, ordered by a client timestamp',
      'Lock a ticket for 30 minutes as soon as an agent opens it for editing',
      'Send only changed fields with PATCH',
      'If-Match with the ETag; a stale save gets 412 to review',
    ),
    answerKey: 'd',
    explanation:
      'Optimistic concurrency: each save says which version it was based on. If someone else saved in between, the server refuses with 412, and the app shows the newer version so the agent can merge. Nothing is lost silently and nobody is blocked.',
    misconception:
      'Avoiding conflicts and detecting them are different. When two people really edit the same field, the system must detect it.',
    optionFeedback: {
      a: 'Still silently drops one edit, and client clocks disagree.',
      b: 'Abandoned tabs keep tickets locked and agents waiting.',
      c: 'Fixes edits to different fields, but two edits to the same field still overwrite each other.',
    },
  },
  {
    slug: 'http-distributed-rate-limit',
    title: 'One limit, six instances',
    topicSlug,
    subtopic: 'rate limiting',
    type,
    difficulty: 3,
    prompt:
      'The API runs on 6 instances behind a round-robin load balancer, and instances scale up at peak. Each API key may make 100 requests per minute in total. Where do you keep the counters?',
    options: opts(
      'In memory on each instance, at 100 per key',
      'In memory, with sticky sessions so each API key always hits one instance',
      'In memory, at 100 ÷ 6 ≈ 17 per key per instance',
      'In Redis: one counter per key and window, INCR + TTL set atomically',
    ),
    answerKey: 'd',
    explanation:
      'A shared store gives every instance the same count, and INCR is atomic, so concurrent requests on different instances cannot both slip under the limit. Setting the TTL in the same atomic step (a Lua script, MULTI, or SET key 0 NX EX first) means a crash cannot leave a counter that never expires. It stays correct as instances are added or removed.',
    misconception:
      'Per-instance state is not per-service state. Anything that must be global needs a shared, atomic store.',
    optionFeedback: {
      a: 'Each instance allows 100, so a key can make up to 600 a minute.',
      b: 'Helps until scaling or a restart moves keys, and one hot key overloads one instance.',
      c: 'Breaks as soon as the instance count changes, and uneven routing blocks keys early.',
    },
  },
  {
    slug: 'http-live-updates-sse',
    title: 'Live order status',
    topicSlug,
    subtopic: 'real-time',
    type,
    difficulty: 3,
    prompt:
      'A web page shows live order status to 50,000 concurrent users. Updates go server → client only, a few times per order, and must appear within 1 s. The infrastructure already proxies long-lived HTTP responses well. What do you use?',
    options: opts(
      'Poll GET /orders/:id every second',
      'WebSockets, with a reconnect and heartbeat layer',
      'Server-Sent Events over plain HTTP',
      'Long polling with a 30 s timeout',
    ),
    answerKey: 'c',
    explanation:
      'SSE is a one-way stream over an ordinary HTTP response, with automatic reconnects and Last-Event-ID built into the browser. It fits server-to-client updates, meets the 1 s target, and works with the HTTP infrastructure you already have.',
    misconception:
      'WebSockets are not the default for "real-time". When data flows one way, a simpler HTTP stream does the job.',
    optionFeedback: {
      a: '50,000 requests per second, almost all of them answering "no change".',
      b: 'Works, but adds a two-way protocol, its own reconnect logic and proxy setup for traffic that only flows one way.',
      d: 'Meets the target, but every update and every timeout costs a new request and reconnect.',
    },
  },
];
