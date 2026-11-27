import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'js-async' as const;
const type = 'ENGINEER_CHOICE' as const;

/** JavaScript async: Engineer's Choice, 6 per level (P10). */
export const JS_ASYNC_CHOICE: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'js-sequential-awaits',
    title: 'Two calls, twice the wait',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 1,
    prompt:
      'A handler awaits getUser() and then getOrders(). Each takes about 1 s and neither depends on the other. How do you make it faster?',
    options: opts(
      'Start both, then await Promise.all',
      'Wrap each call in setTimeout(..., 0)',
      'Chain them with .then() instead of await',
      'Switch both calls to callbacks',
    ),
    answerKey: 'a',
    explanation:
      'Independent work can run concurrently. Starting both calls and awaiting Promise.all brings the total time down to the slower call, about 1 s.',
    misconception:
      'await does not have to be one at a time: you can start many promises first and wait for them together.',
    optionFeedback: {
      b: 'setTimeout only delays work; the calls still finish in about 2 s.',
      c: 'getUser().then(() => getOrders()) is the same sequence in different syntax: still about 2 s.',
      d: 'Callbacks change the syntax, not the order you wait in.',
    },
  },
  {
    slug: 'js-allsettled-report',
    title: 'Report every result',
    topicSlug,
    subtopic: 'promises',
    type,
    difficulty: 1,
    prompt:
      'You send 10 push notifications at once and must report which ones succeeded and which failed. One failure must not hide the others. What do you use?',
    options: opts(
      'Promise.all, then read the results',
      'Promise.race, then read the winner',
      'Promise.allSettled, then check each status',
      'Promise.any, then read the first success',
    ),
    answerKey: 'c',
    explanation:
      'Promise.allSettled waits for every promise and gives you { status, value } or { status, reason } for each one, so you can list successes and failures together.',
    misconception:
      'Promise.all is not "wait for all no matter what". It gives up at the first rejection.',
    optionFeedback: {
      a: 'Promise.all rejects on the first failure, and you lose the other nine results.',
      b: 'race settles with whichever finishes first, so you learn about one notification.',
      d: 'any resolves with the first success and ignores the rest.',
    },
  },
  {
    slug: 'js-delay-between-calls',
    title: 'Two seconds between calls',
    topicSlug,
    subtopic: 'timers',
    type,
    difficulty: 1,
    prompt:
      'A Node script calls an API in a for...of loop and must wait 2 seconds between calls to respect its rate limit. How do you wait?',
    options: opts(
      'A while loop that spins until Date.now() has moved on 2000 ms',
      'Call setTimeout(next, 2000) and continue the loop',
      'Use process.nextTick to push the next call back',
      'await new Promise((r) => setTimeout(r, 2000)) inside the loop',
    ),
    answerKey: 'd',
    explanation:
      'Wrapping setTimeout in a promise and awaiting it pauses this loop for 2 seconds without blocking the thread, so the next call really waits.',
    misconception:
      'Waiting and blocking are different. A good wait gives the event loop back; a busy loop holds it.',
    optionFeedback: {
      a: 'A busy loop burns a full CPU core and freezes everything else in the process for those 2 seconds.',
      b: 'The loop does not wait for the timer, so all calls still go out back to back.',
      c: 'nextTick runs the callback right after the current code, with no delay at all.',
    },
  },
  {
    slug: 'js-readfile-in-handler',
    title: 'Reading a file per request',
    topicSlug,
    subtopic: 'event loop',
    type,
    difficulty: 1,
    prompt:
      'An Express handler reads a 5 MB file that editors change often, so it must be read fresh on every request. Today it uses fs.readFileSync. What is the better choice?',
    options: opts(
      'Keep readFileSync: the file is small',
      'await fs.promises.readFile(path) in an async handler',
      'Read it with readFileSync inside a setTimeout',
      'Read it once at startup and keep it in memory',
    ),
    answerKey: 'b',
    explanation:
      'The promise-based readFile does the disk work off the main thread, so while one request waits for the file, the server keeps answering others.',
    misconception:
      'Sync file calls are fine in a startup script, not in a request handler that many users hit at once.',
    optionFeedback: {
      a: 'Each sync read blocks every other request for its full duration; under load, that adds up.',
      c: 'The read is still synchronous; it just blocks the thread a moment later.',
      d: 'Fast, but the scenario says editors change it often, so users would see stale content.',
    },
  },
  {
    slug: 'js-promisify-callback',
    title: 'Awaiting an old library',
    topicSlug,
    subtopic: 'callbacks',
    type,
    difficulty: 1,
    prompt:
      'An old library exposes resize(path, size, callback) with a Node-style (err, result) callback. You want to use it with await. What do you do?',
    options: opts(
      'const resizeAsync = util.promisify(resize), then await it',
      'Write await resize(path, size) and drop the callback',
      'Put the call inside an async function',
      'Call it, then await a 1-second sleep for it to finish',
    ),
    answerKey: 'a',
    explanation:
      'util.promisify wraps a Node-style callback function in one that returns a promise: it resolves with result or rejects with err, so await and try/catch work.',
    misconception:
      'await only works on promises. Awaiting something that is not a promise just returns it immediately.',
    optionFeedback: {
      b: 'resize returns undefined without a callback, so await finishes instantly with nothing.',
      c: 'Being inside an async function does not turn a callback API into a promise.',
      d: 'A guess at timing: too slow sometimes, too fast at others, and errors are lost.',
    },
  },
  {
    slug: 'js-handle-async-error',
    title: 'Where to catch a payment error',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 1,
    prompt:
      'chargeCard() is async and rejects when the card is declined. The handler must show "Card declined" instead of crashing. Where do you handle it?',
    options: opts(
      'try/catch around chargeCard() called without await',
      'try { await chargeCard() } catch (err) { ... }',
      "A global process.on('uncaughtException') handler",
      'Nowhere: Node prints the error and continues',
    ),
    answerKey: 'b',
    explanation:
      'With await inside try, the rejection is thrown at that line and the catch block runs, so you can show a friendly message for this one request.',
    misconception: 'try/catch only sees a rejection if you await the promise inside the try.',
    optionFeedback: {
      a: 'Without await the try block ends before the rejection, so catch never runs.',
      c: 'A rejection is not an uncaught exception, and a global handler cannot reply to this one request.',
      d: 'Since Node 15 an unhandled rejection crashes the process.',
    },
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'js-cpu-blocking',
    title: 'A report that freezes the API',
    topicSlug,
    subtopic: 'event loop',
    type,
    difficulty: 2,
    prompt:
      'A Node endpoint builds a big PDF report with a 4-second CPU-heavy loop. While it runs, every other request stalls. What is the right fix?',
    options: opts(
      'Wrap the loop in an async function',
      'Move the work to a worker thread or a background job',
      'Add await before the loop',
      'Raise the HTTP server timeout',
    ),
    answerKey: 'b',
    explanation:
      'Node runs JavaScript on one thread, so a long CPU loop blocks the event loop for everyone. Moving it to a worker thread or a job queue frees the main thread to keep serving requests.',
    misconception:
      'async/await helps with waiting on I/O. It does not make CPU-heavy code non-blocking.',
    optionFeedback: {
      a: 'An async function still runs its loop on the main thread.',
      c: 'There is nothing to await: the loop is synchronous work.',
      d: 'A longer timeout lets requests wait longer; it does not unblock them.',
    },
    hint: 'How many threads run your JavaScript in Node?',
  },
  {
    slug: 'js-concurrency-pool',
    title: '5,000 images, 10 at a time',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 2,
    prompt:
      'You must resize 5,000 images through an API that allows 10 concurrent requests (each takes about 300 ms) and returns 429 above that. Which approach fits?',
    options: opts(
      'await Promise.all(images.map(resize))',
      'A for...of loop that awaits each resize in turn',
      'A pool of 10 workers that each pull the next image',
      'Start one resize every 30 ms with setTimeout',
    ),
    answerKey: 'c',
    explanation:
      'A pool (or a library like p-limit) keeps exactly 10 requests in flight: when one finishes, its worker takes the next image. That uses the full allowance, about 5,000 × 0.3 s / 10 ≈ 2.5 minutes, without tripping the limit.',
    misconception:
      'Concurrency is not all-or-nothing. You can choose how many promises run at once.',
    optionFeedback: {
      a: 'Starts all 5,000 at once; nearly all of them get 429.',
      b: 'Safe, but one at a time takes about 25 minutes and wastes 9 of the 10 slots.',
      d: 'Spacing starts does not bound how many are in flight; when the API slows down, requests pile up past 10.',
    },
  },
  {
    slug: 'js-abort-hung-call',
    title: 'A partner API that hangs',
    topicSlug,
    subtopic: 'cancellation',
    type,
    difficulty: 2,
    prompt:
      'A handler calls a partner API that sometimes hangs for minutes, tying up sockets and memory. Users should get a fallback after 2 s. What do you do?',
    options: opts(
      'Promise.race the fetch against a 2 s timer and serve the fallback when the timer wins',
      'fetch(url, { signal: AbortSignal.timeout(2000) }), fallback on error',
      'Raise the server request timeout to 5 minutes',
      'Retry the call immediately whenever it is slow',
    ),
    answerKey: 'b',
    explanation:
      'An abort signal really cancels the request: fetch rejects after 2 s and closes the socket, so the handler can serve the fallback and nothing keeps hanging in the background.',
    misconception: 'A timeout is only useful if it frees the resources the slow call is holding.',
    optionFeedback: {
      a: 'The user gets the fallback, but the losing fetch keeps running and holding its socket, so hung calls pile up.',
      c: 'Makes users wait longer and keeps even more requests open.',
      d: 'Each retry adds another hung request to a partner that is already struggling.',
    },
  },
  {
    slug: 'js-unhandled-rejection-policy',
    title: 'Keep it alive at any cost?',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 2,
    prompt:
      "An unhandled rejection crashed production Node once this week. A teammate proposes adding process.on('unhandledRejection', () => {}) so it never crashes again. What do you do instead?",
    options: opts(
      'Ship the empty handler; uptime matters most',
      'Run node with --unhandled-rejections=none',
      'Wrap the whole server start-up in one top-level try/catch block',
      'Log it, let it exit and restart, fix the missing handler',
    ),
    answerKey: 'd',
    explanation:
      'An unhandled rejection means some code path failed and nobody dealt with it, so the process may be in a bad state. Logging with context finds the bug; letting the process manager restart a fresh process keeps the service healthy until the real fix (an await or catch) ships.',
    misconception:
      'Silencing an error is not handling it. The failure still happened; you just stop hearing about it.',
    optionFeedback: {
      a: 'Hides every future bug of this kind and can leave requests hanging with no trace.',
      b: 'Same as the empty handler: the error disappears and the state may still be broken.',
      c: 'A try/catch cannot see rejections that happen later in callbacks or unawaited promises.',
    },
  },
  {
    slug: 'js-stream-large-download',
    title: 'Sending a 2 GB export',
    topicSlug,
    subtopic: 'streams',
    type,
    difficulty: 2,
    prompt:
      'Users download CSV exports of up to 2 GB. The handler reads the file with fs.promises.readFile and sends it, and the 512 MB instance keeps running out of memory. What do you change?',
    options: opts(
      'Stream it: pipeline(fs.createReadStream(path), res)',
      'Move the readFile into a worker thread',
      'Upgrade to an instance with 4 GB of memory',
      'Base64-encode the file before sending it',
    ),
    answerKey: 'a',
    explanation:
      'A stream reads the file in small chunks and sends each one as the client accepts it, so memory stays flat whatever the file size. pipeline also handles backpressure and errors on both sides.',
    misconception:
      'Async does not mean low memory. readFile is non-blocking, but it still loads the whole file into RAM.',
    optionFeedback: {
      b: 'The worker still holds 2 GB in memory, and then has to hand it back.',
      c: 'Two users downloading at once need 4 GB again; the fix does not scale.',
      d: 'Base64 makes the payload about a third bigger and still loads it all.',
    },
  },
  {
    slug: 'js-stale-search-results',
    title: 'Results for the wrong query',
    topicSlug,
    subtopic: 'race conditions',
    type,
    difficulty: 2,
    prompt:
      'A search box calls the API on every keystroke. Responses come back out of order, and the list sometimes shows results for "ca" after the user typed "cat". What do you do?',
    options: opts(
      'Await each request before sending the next',
      'Cache every response by its query string so repeats come back instantly',
      'Debounce input and abort the previous request with an AbortController',
      'Sort the results alphabetically before showing them',
    ),
    answerKey: 'c',
    explanation:
      'Debouncing sends one request after the user pauses typing, and aborting the previous request means an older, slower response can never land after the newer one. The list always matches what is in the box.',
    misconception:
      'Requests sent in order do not finish in order. A slower old response can arrive last and overwrite the new one.',
    optionFeedback: {
      a: 'Fixes ordering but queues a request per keystroke, so results lag behind typing.',
      b: 'Speeds up repeats, but a slow first "ca" can still arrive after "cat".',
      d: 'The problem is which query the results belong to, not their order.',
    },
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'js-thumbnail-offload',
    title: 'Thumbnails without blocking uploads',
    topicSlug,
    subtopic: 'event loop',
    type,
    difficulty: 3,
    prompt:
      'Making a thumbnail costs about 800 ms of CPU. Uploads must respond within 300 ms, thumbnails may appear a few seconds later, and instances are restarted several times a day by deploys. Which design fits?',
    options: opts(
      'A worker-thread pool inside the API process, so the event loop stays free while thumbnails render',
      'Save the upload, enqueue a durable job, and let a separate worker make the thumbnail',
      'Make the thumbnail inline, then respond',
      'Split the work into chunks with setImmediate between them',
    ),
    answerKey: 'b',
    explanation:
      'The response only has to confirm the upload, so the slow work can move off the request path. A durable queue survives restarts (a job in progress is retried), and a separate worker service keeps that CPU away from the API.',
    misconception:
      'Off the main thread is not the same as safe. Work that lives only in process memory is lost when the process is restarted.',
    optionFeedback: {
      a: 'Keeps the event loop free, but thumbnails in progress are lost on every deploy and the API instances share their CPU with image work.',
      c: 'Misses the 300 ms target on every upload.',
      d: 'Keeps the server responsive but stretches each upload far past 300 ms, and work is still lost on restart.',
    },
  },
  {
    slug: 'js-single-flight',
    title: '500 identical requests at once',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 3,
    prompt:
      'Right after a deploy (cold in-memory cache), 500 concurrent requests each call the config service for the same key, and the config service falls over. The cache already has a 60 s TTL. What do you add?',
    options: opts(
      'A mutex so that only one request at a time may read config, the rest wait their turn',
      'A shorter TTL so entries refresh more often',
      'Retry with backoff when the config service fails',
      'Single-flight: share one in-flight promise per key, evicted on failure',
    ),
    answerKey: 'd',
    explanation:
      'Storing the pending promise per key means the first request starts the fetch and the other 499 await the same promise: one call instead of 500. Evicting on rejection keeps a failure from being cached.',
    misconception:
      'A cache only helps once it has a value. The burst before the first response completes is what overwhelms the backend.',
    optionFeedback: {
      a: 'Serialises every config read, including ones for different keys, and still fetches once per waiting request unless it also caches.',
      b: 'Makes cold misses more frequent, not less.',
      c: 'All 500 retry together and hit the service again.',
    },
  },
  {
    slug: 'js-per-key-ordering',
    title: 'In order per document',
    topicSlug,
    subtopic: 'ordering',
    type,
    difficulty: 3,
    prompt:
      'A WebSocket server receives "update" messages for many documents. Each update awaits a DB write. Updates to the same document must apply in arrival order; different documents should not wait for each other. What do you build?',
    options: opts(
      "A per-document promise chain: append each update to that document's last promise",
      'One global queue that processes one message at a time',
      'Process each message as it arrives with no queue',
      'Tag updates with a timestamp and let the database keep the latest',
    ),
    answerKey: 'a',
    explanation:
      'Keeping a Map from document id to the tail of its chain (tail = tail.catch(logError).then(() => apply(update))) serialises updates per document while separate documents run concurrently. The catch matters: without it, one failed update rejects the chain and every later update for that document is silently skipped. Remove the entry when its chain empties so the map does not grow forever.',
    misconception:
      'Arriving in order is not applying in order: once each message awaits I/O, a later write can finish first.',
    optionFeedback: {
      b: 'Correct ordering, but one slow document blocks every other document.',
      c: 'Two writes for the same document can finish in either order.',
      d: 'Last-write-wins keeps one update and silently drops the others when they edit different fields.',
    },
  },
  {
    slug: 'js-consumer-backpressure',
    title: 'Events faster than the database',
    topicSlug,
    subtopic: 'backpressure',
    type,
    difficulty: 3,
    prompt:
      'A Node consumer reads events from a stream faster than it can write them to a database that is already at its write limit. Memory grows until the process dies. Every event must eventually be stored. What do you do?',
    options: opts(
      'Raise the heap limit with --max-old-space-size',
      'Write events in bigger Promise.all batches so each round trip carries more of them',
      'Pause reading when in-flight writes hit a limit; resume as they finish',
      'Put an in-process queue between reader and writer so reading never has to wait',
    ),
    answerKey: 'c',
    explanation:
      'Backpressure makes the producer wait for the consumer: events stay in the durable stream instead of in RAM, and the consumer works at the speed the database can take. Memory stays bounded and nothing is lost.',
    misconception:
      'Buffering is not processing. If input is faster than output for long enough, any in-memory buffer fills up.',
    optionFeedback: {
      a: 'Only delays the crash; the backlog keeps growing.',
      b: 'Batching can help a database that has headroom, but this one is at its limit, and unbounded batches still pile up in memory.',
      d: 'That queue is the same unbounded buffer with a new name: input still outruns output, so it fills RAM.',
    },
  },
  {
    slug: 'js-cancel-on-disconnect',
    title: 'Work for users who left',
    topicSlug,
    subtopic: 'cancellation',
    type,
    difficulty: 3,
    prompt:
      'A search endpoint fans out to 4 expensive backends (about 2 s each). Analytics show 40% of users navigate away before results arrive, and you pay per backend call. Results must stay complete for users who wait. What do you do?',
    options: opts(
      'Add a 500 ms timeout to every backend call',
      'Cache results so the next user gets them free',
      'Debounce the search box by 500 ms on the client so fewer searches are sent',
      "Abort every backend call when the client disconnects (res 'close')",
    ),
    answerKey: 'd',
    explanation:
      "Create one AbortController per request, abort it in res.on('close') when the response has not finished (!res.writableFinished), and pass its signal to every backend call. (On current Node, req 'close' fires as soon as the request body is read, so it is the wrong event.) When a user leaves, every outstanding call is cancelled at once, so you stop paying for results nobody will see. Users who stay get full results as before.",
    misconception:
      'A request handler does not stop when its client disconnects. Unless you cancel it, the work runs to the end.',
    optionFeedback: {
      a: 'Cuts off normal 2 s calls, so users who wait lose results.',
      b: 'Helps repeated queries only; most searches are unique, so you still pay for abandoned ones.',
      c: 'Cuts searches sent while typing, but a submitted search is still paid for in full when the user leaves.',
    },
  },
  {
    slug: 'js-async-local-storage',
    title: 'A request id in every log line',
    topicSlug,
    subtopic: 'async context',
    type,
    difficulty: 3,
    prompt:
      'Every log line must include the request id. Logs are written from about 40 functions, including callbacks from a third-party SDK you cannot change, and requests overlap. What do you use?',
    options: opts(
      'A module-level currentRequestId set at the start of each request',
      'AsyncLocalStorage: run each request in a store that holds its id',
      'Add a requestId parameter to all 40 functions',
      'Look the id up from the active socket in each log call',
    ),
    answerKey: 'b',
    explanation:
      'AsyncLocalStorage carries a value through every await, timer and callback started inside als.run(store, fn), so any function in that request, including SDK callbacks, can read the right id without new parameters.',
    misconception:
      'Global variables are per process, not per request. In Node, overlapping requests share them.',
    optionFeedback: {
      a: 'Overlapping requests overwrite it, so log lines get the wrong id.',
      c: 'Works for your code but is a large, fragile change, and you cannot add the parameter to SDK callbacks.',
      d: 'Log calls do not know which socket they belong to; that is the problem being solved.',
    },
  },
];
