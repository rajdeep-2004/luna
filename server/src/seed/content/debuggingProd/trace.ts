import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'debugging-prod' as const;
const type = 'TRACE' as const;

/** Debugging & production: Trace the Stack, 6 per level (P12). */
export const DEBUGGING_PROD_TRACE: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'prod-log-levels',
    title: 'Which logs survive?',
    topicSlug,
    subtopic: 'logging',
    type,
    difficulty: 1,
    prompt: 'The logger is set to level "warn". Which messages are written?',
    codeSnippet:
      "const logger = pino({ level: 'warn' });\nlogger.debug('cache miss');\nlogger.info('user logged in');\nlogger.warn('slow query');\nlogger.error('payment failed');",
    options: opts(
      'All four',
      "'slow query' and 'payment failed'",
      "Only 'payment failed'",
      "Only 'slow query', since the level is warn",
    ),
    answerKey: 'b',
    explanation:
      'A log level is a minimum. "warn" writes warn and anything more severe (error, fatal), and drops debug and info.',
    misconception:
      'Setting a level does not mean "only this level". It means "this level and above".',
  },
  {
    slug: 'prod-read-stack-trace',
    title: 'Where did it break?',
    topicSlug,
    subtopic: 'stack traces',
    type,
    difficulty: 1,
    prompt: 'This error is in the server log. Which line of code tried to read .email?',
    codeSnippet:
      "TypeError: Cannot read properties of undefined (reading 'email')\n    at sendReceipt (/app/src/mail.js:14:22)\n    at completeOrder (/app/src/orders.js:41:9)\n    at async /app/src/routes.js:8:5",
    options: opts(
      'routes.js line 8, because the request started there',
      'orders.js line 41, the middle of the chain',
      'mail.js line 14, inside sendReceipt',
      "A line inside Node's internals, which the trace hides",
    ),
    answerKey: 'c',
    explanation:
      'The top frame is where the error was thrown: sendReceipt in mail.js, line 14, column 22. Each frame below is the caller of the one above, so orders.js:41 called sendReceipt and routes.js:8 called completeOrder. The bug is that sendReceipt got an undefined user; the frames below tell you where that value came from.',
    misconception:
      'A stack trace reads top-down from where it broke to who called it. The bottom frame is where the request entered, not where it failed.',
  },
  {
    slug: 'prod-catch-then-continue',
    title: 'Declined, but ok',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 1,
    prompt: "chargeCard() rejects with new Error('card declined'). What does handler() do?",
    codeSnippet:
      "async function handler() {\n  try {\n    await chargeCard();\n  } catch (err) {\n    logger.error(err.message);\n  }\n  return 'ok';\n}",
    options: opts(
      "It rejects with 'card declined', because the error is logged and then passed on",
      "It logs nothing and resolves to undefined",
      'It rejects with an unhandled rejection, which crashes the process',
      "It logs 'card declined' and resolves to 'ok'",
    ),
    answerKey: 'd',
    explanation:
      "The catch block logs the message and ends. Nothing rethrows, so the function carries on to return 'ok' and the caller thinks the payment worked. Logging is not handling: either rethrow or return a failure the caller has to look at.",
    misconception:
      'A catch block does not pass the error on by itself. Once caught, the error is gone unless you throw it again.',
  },
  {
    slug: 'prod-average-outlier',
    title: 'One slow request',
    topicSlug,
    subtopic: 'metrics',
    type,
    difficulty: 1,
    prompt:
      'Ten requests were measured. Nine took 100 ms and one took 2,000 ms. What are the average and the median?',
    options: opts(
      'Average 290 ms, median 100 ms',
      'Average 100 ms, median 290 ms',
      'Both are 290 ms',
      'Average 1,050 ms, median 100 ms',
    ),
    answerKey: 'a',
    explanation:
      'The average is (9 × 100 + 2,000) / 10 = 290 ms, pulled up by one slow request. The median is the middle value of the sorted list, and the middle requests both took 100 ms. Neither number tells you that one user waited 2 seconds; that is what high percentiles (p95, p99) and the max are for.',
    misconception:
      '1,050 ms averages the two distinct values instead of all ten requests. An average weights every request, and one outlier can move it a lot.',
  },
  {
    slug: 'prod-env-string-false',
    title: 'Debug mode is off. Right?',
    topicSlug,
    subtopic: 'configuration',
    type,
    difficulty: 1,
    prompt:
      'Production has the environment variable DEBUG_PAYMENTS=false. Does this code log the card details?',
    codeSnippet:
      "if (process.env.DEBUG_PAYMENTS) {\n  logger.info({ card: req.body.card }, 'payment debug');\n}",
    options: opts(
      'No: the value is false, so the block is skipped',
      'No: Node converts "false" to the boolean false',
      'Yes: the value is the string "false", which is truthy',
      'It throws, because env values must be compared with ===',
    ),
    answerKey: 'c',
    explanation:
      'Every environment variable is a string. "false" is a non-empty string, and every non-empty string is truthy, so the block runs and card details reach the logs. Parse flags explicitly in one config module, for example DEBUG_PAYMENTS === "true", or with a schema such as Zod.',
    misconception:
      'process.env never holds booleans or numbers. It only holds strings (or undefined when the variable is missing).',
  },
  {
    slug: 'prod-unhandled-rejection-crash',
    title: 'One report, every user',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 1,
    prompt:
      'On Node 22 with Express 5, buildReport() rejects with an error. Nothing else listens for errors. What happens?',
    codeSnippet:
      "app.get('/report', (req, res) => {\n  buildReport().then((report) => res.json(report));\n});",
    options: opts(
      'Express 5 catches it and returns a 500 to this user',
      'Node prints a warning, and only this request hangs',
      'The request gets an empty 200 response',
      'The process exits on the unhandled rejection, dropping every in-flight request',
    ),
    answerKey: 'd',
    explanation:
      'The handler does not return the promise, so Express never sees it. The rejection has no .catch, and since Node 15 an unhandled rejection ends the process. Every user with a request in flight loses it, not only the one who asked for the report. Make the handler async and await the call (Express 5 forwards the error to the error handler), or add a .catch.',
    misconception:
      'Express 5 only catches rejections from promises the handler returns. A promise started and forgotten inside the handler is invisible to it.',
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'prod-global-request-id',
    title: 'Whose payment was that?',
    topicSlug,
    subtopic: 'observability',
    type,
    difficulty: 2,
    prompt:
      "Request A (x-request-id: 'a') arrives at t = 0. Request B (x-request-id: 'b') arrives at t = 50 ms. chargeCard() takes 200 ms. Which ids do the two 'charged' log lines carry?",
    codeSnippet:
      "let currentRequestId;\napp.use((req, res, next) => {\n  currentRequestId = req.get('x-request-id');\n  next();\n});\napp.post('/pay', async (req, res) => {\n  await chargeCard(req.body);\n  logger.info({ requestId: currentRequestId }, 'charged');\n  res.sendStatus(204);\n});",
    options: opts(
      "Both lines say 'b'",
      "'a' then 'b', because each request has its own handler call",
      "Both lines say 'a'",
      'The first line has no id, the second says b',
    ),
    answerKey: 'a',
    explanation:
      "There is one currentRequestId for the whole process. A sets it to 'a', then awaits. While A waits, B arrives and overwrites it with 'b'. When A resumes at 200 ms and logs, it reads 'b', and so does B at 250 ms. Keep per-request data on the request (req.log = logger.child({ requestId })) or in AsyncLocalStorage.",
    misconception:
      'Node serves many requests at once on one thread. A module-level variable is shared by all of them, and every await is a chance for another request to change it.',
    hint: 'What runs while request A is waiting for chargeCard()?',
  },
  {
    slug: 'prod-retry-amplification',
    title: 'One click, many queries',
    topicSlug,
    subtopic: 'retries',
    type,
    difficulty: 2,
    prompt:
      'The client calls withRetry(callApi). Each API request runs withRetry(queryDb). The database is down, so every query fails. How many queries does one user click send to the database?',
    codeSnippet:
      'async function withRetry(fn, retries = 3) {\n  for (let attempt = 0; attempt <= retries; attempt++) {\n    try {\n      return await fn();\n    } catch (err) {\n      if (attempt === retries) throw err;\n    }\n  }\n}',
    options: opts('4', '16', '12', '9'),
    answerKey: 'b',
    explanation:
      'attempt runs 0, 1, 2, 3, so one withRetry makes 4 calls (1 try plus 3 retries). The client makes 4 API calls, and each API call makes 4 database queries: 4 × 4 = 16. Retrying at every layer multiplies load on the part that is already failing. Retry at one layer, and give retries a budget.',
    misconception:
      'Retries at different layers do not add up, they multiply. Three layers with 3 retries each turn one click into 64 calls.',
  },
  {
    slug: 'prod-race-timeout-no-cancel',
    title: 'Timed out, still running',
    topicSlug,
    subtopic: 'timeouts',
    type,
    difficulty: 2,
    prompt: 'fetchInventory() takes 8 s. What is true at t = 5 s?',
    codeSnippet:
      "const timeout = new Promise((_, reject) =>\n  setTimeout(() => reject(new Error('timeout')), 2000),\n);\ntry {\n  return await Promise.race([fetchInventory(), timeout]);\n} catch (err) {\n  return fallbackInventory();\n}",
    options: opts(
      'Promise.race cancelled fetchInventory() at 2 s, so its connection is closed',
      'The caller is still waiting, because race waits for the slower promise to settle',
      'Both promises rejected at 2 s and fetchInventory() reports an AbortError',
      'The caller got the fallback at 2 s, and the inventory request is still running',
    ),
    answerKey: 'd',
    explanation:
      'Promise.race settles with the first promise to settle, so the timeout wins at 2 s and the caller gets the fallback. Nothing tells fetchInventory() to stop: promises cannot be cancelled, so the request keeps its socket and keeps the other service busy until 8 s. To really stop it, pass an AbortSignal (AbortSignal.timeout(2000)) into the fetch.',
    misconception:
      'A timeout around a promise only stops you waiting. The work behind it carries on unless you abort it.',
  },
  {
    slug: 'prod-sync-hash-blocks-health',
    title: 'Health check, held up',
    topicSlug,
    subtopic: 'event loop',
    type,
    difficulty: 2,
    prompt:
      'pbkdf2Sync with these settings takes about 1.5 s of CPU. A /hash request arrives at t = 0, and a /health request at t = 0.1 s. When does /health get its response?',
    codeSnippet:
      "app.get('/health', (req, res) => res.send('ok'));\napp.post('/hash', (req, res) => {\n  const key = crypto.pbkdf2Sync(req.body.pw, salt, 1_000_000, 64, 'sha512');\n  res.send(key.toString('hex'));\n});",
    options: opts(
      'At about 0.1 s, because /health is a different route',
      'At about 0.1 s, because Node runs crypto on a thread pool',
      'At about 1.5 s, once the hash has finished',
      'Never: the health request is dropped while the CPU is busy',
    ),
    answerKey: 'c',
    explanation:
      'pbkdf2Sync runs on the main thread, and Node has one main thread for all JavaScript. Until it returns, no other callback can run, so the /health request waits in the queue and is answered at about 1.5 s. Under load this fails health checks and gets healthy instances restarted. Use the async crypto.pbkdf2 (it runs on the libuv thread pool) or a worker.',
    misconception:
      'Only the async crypto functions use the thread pool. The ...Sync versions block the event loop for every request.',
  },
  {
    slug: 'prod-error-handler-order',
    title: 'The handler that never ran',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 2,
    prompt: "On Express 5, GET /items throws. What does the client get, and what does logger.error log?",
    codeSnippet:
      "app.use((err, req, res, next) => {\n  logger.error({ err }, 'request failed');\n  res.status(500).json({ error: 'internal' });\n});\napp.get('/items', async () => {\n  throw new Error('db down');\n});",
    options: opts(
      "A JSON 500 { error: 'internal' }, and the error is logged",
      "Express's default 500 page, and logger.error logs nothing",
      'The request hangs, because async errors need next(err)',
      'The process crashes with an unhandled rejection',
    ),
    answerKey: 'b',
    explanation:
      "Express 5 does pass a rejected async handler to the error chain, so it neither hangs nor crashes. But middleware runs in the order it was registered, and the error handler sits before the route, so no error handler comes after it. Express falls back to its built-in handler, which sends a plain 500 page; your JSON format and your logger.error never run. Register error handlers last.",
    misconception:
      'An error handler is not global. It only catches errors from the routes and middleware registered before it.',
  },
  {
    slug: 'prod-stringify-error-empty',
    title: 'An empty error',
    topicSlug,
    subtopic: 'logging',
    type,
    difficulty: 2,
    prompt: "chargeCard() rejects with new Error('card declined'). What does the log line say?",
    codeSnippet:
      "try {\n  await chargeCard();\n} catch (err) {\n  console.log(JSON.stringify({ event: 'charge_failed', err }));\n}",
    options: opts(
      '{"event":"charge_failed","err":{}}',
      '{"event":"charge_failed","err":"Error: card declined"}',
      '{"event":"charge_failed","err":{"message":"card declined","stack":"..."}}',
      'It throws, because an Error cannot be serialised',
    ),
    answerKey: 'a',
    explanation:
      "An Error's message and stack are own properties, but they are not enumerable, and JSON.stringify only writes enumerable properties. The error comes out as {}, so the log shows that something failed but not what. Log err.message and err.stack explicitly, or use a logger with an error serializer (pino does this for the err key).",
    misconception:
      'Logging an object does not mean you can read it later. Check what your serializer actually writes for errors.',
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'prod-sigterm-grace-period',
    title: 'The export that never finished',
    topicSlug,
    subtopic: 'graceful shutdown',
    type,
    difficulty: 3,
    prompt:
      'During a deploy the platform sends SIGTERM, waits 30 s, then sends SIGKILL. A CSV export that needs 40 s more is in progress. What happens to it?',
    codeSnippet:
      "process.on('SIGTERM', () => {\n  logger.info('draining');\n  server.close(() => process.exit(0));\n});",
    options: opts(
      'server.close() aborts it at once, and the process exits 0',
      'Node waits for it, the export finishes at 40 s, and the process exits 0',
      'It is cut off at 30 s by SIGKILL, and process.exit(0) never runs',
      'The platform sees the open connection and extends the grace period',
    ),
    answerKey: 'c',
    explanation:
      'server.close() stops new connections and waits for in-flight requests, so the export keeps going. But the platform only waits 30 s, then SIGKILL ends the process without running any handler. The user gets a reset connection and the close callback never fires. Long jobs belong in a background worker that can resume, or the grace period must cover the longest request.',
    misconception:
      'Graceful shutdown is a race against the platform timer. Draining only works for requests shorter than the grace period.',
  },
  {
    slug: 'prod-backoff-no-jitter',
    title: 'The second wave',
    topicSlug,
    subtopic: 'retries',
    type,
    difficulty: 3,
    prompt:
      'At t = 0 all 1,000 clients fail together because the API restarted. It is healthy again at t = 2 s and can take about 300 requests per second. What does it see next?',
    codeSnippet:
      'for (let attempt = 1; attempt <= 3; attempt++) {\n  try {\n    return await callApi();\n  } catch {\n    await sleep(1000 * 2 ** (attempt - 1));\n  }\n}',
    options: opts(
      'A steady 300 requests per second, because the delays double',
      'About 1,000 requests at t = 3 s, all at once',
      'About 333 requests per second between t = 2 s and t = 5 s',
      'Nothing: the clients gave up at t = 2 s',
    ),
    answerKey: 'b',
    explanation:
      'Each client tries at t = 0, sleeps 1 s, tries at t = 1 (the API is still down), sleeps 2 s, and tries again at t = 3. Every client uses the same delays from the same start time, so all 1,000 retries land in the same instant, more than three times what the API can take, and it can fall over again. Adding random jitter (sleep a random time up to the backoff) spreads the retries out.',
    misconception:
      'Exponential backoff alone does not spread load. Clients that failed together retry together; jitter is what breaks them apart.',
  },
  {
    slug: 'prod-promise-all-partial-failure',
    title: 'Charged, not shipped',
    topicSlug,
    subtopic: 'partial failure',
    type,
    difficulty: 3,
    prompt:
      'reserveStock rejects at 100 ms ("out of stock"). chargeCard succeeds at 300 ms and sendConfirmation succeeds at 500 ms. What is the state at t = 1 s?',
    codeSnippet:
      "try {\n  await Promise.all([\n    chargeCard(order),\n    reserveStock(order),\n    sendConfirmation(order),\n  ]);\n} catch (err) {\n  await markFailed(order.id);\n  return res.status(409).json({ error: 'Out of stock' });\n}",
    options: opts(
      'Nothing happened: Promise.all is all-or-nothing',
      'The card was refunded automatically when Promise.all rejected',
      'Only the stock check ran, because Promise.all stops the other calls at the first failure',
      'The order is marked failed, but the card was charged and the email was sent',
    ),
    answerKey: 'd',
    explanation:
      'Promise.all starts all three calls at once and rejects as soon as one fails, at 100 ms. It does not stop the others: they are already running, so the charge lands at 300 ms and the confirmation goes out at 500 ms. The customer is charged, told the order is confirmed, and shown "Out of stock". Steps with side effects need an order (check stock, then charge) or compensation (refund on failure).',
    misconception:
      'Promise.all rejects fast but it is not a transaction. It cannot undo work that has already started.',
    hint: 'Does rejecting stop the promises that are already running?',
  },
  {
    slug: 'prod-pool-held-across-api-call',
    title: 'Ten in, ten out',
    topicSlug,
    subtopic: 'resource exhaustion',
    type,
    difficulty: 3,
    prompt:
      'The database is idle and the payment API takes about 2 s. Twenty checkouts arrive at the same moment. What happens?',
    codeSnippet:
      "const pool = new Pool({ max: 10, connectionTimeoutMillis: 1000 });\napp.post('/checkout', async (req, res) => {\n  const client = await pool.connect();\n  try {\n    await client.query('BEGIN');\n    await paymentApi.charge(req.body);\n    await client.query('COMMIT');\n  } finally {\n    client.release();\n  }\n  res.sendStatus(201);\n});",
    options: opts(
      '10 succeed at about 2 s; the other 10 fail at about 1 s waiting for a connection',
      'All 20 succeed at about 2 s, because the database is idle',
      'All 20 succeed: the second 10 finish at about 4 s',
      'All 20 fail, because 20 is more than the pool size',
    ),
    answerKey: 'a',
    explanation:
      'Each request takes a connection and holds it, with a transaction open, for the whole 2 s payment call. The first 10 take every connection. The other 10 wait in the pool queue, and after connectionTimeoutMillis (1 s) they fail with "timeout exceeded when trying to connect", long before a connection frees up. The database is idle the whole time. Do the slow external call outside the transaction.',
    misconception:
      'A connection pool can run out while the database does nothing. What matters is how long each request holds its connection.',
  },
  {
    slug: 'prod-error-budget-burn-rate',
    title: 'How long is left?',
    topicSlug,
    subtopic: 'SLOs',
    type,
    difficulty: 3,
    prompt:
      'The SLO is 99.9% successful requests over 30 days, and the month started with the whole error budget. Since an hour ago, 1.44% of requests fail. If that continues, how long until the 30-day budget is gone?',
    options: opts(
      'About 30 days: the budget is monthly',
      'About 50 hours',
      'About 3.6 hours',
      'About 14 hours',
    ),
    answerKey: 'b',
    explanation:
      'The budget is 0.1% of a month of requests. Failing 1.44% means burning it 14.4 times faster than the rate that would last exactly 30 days, so it lasts 30 days / 14.4 ≈ 50 hours. That "burn rate" is how SLO alerts decide urgency: 14.4× is a classic page-now threshold, because two days of budget can go in one weekend.',
    misconception:
      'An error rate of 1.44% sounds small. Measured against a 0.1% budget it is an emergency.',
  },
  {
    slug: 'prod-timeout-retry-duplicate',
    title: 'It failed twice. Two orders.',
    topicSlug,
    subtopic: 'idempotency',
    type,
    difficulty: 3,
    prompt:
      'The server takes about 3 s to handle POST /orders and inserts the order at the end, without checking whether the client is still connected. The client code below runs once. How many orders exist 10 s later, and what does the user see?',
    codeSnippet:
      "for (let i = 0; i < 2; i++) {\n  try {\n    return await fetch('/orders', {\n      method: 'POST',\n      body,\n      signal: AbortSignal.timeout(2000),\n    });\n  } catch {}\n}\nshowError('Could not place order');",
    options: opts(
      'No orders, because the client aborted both requests',
      'One order, because the second request replaces the first',
      'Two orders, and the user sees "Could not place order"',
      'Two orders, and the user sees a success message',
    ),
    answerKey: 'c',
    explanation:
      'Aborting stops the client waiting; it does not undo the request on the server. Both POSTs reach the server, and each inserts an order at about 3 s, while the client gave up at 2 s each time and shows an error. The user may then try again by hand. Send an idempotency key generated once per order attempt, and have the server return the first result for a repeated key.',
    misconception:
      'A client timeout means "I do not know", not "it did not happen". Retrying a non-idempotent write after a timeout can apply it twice.',
  },
];
