import type { ChallengeSeed } from '../../schema';

const topicSlug = 'js-async' as const;
const type = 'BUG_HUNT' as const;

/** JavaScript async: Bug Hunt, 6 per level (P10). answerKey is the 1-based buggy line. */
export const JS_ASYNC_BUG_HUNT: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'js-missing-await-fetch',
    title: 'Response is not a function',
    topicSlug,
    subtopic: 'async/await',
    type,
    difficulty: 1,
    prompt: 'This throws "res.json is not a function". Which line is the bug?',
    codeSnippet:
      'async function getUserName(id) {\n  const res = fetch(`/api/users/${id}`);\n  const user = await res.json();\n  return user.name;\n}',
    answerKey: '2',
    explanation:
      'fetch returns a promise. Without await, res is the pending promise, which has no json() method. The fix is const res = await fetch(...).',
    misconception:
      'An await later in the function does not apply to earlier calls: each promise needs its own await.',
  },
  {
    slug: 'js-settimeout-calls-now',
    title: 'The reminder that came too soon',
    topicSlug,
    subtopic: 'timers',
    type,
    difficulty: 1,
    prompt:
      'The reminder email goes out immediately instead of after a minute. Which line is the bug?',
    codeSnippet:
      "function scheduleReminder(user) {\n  console.log('Reminder scheduled for', user.email);\n  setTimeout(sendReminder(user), 60_000);\n}",
    answerKey: '3',
    explanation:
      'sendReminder(user) is called right away, and its return value is what gets handed to setTimeout. Pass a function instead: setTimeout(() => sendReminder(user), 60_000).',
    misconception:
      'setTimeout needs a function to call later, not the result of calling it now. The parentheses run the function on the spot.',
  },
  {
    slug: 'js-clear-interval-wrong-id',
    title: 'The ticker that never stops',
    topicSlug,
    subtopic: 'timers',
    type,
    difficulty: 1,
    prompt: 'This should tick three times and stop, but it ticks forever. Which line is the bug?',
    codeSnippet:
      "let count = 0;\nconst timer = setInterval(() => {\n  count += 1;\n  console.log('tick', count);\n  if (count === 3) clearInterval(count);\n}, 1000);",
    answerKey: '5',
    explanation:
      'clearInterval needs the id that setInterval returned, which is stored in timer. Passing count (the number 3) matches no interval, so nothing is cleared. Write clearInterval(timer).',
    misconception:
      'Timers are cancelled by their handle, not by any value you happen to be tracking. A wrong id fails silently instead of throwing.',
  },
  {
    slug: 'js-executor-never-resolves',
    title: 'Waiting forever',
    topicSlug,
    subtopic: 'promises',
    type,
    difficulty: 1,
    prompt: '"waited" prints, but "next" never does. Which line is the bug?',
    codeSnippet:
      "function wait(ms) {\n  return new Promise((resolve) => {\n    setTimeout(() => console.log('waited'), ms);\n  });\n}\nwait(100).then(() => console.log('next'));",
    answerKey: '3',
    explanation:
      'A promise only settles when you call resolve (or reject). The timer logs but never calls resolve, so the promise stays pending forever and .then() never runs. Write setTimeout(resolve, ms), or call resolve() inside the callback.',
    misconception:
      'Returning from the executor or finishing the timer does not resolve the promise. Only calling resolve does.',
  },
  {
    slug: 'js-async-check-truthy',
    title: 'Everyone is an admin',
    topicSlug,
    subtopic: 'async/await',
    type,
    difficulty: 1,
    prompt: 'Any user can delete any post. Which line is the bug?',
    codeSnippet:
      "async function isAdmin(userId) {\n  const user = await db.findUser(userId);\n  return user.role === 'admin';\n}\nasync function deletePost(userId, postId) {\n  if (!isAdmin(userId)) throw new Error('Forbidden');\n  return db.deletePost(postId);\n}",
    answerKey: '6',
    explanation:
      'isAdmin is async, so it returns a promise, and a promise object is always truthy. !isAdmin(userId) is therefore always false and the check never throws. Write if (!(await isAdmin(userId))).',
    misconception:
      'A promise is not its value. Using it in an if checks "does a promise exist", which is always yes.',
    hint: 'What type does isAdmin() return?',
  },
  {
    slug: 'js-callback-read-too-early',
    title: 'Config is undefined',
    topicSlug,
    subtopic: 'callbacks',
    type,
    difficulty: 1,
    prompt:
      'This crashes with "Cannot read properties of undefined (reading \'port\')". Which line is the bug?',
    codeSnippet:
      "const fs = require('fs');\nlet config;\nfs.readFile('config.json', 'utf8', (err, text) => {\n  config = JSON.parse(text);\n});\nconsole.log(config.port);",
    answerKey: '6',
    explanation:
      'fs.readFile is asynchronous: it starts the read and returns at once. Line 6 runs before the callback has set config. Use config inside the callback, or await fs.promises.readFile.',
    misconception:
      'Code after an async call does not wait for it just because it comes later in the file.',
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'js-foreach-async',
    title: 'All saved... too early',
    topicSlug,
    subtopic: 'async iteration',
    type,
    difficulty: 2,
    prompt: '"All saved" is logged before any item is saved. Which line causes it?',
    codeSnippet:
      "async function saveAll(items) {\n  items.forEach(async (item) => {\n    await db.save(item);\n  });\n  console.log('All saved');\n}",
    answerKey: '2',
    explanation:
      'forEach ignores the promises its callback returns, so nothing waits for the saves. Use for...of with await inside, or await Promise.all(items.map(...)).',
    misconception:
      'Marking the callback async does not make forEach wait. forEach has no idea the callback is asynchronous.',
    hint: 'What does forEach do with the value each callback returns?',
  },
  {
    slug: 'js-async-filter',
    title: 'The filter that keeps everyone',
    topicSlug,
    subtopic: 'async iteration',
    type,
    difficulty: 2,
    prompt: 'activeUsers() returns every user, including suspended ones. Which line is the bug?',
    codeSnippet:
      "async function activeUsers(users) {\n  return users.filter(async (u) => {\n    const status = await getStatus(u.id);\n    return status === 'active';\n  });\n}",
    answerKey: '2',
    explanation:
      'An async callback returns a promise, and filter only checks whether the return value is truthy. Every promise is truthy, so every user is kept. Look the statuses up first (await Promise.all(users.map(...))), then filter synchronously on the results.',
    misconception:
      'Array methods like filter, some and find do not await. They treat the promise itself as the answer.',
    hint: 'What does filter() see when the callback is async?',
  },
  {
    slug: 'js-catch-swallows-error',
    title: 'The error that changed its name',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 2,
    prompt:
      'When the price API is down, checkout fails with "Cannot destructure property \'amount\' of undefined" instead of the real error. Which line is the bug?',
    codeSnippet:
      'async function getPrice(id) {\n  try {\n    const res = await fetch(`${API}/prices/${id}`);\n    if (!res.ok) throw new Error(`HTTP ${res.status}`);\n    return await res.json();\n  } catch (err) {\n    logger.error(err);\n  }\n}\nasync function checkout(id) {\n  const { amount } = await getPrice(id);\n  return charge(amount);\n}',
    answerKey: '7',
    explanation:
      'The catch block logs the error and then falls off the end, so getPrice resolves with undefined. The caller crashes later with a confusing message. Rethrow after logging (logger.error(err); throw err;) or return an explicit fallback the caller can handle.',
    misconception:
      'Logging an error is not handling it. A catch that does not rethrow or return a real value turns a clear failure into undefined.',
  },
  {
    slug: 'js-batch-not-awaited',
    title: 'Batches that are not batches',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 2,
    prompt:
      'runInBatches(jobs, 5) should keep at most 5 jobs running, but the API sees all 500 at once. Which line is the bug?',
    codeSnippet:
      'async function runInBatches(jobs, size) {\n  for (let i = 0; i < jobs.length; i += size) {\n    const batch = jobs.slice(i, i + size);\n    batch.map((job) => job());\n  }\n}',
    answerKey: '4',
    explanation:
      'Calling job() starts it, but nothing waits for the batch to finish, so the loop races through all 100 batches in one go. Write await Promise.all(batch.map((job) => job())) so the next batch starts only after this one settles.',
    misconception:
      'Splitting work into groups does not limit concurrency by itself; the await between groups does.',
  },
  {
    slug: 'js-timeout-signal-missing',
    title: 'A timeout that never fires',
    topicSlug,
    subtopic: 'cancellation',
    type,
    difficulty: 2,
    prompt:
      'fetchWithTimeout(url, 2000) still waits minutes when the partner API hangs. Which line is the bug?',
    codeSnippet:
      'async function fetchWithTimeout(url, ms) {\n  const controller = new AbortController();\n  const timer = setTimeout(() => controller.abort(), ms);\n  try {\n    return await fetch(url);\n  } finally {\n    clearTimeout(timer);\n  }\n}',
    answerKey: '5',
    explanation:
      "controller.abort() runs after 2 s, but fetch was never given the controller's signal, so it has nothing to listen to. Write fetch(url, { signal: controller.signal }). (AbortSignal.timeout(ms) does the same in one line.)",
    misconception:
      'An AbortController does not cancel anything on its own. Only work that receives its signal can be aborted.',
  },
  {
    slug: 'js-on-instead-of-once',
    title: 'One more listener per message',
    topicSlug,
    subtopic: 'event emitters',
    type,
    difficulty: 2,
    prompt:
      'After a few hours of chatting, memory is high and Node prints MaxListenersExceededWarning. Which line is the bug?',
    codeSnippet:
      "function nextMessage(socket) {\n  return new Promise((resolve) => {\n    socket.on('message', resolve);\n  });\n}\nasync function chat(socket) {\n  while (socket.connected) {\n    const msg = await nextMessage(socket);\n    handle(msg);\n  }\n}",
    answerKey: '3',
    explanation:
      "Every call to nextMessage adds a listener and never removes it, so the socket collects one listener (and its closure) per message. Use socket.once('message', resolve), which removes itself after the first event, or use events.on(socket, 'message') as an async iterator.",
    misconception:
      'Resolving a promise does not unsubscribe the listener that resolved it. The emitter keeps a reference until you remove it.',
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'js-return-without-await',
    title: 'The catch that never catches',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 3,
    prompt: 'When fetchConfig() rejects, the default config is never used. Which line is the bug?',
    codeSnippet:
      'async function loadConfig() {\n  try {\n    return fetchConfig();\n  } catch (err) {\n    return DEFAULT_CONFIG;\n  }\n}',
    answerKey: '3',
    explanation:
      'return fetchConfig() hands the promise back without waiting, so the function leaves the try block before the rejection happens. return await fetchConfig() keeps the wait inside the try, and catch works.',
    misconception:
      '"return await is redundant" is only true outside try/catch. Inside it, the await is what makes catch work.',
    hint: 'When does the promise reject: before or after the function has left the try block?',
  },
  {
    slug: 'js-cached-rejection',
    title: 'One blip, broken until restart',
    topicSlug,
    subtopic: 'promises',
    type,
    difficulty: 3,
    prompt:
      'After a 2-second network blip at boot, every getConfig("flags") call fails until the process restarts. Which line is the bug?',
    codeSnippet:
      'const cache = new Map();\nfunction getConfig(key) {\n  if (!cache.has(key)) {\n    cache.set(key, fetchConfig(key));\n  }\n  return cache.get(key);\n}',
    answerKey: '4',
    explanation:
      'Caching the promise is a good idea (concurrent callers share one request), but a rejected promise is cached too and handed to every later caller. Evict on failure: cache.set(key, fetchConfig(key).catch((e) => { cache.delete(key); throw e; })).',
    misconception:
      'A promise is a result, not a request. Once it rejects it stays rejected; caching it caches the failure.',
    hint: 'What is stored in the map when fetchConfig rejects?',
  },
  {
    slug: 'js-pipe-error-crash',
    title: 'A missing file takes the server down',
    topicSlug,
    subtopic: 'streams',
    type,
    difficulty: 3,
    prompt:
      'When the export file is missing, the whole server process crashes. Which line is the bug?',
    codeSnippet:
      "app.get('/export', (req, res) => {\n  const file = fs.createReadStream(EXPORT_PATH);\n  res.setHeader('Content-Encoding', 'gzip');\n  file.pipe(zlib.createGzip()).pipe(res);\n});",
    answerKey: '4',
    explanation:
      '.pipe() does not forward errors. The read stream emits "error" (ENOENT) with no listener, and an unhandled "error" event on an emitter throws, crashing the process. Use stream.pipeline(file, zlib.createGzip(), res, (err) => ...), which wires up errors and destroys every stream on failure.',
    misconception:
      'Express catches errors thrown in your handler, not errors emitted later by streams. Each stream in a .pipe() chain needs its own error handling, which is why pipeline() exists.',
  },
  {
    slug: 'js-shutdown-close-not-awaited',
    title: 'Errors on every deploy',
    topicSlug,
    subtopic: 'graceful shutdown',
    type,
    difficulty: 3,
    prompt:
      'During every deploy a handful of in-flight requests fail with "Client was closed". Which line is the bug?',
    codeSnippet:
      "process.on('SIGTERM', async () => {\n  server.close();\n  await queue.drain();\n  await db.disconnect();\n  process.exit(0);\n});",
    answerKey: '2',
    explanation:
      'server.close() stops accepting new connections and returns at once; requests already in flight keep running. The handler moves on and disconnects the database underneath them. Wait for the close callback first: await new Promise((r) => server.close(r)).',
    misconception:
      'Closing a server is asynchronous. Without waiting for its callback, the shutdown steps race the requests still being served.',
  },
  {
    slug: 'js-check-then-act-await',
    title: 'Two refreshes, one revoked token',
    topicSlug,
    subtopic: 'race conditions',
    type,
    difficulty: 3,
    prompt:
      'Two requests that arrive together both call oauth.refresh(), and the provider revokes the first token. Which line is the bug?',
    codeSnippet:
      'const inFlight = new Set();\nasync function refreshToken(userId) {\n  if (inFlight.has(userId)) return;\n  try {\n    const token = await oauth.refresh(userId);\n    inFlight.add(userId);\n    await saveToken(userId, token);\n  } finally {\n    inFlight.delete(userId);\n  }\n}',
    answerKey: '6',
    explanation:
      'The guard is checked on line 3 but only set after an await. Both calls pass the check before either reaches line 6, so both refresh. Mark the work as in flight synchronously, before the first await (move inFlight.add above the refresh), or better, store the in-flight promise and let the second caller await it.',
    misconception:
      'Node has one thread, but every await is a point where another request can run. Check and set must happen with no await between them.',
    hint: 'What can run between line 3 and line 6?',
  },
  {
    slug: 'js-retry-fixed-delay',
    title: 'Retries in lockstep',
    topicSlug,
    subtopic: 'retries',
    type,
    difficulty: 3,
    prompt:
      'After a short outage, 2,000 clients retry in waves and knock the recovering service over again. Which line is the bug?',
    codeSnippet:
      'async function retry(fn, attempts = 5) {\n  for (let i = 0; i < attempts; i++) {\n    try {\n      return await fn();\n    } catch (err) {\n      if (i === attempts - 1) throw err;\n      await sleep(1000);\n    }\n  }\n}',
    answerKey: '7',
    explanation:
      'Every client that failed at the same moment waits exactly 1 s and retries at the same moment, so load arrives in synchronised spikes. Use exponential backoff with jitter, for example await sleep(Math.random() * 1000 * 2 ** i), which spreads retries out and gives the service room to recover.',
    misconception:
      'Retrying is not the problem; retrying in sync is. A fixed delay turns one failure into repeated thundering herds.',
  },
];
