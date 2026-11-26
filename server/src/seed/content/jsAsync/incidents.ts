import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'js-async' as const;
const type = 'INCIDENT' as const;

/** JavaScript async: Incident Room, difficulty 1, 2, 2, 3 (P10). Stages: alert → investigate → resolve. */
export const JS_ASYNC_INCIDENTS: ChallengeSeed[] = [
  {
    slug: 'incident-js-settings-vanish',
    title: 'Saved, then gone',
    topicSlug,
    subtopic: 'async/await',
    type,
    difficulty: 1,
    prompt:
      'After a release, users say the app shows "Saved!" but their settings are gone after a refresh.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'About 5% of settings saves are lost. Since the release, the API process has restarted 12 times an hour. Each crash log ends with "UnhandledPromiseRejection: ValidationError: theme is invalid".',
        prompt: 'What does the crash log tell you first?',
        options: opts(
          'The database is down',
          'A promise rejected and no code was handling it',
          'The server is out of memory',
          'Users are tapping Save too fast',
        ),
        answerKey: 'b',
        explanation:
          'Node exits on a promise rejection that has no handler. The rejection is a validation error from the settings save, so some save is failing and nobody is awaiting or catching it.',
        misconception:
          'A crash is not always an infrastructure problem. Here the log names the exact error that went unhandled.',
      },
      {
        title: 'Investigate',
        evidence:
          "The handler from the release:\napp.put('/settings', async (req, res) => {\n  settings.save(req.user.id, req.body);\n  res.json({ ok: true });\n});",
        prompt: 'Why does the app say "Saved!" when the save failed?',
        options: opts(
          'res.json runs before the save has finished, because save() is not awaited',
          'The validation error comes from a bug in the app, which sends a bad theme value',
          'The save is too slow for the database',
          'JSON responses are cached by the phone',
        ),
        answerKey: 'a',
        explanation:
          'Without await, the handler starts the save and replies { ok: true } immediately. When the save later rejects, the response is already sent and the rejection has no handler, so the process crashes too.',
        misconception:
          'The order of lines is not the order of completion. An unawaited call keeps running after the next line.',
        hint: 'What does the handler wait for before replying?',
      },
      {
        title: 'Resolve',
        evidence:
          'The team wants users to see a real error when a save fails, and no more crashes.',
        prompt: 'What do you ship?',
        options: opts(
          "Add process.on('unhandledRejection') to keep the process alive",
          'Retry the save in a setTimeout after replying',
          'Return 202 Accepted instead of 200',
          'await the save, so failures reach the error handler and return a 400',
        ),
        answerKey: 'd',
        explanation:
          'Awaiting the save means the reply waits for the result. A validation error is thrown inside the handler, the error middleware turns it into a 400 with a message, and nothing is left unhandled.',
        misconception:
          'Hiding the crash keeps the lie: users would still see "Saved!" for saves that failed.',
      },
    ],
    rootCause:
      'The settings handler called save() without await and replied { ok: true } straight away. Invalid saves rejected after the response was sent, so users saw a false success and each rejection, having no handler, crashed the process.',
  },
  {
    slug: 'incident-js-event-loop-lag',
    title: 'Every endpoint slows at once',
    topicSlug,
    subtopic: 'event loop',
    type,
    difficulty: 2,
    prompt:
      'Every few minutes, p99 latency jumps from 80 ms to 3 s on every endpoint at the same time.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'During spikes: one CPU core at 100%, database latency normal, request count normal. The event-loop lag metric jumps to 2.8 s. Even GET /health is slow.',
        prompt: 'What kind of problem is this?',
        options: opts(
          'A slow database query',
          'A network problem between the load balancer and the app',
          'Synchronous work is blocking the event loop',
          'Too many requests for the instance',
        ),
        answerKey: 'c',
        explanation:
          'High event-loop lag with one busy core means JavaScript is running without yielding. While it runs, Node cannot start any other request, which is why even the health check, which does no I/O, is slow.',
        misconception:
          'When every endpoint slows at once, look for something they share. In Node, that is the single JavaScript thread.',
      },
      {
        title: 'Investigate',
        evidence:
          'A CPU profile taken during a spike shows 92% of time in crypto.pbkdf2Sync, called from POST /login with 600,000 iterations. Spikes line up with bursts of logins at shift start.',
        prompt: 'Why do unrelated endpoints slow down?',
        options: opts(
          'pbkdf2Sync hashes on the main thread, so nothing else runs until each hash is done',
          'Login requests use up the database connections',
          'The hash results are too large to send',
          'Login responses are not cached',
        ),
        answerKey: 'a',
        explanation:
          'Each sync hash holds the main thread for a few hundred milliseconds. A burst of logins queues them back to back, and every other request waits behind them.',
        misconception:
          'A slow function only hurts its own endpoint in a multi-threaded server. In Node, sync CPU work hurts everyone.',
      },
      {
        title: 'Resolve',
        evidence: 'Security requires keeping 600,000 iterations.',
        prompt: 'What is the fix?',
        options: opts(
          'Lower the iterations to 10,000',
          'Use the async crypto.pbkdf2, which runs on the libuv thread pool',
          'Add more instances behind the load balancer and keep using pbkdf2Sync',
          'Cache password hashes in memory',
        ),
        answerKey: 'b',
        explanation:
          'The async version does the same work on a background thread and calls back when done, so the event loop keeps serving other requests. Same security, no stall.',
        misconception:
          'More instances spread the pain but each one still freezes during its own login burst.',
        hint: 'Is there a version of the same function that does not block?',
      },
    ],
    rootCause:
      'Login hashed passwords with crypto.pbkdf2Sync on the main thread. Bursts of logins blocked the event loop for seconds, so every request on the instance, including health checks, waited behind the hashes.',
  },
  {
    slug: 'incident-js-fanout-storm',
    title: 'The nightly sync that floods the partner',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 2,
    prompt:
      'The nightly sync to a partner API failed again, and the partner is threatening to block your key.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The partner reports 20,000 requests from you within 2 seconds at 02:00. Their limit is 20 concurrent requests. Your job log has one line: "sync failed: HTTP 429".',
        prompt: 'What is the job most likely doing?',
        options: opts(
          'Retrying one request 20,000 times',
          'Running on 20,000 instances',
          'Sending one request per second',
          'Starting every request at once with Promise.all over the whole list',
        ),
        answerKey: 'd',
        explanation:
          '20,000 requests in 2 seconds with one job is the signature of mapping the full list to promises at once. Nothing limits how many are in flight.',
        misconception:
          'async code is not automatically gentle. Starting a promise starts the work immediately.',
      },
      {
        title: 'Investigate',
        evidence:
          'The partner shows 19,400 of those requests succeeded. Your job marked the whole run failed and re-ran from the start at 03:00, creating duplicates on their side.',
        prompt: 'Why was the run marked failed when most requests worked?',
        options: opts(
          'The partner lost the successful results',
          'Promise.all rejected at the first 429, while the other requests kept running unobserved',
          'The job timed out after 2 seconds',
          'The 429s were caused by duplicates from the 03:00 run',
        ),
        answerKey: 'b',
        explanation:
          'Promise.all rejects with the first error and drops every other result, but the requests it started keep going. So the job knows nothing about the 19,400 successes and replays everything.',
        misconception:
          'A rejected Promise.all does not stop the other promises. It just stops listening to them.',
      },
      {
        title: 'Resolve',
        evidence: 'The sync must finish within an hour and must not create duplicates.',
        prompt: 'What do you ship?',
        options: opts(
          'Wrap the whole Promise.all in a retry loop that runs until it passes',
          'Run the job at a quieter hour',
          'A pool of 20, per-item retry on 429, and skip items already synced',
          'Switch to Promise.allSettled and keep sending everything at once',
        ),
        answerKey: 'c',
        explanation:
          'A pool of 20 matches the partner limit (20,000 × ~100 ms / 20 ≈ 2 minutes, well inside an hour). Per-item retries handle the odd 429, and recording what was synced makes re-runs safe.',
        misconception:
          'allSettled reports every result but still floods the partner; the limit is about how many run at once.',
      },
    ],
    rootCause:
      "The sync ran Promise.all over all 20,000 items, so every request started at once and blew through the partner's 20-request limit. The first 429 rejected the whole Promise.all while the rest kept running, so the job thought it failed and replayed everything, creating duplicates.",
  },
  {
    slug: 'incident-listener-leak',
    title: 'Memory climbs every hour',
    topicSlug: 'js-async',
    subtopic: 'memory leaks',
    type: 'INCIDENT',
    difficulty: 3,
    prompt: 'The Node service is killed for running out of memory every few hours.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'Memory rises steadily from 150 MB to 1.5 GB over 4 hours, then the process is OOM-killed. CPU and traffic are flat. Logs show "MaxListenersExceededWarning".',
        prompt: 'Which lead do you follow first?',
        options: opts(
          'The MaxListenersExceededWarning',
          'Traffic spikes',
          'Database latency',
          'Disk space',
        ),
        answerKey: 'a',
        explanation:
          'Flat traffic with steady growth suggests something accumulates per request. Node warns when one emitter gets too many listeners: a classic sign of adding listeners without removing them.',
        misconception: 'Warnings in logs are not noise. This one often points straight at a leak.',
      },
      {
        title: 'Investigate',
        evidence:
          "Per request, the handler runs: priceFeed.on('update', (p) => res.write(...)). Nothing ever calls priceFeed.off().",
        prompt: 'Why does memory grow?',
        options: opts(
          'Each request adds a listener that is never removed, keeping its closure (and the response) alive',
          'res.write is slow',
          'The garbage collector is disabled',
          'The price feed sends too much data',
        ),
        answerKey: 'a',
        explanation:
          "The long-lived emitter holds a reference to every listener, and each listener's closure holds its request objects. None of it can be garbage collected.",
        misconception:
          'Garbage collection only frees what nothing references. A global emitter is a reference.',
        hint: "What keeps an old request's objects reachable?",
      },
      {
        title: 'Resolve',
        evidence: 'The stream should stop when the client disconnects.',
        prompt: 'What is the fix?',
        options: opts(
          "Remove the listener when the response closes: res.on('close', () => priceFeed.off('update', onUpdate))",
          'Restart the server every 3 hours',
          'Raise the max-listeners limit',
          'Add more memory',
        ),
        answerKey: 'a',
        explanation:
          "Tie the listener's lifetime to the request's: unsubscribe on close. Memory then stays flat no matter how many clients come and go.",
        misconception: 'Raising the listener limit silences the warning and keeps the leak.',
      },
    ],
    rootCause:
      'Each streaming request subscribed a listener to a global price-feed emitter and never unsubscribed, so listeners and their request objects accumulated until the process ran out of memory.',
  },
];
