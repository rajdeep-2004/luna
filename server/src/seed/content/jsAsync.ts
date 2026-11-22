import { opts, type ChallengeSeed } from '../schema';

const topicSlug = 'js-async' as const;

export const JS_ASYNC: ChallengeSeed[] = [
  {
    slug: 'js-timeout-zero',
    title: 'A zero-delay timeout',
    topicSlug,
    subtopic: 'event loop',
    type: 'TRACE',
    difficulty: 1,
    prompt: 'What does this print, in order?',
    codeSnippet: "console.log('A');\nsetTimeout(() => console.log('B'), 0);\nconsole.log('C');",
    options: opts('A → B → C', 'A → C → B', 'B → A → C', 'C → A → B'),
    answerKey: 'b',
    explanation:
      'setTimeout always schedules its callback as a task for a later turn of the event loop, even with 0 ms. The synchronous code runs to the end first, so A and C print before B.',
    misconception:
      'A 0 ms timeout does not mean "run now". It means "run as soon as the current code has finished".',
  },
  {
    slug: 'js-microtask-vs-macrotask',
    title: 'Promise versus timeout',
    topicSlug,
    subtopic: 'microtasks',
    type: 'TRACE',
    difficulty: 2,
    prompt: 'What is the output order?',
    codeSnippet:
      "console.log('Start');\nsetTimeout(() => console.log('Timeout'), 0);\nPromise.resolve().then(() => console.log('Promise'));\nconsole.log('End');",
    options: opts(
      'Start → Timeout → Promise → End',
      'Start → End → Promise → Timeout',
      'Start → Promise → Timeout → End',
      'Start → End → Timeout → Promise',
    ),
    answerKey: 'b',
    explanation:
      'Synchronous logs run first (Start, End). Then the microtask queue is drained, which holds the promise callback, before the event loop picks up the next task, the timeout.',
    misconception:
      'Timeouts and promise callbacks are not one queue: microtasks always run before the next timer task.',
    hint: 'Promise callbacks go to the microtask queue. When is it emptied?',
  },
  {
    slug: 'js-async-return-value',
    title: 'What an async function returns',
    topicSlug,
    subtopic: 'async/await',
    type: 'TRACE',
    difficulty: 1,
    prompt: 'What does Node print?',
    codeSnippet: 'async function getCount() {\n  return 1;\n}\nconsole.log(getCount());',
    options: opts('1', 'Promise { 1 }', 'undefined', 'TypeError'),
    answerKey: 'b',
    explanation:
      'An async function always returns a promise. Returning 1 resolves that promise with 1, so logging the call (without await) shows the promise itself.',
    misconception:
      'The async keyword does not make the caller wait. Only await (or .then) unwraps the value.',
  },
  {
    slug: 'js-await-yields',
    title: 'Await gives up the thread',
    topicSlug,
    subtopic: 'async/await',
    type: 'TRACE',
    difficulty: 2,
    prompt: 'What is printed?',
    codeSnippet:
      "async function run() {\n  console.log('1');\n  await null;\n  console.log('3');\n}\nrun();\nconsole.log('2');",
    options: opts('1 → 3 → 2', '1 → 2 → 3', '2 → 1 → 3', '1 → 2 (3 never prints)'),
    answerKey: 'b',
    explanation:
      'An async function runs synchronously until its first await. At the await it pauses and returns control to the caller, which prints 2. The rest of run() continues as a microtask and prints 3.',
    misconception:
      'Code before the first await is not deferred: it runs immediately when the function is called.',
    hint: 'Where does run() pause, and who gets control back?',
  },
  {
    slug: 'js-promise-all-reject',
    title: 'Promise.all with one failure',
    topicSlug,
    subtopic: 'promises',
    type: 'TRACE',
    difficulty: 3,
    prompt: 'What gets logged?',
    codeSnippet:
      "const slow = new Promise((r) => setTimeout(() => r('a'), 100));\nconst fail = new Promise((_, j) => setTimeout(() => j('boom'), 50));\nPromise.all([slow, fail])\n  .then((v) => console.log('ok', v))\n  .catch((e) => console.log('err', e));",
    options: opts("ok ['a', 'boom']", 'err boom', "ok ['a']", 'Nothing: it waits for both forever'),
    answerKey: 'b',
    explanation:
      'Promise.all rejects as soon as any input rejects, with that reason. After 50 ms it logs "err boom". The slow promise still settles later, but its result is ignored.',
    misconception:
      'Promise.all does not collect partial results. Use Promise.allSettled when you need every outcome.',
    hint: 'Does Promise.all wait for the others once one of them fails?',
  },
  {
    slug: 'js-missing-await-fetch',
    title: 'Response is not a function',
    topicSlug,
    subtopic: 'async/await',
    type: 'BUG_HUNT',
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
    slug: 'js-foreach-async',
    title: 'All saved... too early',
    topicSlug,
    subtopic: 'async iteration',
    type: 'BUG_HUNT',
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
    slug: 'js-return-without-await',
    title: 'The catch that never catches',
    topicSlug,
    subtopic: 'error handling',
    type: 'BUG_HUNT',
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
    slug: 'js-sequential-awaits',
    title: 'Two calls, twice the wait',
    topicSlug,
    subtopic: 'concurrency',
    type: 'ENGINEER_CHOICE',
    difficulty: 1,
    prompt:
      'A handler awaits getUser() and then getOrders(). Each takes about 1 s and neither depends on the other. How do you make it faster?',
    options: opts(
      'Start both and await Promise.all([getUser(), getOrders()])',
      'Wrap each call in setTimeout(..., 0)',
      'Mark the handler async a second time',
      'Switch both calls to callbacks',
    ),
    answerKey: 'a',
    explanation:
      'Independent work can run concurrently. Starting both calls and awaiting Promise.all brings the total time down to the slower call, about 1 s.',
    misconception:
      'await does not have to be one at a time: you can start many promises first and wait for them together.',
    optionFeedback: {
      b: 'setTimeout only delays work; the calls still finish in about 2 s.',
      c: 'async is a property of the function, not a speed setting.',
      d: 'Callbacks change the syntax, not the order you wait in.',
    },
  },
  {
    slug: 'js-cpu-blocking',
    title: 'A report that freezes the API',
    topicSlug,
    subtopic: 'event loop',
    type: 'ENGINEER_CHOICE',
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
];
