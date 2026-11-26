import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'js-async' as const;
const type = 'TRACE' as const;

/** JavaScript async: Trace the Stack, 6 per level (P10). */
export const JS_ASYNC_TRACE: ChallengeSeed[] = [
  // ── Level 1: one concept, short code ─────────────────────────────────────────────
  {
    slug: 'js-timeout-zero',
    title: 'A zero-delay timeout',
    topicSlug,
    subtopic: 'event loop',
    type,
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
    slug: 'js-async-return-value',
    title: 'What an async function returns',
    topicSlug,
    subtopic: 'async/await',
    type,
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
    slug: 'js-then-braces-no-return',
    title: 'The value that went missing',
    topicSlug,
    subtopic: 'promises',
    type,
    difficulty: 1,
    prompt: 'What does the last .then() print?',
    codeSnippet:
      'Promise.resolve(2)\n  .then((n) => {\n    n * 3;\n  })\n  .then((n) => console.log(n));',
    options: opts('6', '2', 'undefined', 'Promise { 6 }'),
    answerKey: 'c',
    explanation:
      'Each .then() passes on whatever its callback returns. With curly braces, an arrow function needs an explicit return; this one computes n * 3 and throws it away, so it returns undefined and the next .then() logs undefined.',
    misconception:
      'Braces change an arrow function from "return this expression" to "run this block". 2 would only print if the middle step were skipped, and a promise is never passed down: .then() unwraps it.',
    hint: 'What does the middle callback return?',
  },
  {
    slug: 'js-var-loop-timeout',
    title: 'Three timers, one counter',
    topicSlug,
    subtopic: 'timers',
    type,
    difficulty: 1,
    prompt: 'What does this print?',
    codeSnippet: 'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}',
    options: opts('0 1 2', '2 2 2', '0 0 0', '3 3 3'),
    answerKey: 'd',
    explanation:
      'var creates one i for the whole loop. The callbacks run only after the loop has finished, when i is already 3, so all three print 3. With let, each iteration gets its own i and you would see 0 1 2.',
    misconception:
      'A callback does not copy a variable when it is created; it reads the variable when it runs. 2 2 2 forgets that the loop increments once more before the condition fails.',
    hint: 'When do the callbacks run, and what is i by then?',
  },
  {
    slug: 'js-promise-executor-sync',
    title: 'Inside the promise',
    topicSlug,
    subtopic: 'promises',
    type,
    difficulty: 1,
    prompt: 'What does this print, in order?',
    codeSnippet:
      "const p = new Promise((resolve) => {\n  console.log('inside');\n  resolve();\n});\nconsole.log('after');",
    options: opts(
      'inside → after',
      'after → inside',
      'after (inside never prints)',
      'inside → after → inside',
    ),
    answerKey: 'a',
    explanation:
      'The function you pass to new Promise (the executor) runs immediately and synchronously, so inside prints first. Only the .then() callbacks are deferred, and there are none here.',
    misconception:
      'Creating a promise does not postpone the code inside it. People expect "after" first because they think everything about a promise is asynchronous.',
  },
  {
    slug: 'js-two-awaits-timing',
    title: 'Two waits in a row',
    topicSlug,
    subtopic: 'async/await',
    type,
    difficulty: 1,
    prompt: 'About how long after main() is called does "done" print?',
    codeSnippet:
      "const wait = (ms) => new Promise((r) => setTimeout(r, ms));\nasync function main() {\n  await wait(100);\n  await wait(100);\n  console.log('done');\n}\nmain();",
    options: opts(
      'About 100 ms: the two waits overlap',
      'Immediately, because await never blocks',
      'About 200 ms',
      'It throws: wait() returns nothing to await',
    ),
    answerKey: 'c',
    explanation:
      'The second wait(100) is only called after the first await finishes, so the timers run one after the other: about 200 ms. To overlap them you would start both first and await Promise.all.',
    misconception:
      'await does not block the thread, but it does pause this function. Other code may run meanwhile; the next line of main() still waits.',
  },

  // ── Level 2: two concepts interacting ────────────────────────────────────────────
  {
    slug: 'js-microtask-vs-macrotask',
    title: 'Promise versus timeout',
    topicSlug,
    subtopic: 'microtasks',
    type,
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
    slug: 'js-await-yields',
    title: 'Await gives up the thread',
    topicSlug,
    subtopic: 'async/await',
    type,
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
    type,
    difficulty: 2,
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
    slug: 'js-nexttick-vs-promise',
    title: 'nextTick cuts the line',
    topicSlug,
    subtopic: 'microtasks',
    type,
    difficulty: 2,
    prompt: 'In a CommonJS script run with node, what is the output order?',
    codeSnippet:
      "Promise.resolve().then(() => console.log('promise'));\nprocess.nextTick(() => console.log('tick'));\nconsole.log('sync');",
    options: opts(
      'sync → promise → tick',
      'tick → sync → promise',
      'promise → tick → sync',
      'sync → tick → promise',
    ),
    answerKey: 'd',
    explanation:
      'Synchronous code always finishes first. After it, Node empties the process.nextTick queue before the promise microtask queue, so tick prints before promise even though the promise callback was queued first.',
    misconception:
      'Queuing order is not run order across queues. nextTick callbacks are not promise microtasks; Node gives them priority.',
    hint: 'Node has a queue that it empties even before promise callbacks.',
  },
  {
    slug: 'js-try-catch-timer-throw',
    title: 'A try block that misses',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 2,
    prompt: 'What happens when this runs in Node?',
    codeSnippet:
      "try {\n  setTimeout(() => {\n    throw new Error('boom');\n  }, 0);\n} catch (err) {\n  console.log('caught', err.message);\n}\nconsole.log('after');",
    options: opts(
      'caught boom, then after',
      'after, then caught boom',
      'after, then an uncaught crash',
      'after, and the error is silently ignored',
    ),
    answerKey: 'c',
    explanation:
      'try/catch only covers code that runs while the try block is on the stack. The timer callback runs later, on its own stack, long after the try has finished, so the error is uncaught and Node exits after printing "after".',
    misconception:
      'A try block does not "remember" callbacks scheduled inside it. Errors in callbacks must be caught inside the callback, or handled via a promise.',
    hint: 'Is the try block still running when the callback throws?',
  },
  {
    slug: 'js-interleaved-async-steps',
    title: 'Two tasks take turns',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 2,
    prompt: 'What is logged?',
    codeSnippet:
      "const log = [];\nasync function step(n) {\n  log.push(`start ${n}`);\n  await null;\n  log.push(`end ${n}`);\n}\nPromise.all([step(1), step(2)]).then(() => console.log(log.join(', ')));",
    options: opts(
      'start 1, start 2, end 1, end 2',
      'start 1, end 1, start 2, end 2',
      'start 2, start 1, end 2, end 1',
      'start 1, start 2, end 2, end 1',
    ),
    answerKey: 'a',
    explanation:
      'step(1) runs until its await and pauses, then step(2) is called and does the same. Their continuations were queued in that order, so end 1 runs before end 2. Concurrency in one thread means taking turns at each await.',
    misconception:
      'Promise.all does not run its tasks one after another, and it does not reorder them either. Each function runs until its first await, then yields.',
    hint: 'Where does step(1) give control back?',
  },

  // ── Level 3: production edge cases ───────────────────────────────────────────────
  {
    slug: 'js-late-catch-crash',
    title: 'A catch attached too late',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 3,
    prompt: 'On Node 20+, with default settings, what happens?',
    codeSnippet:
      "const p = Promise.reject(new Error('boom'));\nsetTimeout(() => {\n  p.catch((e) => console.log('caught', e.message));\n}, 0);",
    options: opts(
      'caught boom',
      'caught boom, after a PromiseRejectionHandledWarning',
      'The process exits on an unhandled rejection',
      'Nothing: rejections without a handler are ignored',
    ),
    answerKey: 'c',
    explanation:
      'After the script and its microtasks finish, Node checks for rejected promises with no handler. p has none yet, because the catch is attached in a later timer task, so Node treats it as unhandled and exits with an error before the timer runs.',
    misconception:
      'Warning-then-handled was the behaviour before Node 15. Today the default is --unhandled-rejections=throw: a handler must be attached in the same turn the promise rejects.',
    hint: 'When does Node decide a rejection is unhandled?',
  },
  {
    slug: 'js-microtask-starvation',
    title: 'The loop that never stops',
    topicSlug,
    subtopic: 'event loop',
    type,
    difficulty: 3,
    prompt: 'What happens?',
    codeSnippet:
      "let done = false;\nsetTimeout(() => { done = true; }, 10);\nasync function spin() {\n  while (!done) {\n    await null;\n  }\n  console.log('stopped');\n}\nspin();",
    options: opts(
      'stopped prints after about 10 ms',
      'stopped prints immediately',
      'RangeError: Maximum call stack size exceeded',
      'Nothing prints: it spins at 100% CPU forever',
    ),
    answerKey: 'd',
    explanation:
      'Each await null queues a microtask, and the event loop drains the whole microtask queue before it runs any timer. The loop keeps adding microtasks, so the queue never empties, the timer never fires and done stays false.',
    misconception:
      '"await lets other code run" is only true for other microtasks. Timers and I/O wait until the microtask queue is empty. There is no stack overflow because each step starts on a fresh stack.',
    hint: 'Can a timer run while the microtask queue is never empty?',
  },
  {
    slug: 'js-finally-return-swallows',
    title: 'Return inside finally',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 3,
    prompt: 'What is logged?',
    codeSnippet:
      "async function save() {\n  try {\n    throw new Error('disk full');\n  } finally {\n    return 'ok';\n  }\n}\nsave().then(\n  (v) => console.log('resolved', v),\n  (e) => console.log('rejected', e.message),\n);",
    options: opts(
      'rejected disk full',
      'resolved ok',
      'resolved undefined',
      'rejected disk full, then resolved ok',
    ),
    answerKey: 'b',
    explanation:
      'A return in finally replaces whatever the try block was doing, including a pending throw. The error is discarded and the promise resolves with "ok". This is how real failures end up looking like successes in logs.',
    misconception:
      'finally is meant for cleanup and normally lets the error continue, but a return statement inside it overrides the error. A promise settles only once, so it cannot both reject and resolve.',
  },
  {
    slug: 'js-unawaited-reject-crash',
    title: 'Awaited, but too late',
    topicSlug,
    subtopic: 'error handling',
    type,
    difficulty: 3,
    prompt: 'What happens when main() runs on Node 20+?',
    codeSnippet:
      "const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\nasync function main() {\n  const a = sleep(10).then(() => { throw new Error('A failed'); });\n  const b = sleep(100).then(() => 'B');\n  try {\n    console.log(await b, await a);\n  } catch (e) {\n    console.log('caught', e.message);\n  }\n}\nmain();",
    options: opts(
      'An unhandled-rejection crash at about 10 ms',
      'caught A failed, at about 100 ms',
      'B, then caught A failed',
      'caught A failed, at about 10 ms',
    ),
    answerKey: 'a',
    explanation:
      'a rejects at 10 ms while main() is still waiting on b. Nothing has attached a handler to a yet (await a has not been reached), so Node sees an unhandled rejection and exits. Use await Promise.all([b, a]) so both have a handler from the start.',
    misconception:
      'An await written later in the code does not count as a handler until it runs. Starting promises early is good, but they need a handler right away.',
    hint: 'At 10 ms, which line is main() paused on?',
  },
  {
    slug: 'js-write-ignores-backpressure',
    title: 'Ten million writes',
    topicSlug,
    subtopic: 'streams',
    type,
    difficulty: 3,
    prompt: 'What happens to memory while this runs?',
    codeSnippet:
      "const out = fs.createWriteStream('big.txt');\nfor (let i = 0; i < 1e7; i++) {\n  out.write(`line ${i}\\n`);\n}\nout.end();",
    options: opts(
      'It keeps climbing: every chunk waits in RAM',
      'It stays flat: each line goes to disk right away',
      'write() throws once its buffer is full',
      'The loop pauses itself at the highWaterMark',
    ),
    answerKey: 'a',
    explanation:
      'The loop is synchronous, so the stream never gets an event-loop turn to flush to disk. write() returns false once the buffer passes highWaterMark, but the code ignores it and every chunk is queued in memory. Respect backpressure: stop when write() returns false and continue on "drain", or use pipeline().',
    misconception:
      'highWaterMark is a signal, not a limit. A stream never blocks or throws when you write past it; it is up to the producer to wait.',
    hint: 'What does write() return, and who listens to it?',
  },
  {
    slug: 'js-race-does-not-cancel',
    title: 'The timeout that did not stop the save',
    topicSlug,
    subtopic: 'cancellation',
    type,
    difficulty: 3,
    prompt: 'What is logged?',
    codeSnippet:
      "let saved = 0;\nconst save = () => new Promise((r) => setTimeout(() => { saved++; r(); }, 200));\nconst timeout = (ms) => new Promise((_, j) => setTimeout(() => j(new Error('timeout')), ms));\nasync function main() {\n  try {\n    await Promise.race([save(), timeout(100)]);\n  } catch (e) {\n    console.log(e.message);\n  }\n  setTimeout(() => console.log('saved =', saved), 300);\n}\nmain();",
    options: opts(
      'timeout, then saved = 0',
      'saved = 1 (the timeout is ignored)',
      'Only "timeout": the save was cancelled',
      'timeout, then saved = 1',
    ),
    answerKey: 'd',
    explanation:
      'Promise.race settles with the first result, the timeout at 100 ms, but nothing stops the save: its timer still fires at 200 ms and saved becomes 1. A caller that treats "timeout" as "not saved" and retries will save twice. Real cancellation needs an AbortSignal the work itself checks.',
    misconception:
      'Losing a race does not cancel a promise. JavaScript promises have no cancel; the work keeps running and its side effects still happen.',
    hint: 'Does anything tell save() to stop?',
  },
];
