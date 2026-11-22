import { opts, type ChallengeSeed } from '../schema';

const topicSlug = 'debugging-prod' as const;

export const DEBUGGING_PROD: ChallengeSeed[] = [
  {
    slug: 'prod-log-levels',
    title: 'Which logs survive?',
    topicSlug,
    subtopic: 'logging',
    type: 'TRACE',
    difficulty: 1,
    prompt: 'The logger is set to level "warn". Which messages are written?',
    codeSnippet:
      "const logger = pino({ level: 'warn' });\nlogger.debug('cache miss');\nlogger.info('user logged in');\nlogger.warn('slow query');\nlogger.error('payment failed');",
    options: opts(
      'All four',
      "'slow query' and 'payment failed'",
      "Only 'payment failed'",
      "Only 'cache miss'",
    ),
    answerKey: 'b',
    explanation:
      'A log level is a minimum. "warn" writes warn and anything more severe (error, fatal), and drops debug and info.',
    misconception:
      'Setting a level does not mean "only this level". It means "this level and above".',
  },
  {
    slug: 'prod-hardcoded-db-url',
    title: 'Works on my machine',
    topicSlug,
    subtopic: 'configuration',
    type: 'BUG_HUNT',
    difficulty: 1,
    prompt:
      'The app runs locally but crashes on the server with "connect ECONNREFUSED 127.0.0.1:27017". Which line is the bug?',
    codeSnippet:
      "const PORT = process.env.PORT || 3000;\nconst DB_URL = 'mongodb://localhost:27017/app';\nmongoose.connect(DB_URL);\napp.listen(PORT);",
    answerKey: '2',
    explanation:
      'localhost on the server is the server itself, where no database runs. Connection strings belong in environment variables, such as process.env.MONGODB_URI, so each environment supplies its own.',
    misconception:
      '"localhost" is not a fixed place: it means whichever machine the code is running on.',
  },
  {
    slug: 'prod-swallowed-error',
    title: 'Sync complete (it was not)',
    topicSlug,
    subtopic: 'error handling',
    type: 'BUG_HUNT',
    difficulty: 2,
    prompt:
      'The warehouse never receives orders, yet logs say "sync complete" every time. Which line is the bug?',
    codeSnippet:
      "async function syncOrders() {\n  try {\n    await pushToWarehouse(await getOrders());\n  } catch (err) {}\n  logger.info('sync complete');\n}",
    answerKey: '4',
    explanation:
      'The empty catch swallows every failure, so the code carries on and reports success. At minimum, log the error with context and rethrow or return a failure so the caller and alerts know.',
    misconception:
      'Catching an error is not handling it. Silent failures are the hardest bugs to find.',
    hint: 'Where does the failure go?',
  },
  {
    slug: 'prod-unbounded-map',
    title: 'Memory climbs all day',
    topicSlug,
    subtopic: 'memory leaks',
    type: 'BUG_HUNT',
    difficulty: 3,
    prompt: "The server's memory grows until it restarts every few hours. Which line is the bug?",
    codeSnippet:
      "const cache = {};\napp.get('/user/:id', async (req, res) => {\n  const user = await User.findById(req.params.id);\n  cache[req.params.id + Date.now()] = user;\n  res.json(user);\n});",
    answerKey: '4',
    explanation:
      'Adding Date.now() makes every key unique, so entries are added but never reused or removed. The object grows forever. A real cache needs reusable keys plus a size limit or expiry (e.g. an LRU cache).',
    misconception:
      'Garbage collection cannot free objects your code still references, like entries in a global map.',
    hint: 'Is any key ever read or written twice?',
  },
  {
    slug: 'prod-500-after-deploy',
    title: 'Errors after a deploy',
    topicSlug,
    subtopic: 'triage',
    type: 'ENGINEER_CHOICE',
    difficulty: 1,
    prompt: 'Right after a deploy, some users get 500 errors. What do you do first?',
    options: opts(
      'Read the server error logs for the new errors and their stack traces',
      'Restart the database',
      'Ask users to clear their browser cache',
      'Start rewriting the feature',
    ),
    answerKey: 'a',
    explanation:
      'Evidence first. The logs tell you which endpoint fails, with what error and since when, which points to the cause. Changing things before you know the cause can make it worse.',
    misconception:
      'Acting fast is not the same as guessing fast. A minute in the logs saves an hour of guessing.',
    optionFeedback: {
      b: 'Nothing points to the database yet.',
      c: 'A 500 is a server error; the browser cache is irrelevant.',
      d: "You don't know what is broken yet.",
    },
  },
  {
    slug: 'prod-rollback',
    title: 'Checkout is broken',
    topicSlug,
    subtopic: 'deploys',
    type: 'ENGINEER_CHOICE',
    difficulty: 1,
    prompt:
      'A new release broke checkout for every user. A proper fix will take hours. What do you do now?',
    options: opts(
      'Roll back to the previous version, then fix calmly',
      'Edit code directly on the production server',
      'Wait for the fix; it is only a few hours',
      'Tell users to retry later',
    ),
    answerKey: 'a',
    explanation:
      'Restore service first, then find the cause. A rollback to the last known good version is fast and low risk, and it takes the time pressure off the real fix.',
    misconception:
      'You do not have to fix forward under pressure. Mitigation comes before the root cause.',
    optionFeedback: {
      b: 'Untested hotfixes on live servers often cause a second incident.',
      c: 'Hours of lost sales and trust.',
      d: 'Leaves the outage running.',
    },
  },
  {
    slug: 'prod-p95-latency',
    title: 'The average looks fine',
    topicSlug,
    subtopic: 'metrics',
    type: 'ENGINEER_CHOICE',
    difficulty: 2,
    prompt:
      'The dashboard shows an average latency of 120 ms, yet many users complain that the app is slow. Which metric should you look at?',
    options: opts('The median latency', 'p95 / p99 latency', 'Requests per second', 'CPU usage'),
    answerKey: 'b',
    explanation:
      'Averages hide the slow tail. p95 is the latency that 5% of requests exceed. If it is 3 s, one in twenty requests is painfully slow even though the average looks healthy.',
    misconception:
      'An average describes no real user. Percentiles describe what users actually feel.',
    optionFeedback: {
      a: 'The median hides the slow tail too.',
      c: 'Throughput, not how long each request takes.',
      d: 'A resource metric; it does not show user pain directly.',
    },
    hint: 'What happens to the slowest 5% of requests?',
  },
  {
    slug: 'prod-heavy-health-check',
    title: 'Restarted for being healthy',
    topicSlug,
    subtopic: 'health checks',
    type: 'ENGINEER_CHOICE',
    difficulty: 2,
    prompt:
      "The platform keeps restarting your service. Its /health endpoint queries five tables and sometimes takes 10 s, beyond the platform's 5 s health-check timeout. What do you change?",
    options: opts(
      'Make /health lightweight: check that the process is up and do a quick DB ping',
      'Remove the health check entirely',
      'Add two more tables to the check for safety',
      'Restart the service every hour on a schedule',
    ),
    answerKey: 'a',
    explanation:
      'A health check should answer "can this instance serve traffic?" quickly. Heavy checks fail under load, the platform restarts healthy instances, and load gets even worse.',
    misconception:
      'A more thorough health check is not a safer one. It becomes a source of outages.',
    optionFeedback: {
      b: 'Then truly broken instances keep receiving traffic.',
      c: 'Slower checks, more false restarts.',
      d: 'Hides the problem and adds planned downtime.',
    },
    hint: 'What question should a health check answer, and how fast?',
  },
  {
    slug: 'prod-request-ids',
    title: 'One request, many log lines',
    topicSlug,
    subtopic: 'observability',
    type: 'ENGINEER_CHOICE',
    difficulty: 2,
    prompt:
      "One user's request fails somewhere across the API, a worker and a payment call. The logs from all users are interleaved. How do you trace that one request?",
    options: opts(
      'Attach a request id to every log line and pass it along to downstream calls',
      'Log more text with console.log everywhere',
      "Reproduce it by guessing the user's inputs",
      'Turn logging off to reduce noise',
    ),
    answerKey: 'a',
    explanation:
      'A correlation (request) id in structured logs lets you filter every line that belongs to one request, across services. That turns a haystack into a timeline.',
    misconception: 'More logs is not better observability. Logs you can connect to each other are.',
    optionFeedback: {
      b: 'More unconnected text makes it harder.',
      c: 'Slow, unreliable and often impossible.',
      d: 'Removes the evidence.',
    },
  },
  {
    slug: 'prod-canary',
    title: 'The canary got sick',
    topicSlug,
    subtopic: 'deploys',
    type: 'ENGINEER_CHOICE',
    difficulty: 3,
    prompt:
      'You roll a release out to 5% of servers first (a canary). On those servers the error rate doubles, while the rest look normal. What next?',
    options: opts(
      'Stop the rollout and roll the canary back, then investigate',
      'Roll out to 100% to get a bigger sample',
      'Ignore it: 5% of traffic is small',
      'Restart the canary servers and continue',
    ),
    answerKey: 'a',
    explanation:
      'This is exactly what a canary is for: catching a bad release while it affects few users. A clear signal on the canary only means you halt and roll back before it reaches everyone.',
    misconception:
      'Canary results are not noise to average away. A difference between canary and baseline is the signal.',
    optionFeedback: {
      b: 'Spreads a known regression to all users.',
      c: 'Those are real users, and it grows on full rollout.',
      d: 'A restart does not change the new code.',
    },
    hint: 'Why deploy to 5% first?',
  },
];
