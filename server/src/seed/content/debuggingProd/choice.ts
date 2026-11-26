import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'debugging-prod' as const;
const type = 'ENGINEER_CHOICE' as const;

/** Debugging & production: Engineer's Choice, 6 per level (P12). */
export const DEBUGGING_PROD_CHOICE: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'prod-500-after-deploy',
    title: 'Errors after a deploy',
    topicSlug,
    subtopic: 'triage',
    type,
    difficulty: 1,
    prompt: 'Right after a deploy, some users get 500 errors. What do you do first?',
    options: opts(
      'Restart the database, since most 500s come from it',
      'Ask the users who reported it to clear their browser cache and try again',
      'Read the server error logs for the new errors and their stack traces',
      'Start rewriting the feature that changed in the deploy',
    ),
    answerKey: 'c',
    explanation:
      'Evidence first. The logs tell you which endpoint fails, with what error and since when, which points to the cause (and whether rolling back is the right move). Changing things before you know the cause can make it worse.',
    misconception:
      'Acting fast is not the same as guessing fast. A minute in the logs saves an hour of guessing.',
    optionFeedback: {
      a: 'Nothing points to the database yet, and a restart drops every connection.',
      b: 'A 500 is a server error; the browser cache cannot cause it.',
      d: "You don't know what is broken yet, so you don't know what to rewrite.",
    },
  },
  {
    slug: 'prod-rollback',
    title: 'Checkout is broken',
    topicSlug,
    subtopic: 'deploys',
    type,
    difficulty: 1,
    prompt:
      'A new release broke checkout for every user. A proper fix will take hours. What do you do now?',
    options: opts(
      'Edit the code directly on the production server to patch it',
      'Roll back to the previous version, then fix it calmly',
      'Keep the release and work on the fix; it is only a few hours',
      'Put a banner on the site asking users to retry later',
    ),
    answerKey: 'b',
    explanation:
      'Restore service first, then find the cause. A rollback to the last known good version is fast and low risk, and it takes the time pressure off the real fix.',
    misconception:
      'You do not have to fix forward under pressure. Mitigation comes before the root cause.',
    optionFeedback: {
      a: 'Untested edits on live servers often cause a second incident, and the next deploy overwrites them.',
      c: 'Hours of lost sales and trust while a fix is possible in minutes.',
      d: 'Tells users about the outage but leaves it running.',
    },
  },
  {
    slug: 'prod-what-to-log',
    title: 'A log line you can use',
    topicSlug,
    subtopic: 'logging',
    type,
    difficulty: 1,
    prompt:
      'A payment fails in production. Which log line will help most when you investigate it next week?',
    options: opts(
      "console.log('payment error')",
      "logger.error(JSON.stringify(req.body)), so you have every input",
      "logger.debug({ err, orderId }, 'payment failed'), to keep the logs quiet",
      "logger.error({ err, orderId, userId }, 'payment failed')",
    ),
    answerKey: 'd',
    explanation:
      'A structured error log at the right level carries the error (with its stack), and the ids you need to find the order and the user. You can search and filter on those fields later. Everything else in the log stays readable.',
    misconception:
      'A useful log line answers "what failed, for whom, and why", in fields you can search, without leaking secrets.',
    optionFeedback: {
      a: 'Says something failed, but not which payment, which user or why.',
      b: 'The body holds card details, and a raw string is hard to search. It also lacks the error itself.',
      c: 'Production usually runs at info or warn, so debug lines are dropped. Failures belong at error.',
    },
  },
  {
    slug: 'prod-bisect-regression',
    title: 'Forty commits, one bug',
    topicSlug,
    subtopic: 'debugging method',
    type,
    difficulty: 1,
    prompt:
      'Search results became wrong at some point in the 40 commits since the last good release. You have a test that shows the bug. How do you find the commit that caused it?',
    options: opts(
      'Binary search: test the commit in the middle, keep the half that has the change (git bisect)',
      'Read all 40 diffs carefully until something looks wrong',
      'Revert the newest commit, test, and repeat until the bug is gone',
      'Rewrite the search code, since it is faster than finding the bug',
    ),
    answerKey: 'a',
    explanation:
      'Each test halves the range, so 40 commits take about 6 tests (2^6 = 64). git bisect automates it: mark a good and a bad commit and it checks out the middle each time; with a script (git bisect run) it can do the whole search alone.',
    misconception:
      'Debugging is not reading code until you spot the bug. A test you can run plus a systematic search is faster and works even when the bug looks innocent.',
    optionFeedback: {
      b: 'Slow, and the buggy change may look fine on paper.',
      c: 'Works, but takes up to 40 steps instead of about 6.',
      d: 'You may rewrite the same bug, and you never learn what caused it.',
    },
  },
  {
    slug: 'prod-alert-on-symptoms',
    title: 'What should wake you up?',
    topicSlug,
    subtopic: 'alerting',
    type,
    difficulty: 1,
    prompt: 'You can set up one alert that pages the on-call engineer at night. Which one?',
    options: opts(
      'CPU above 70% on any server for more than a minute',
      'Every error log line, so nothing is missed',
      'Checkout requests failing above 2% for 5 minutes',
      'A daily email with the total number of errors',
    ),
    answerKey: 'c',
    explanation:
      'Page on what users feel: a key flow failing, measured over a few minutes so one blip does not wake anyone. High CPU, single errors and daily totals are useful on dashboards, but they either fire when users are fine or arrive too late.',
    misconception:
      'Good alerts are about symptoms, not causes. A busy CPU with happy users is not an emergency.',
    optionFeedback: {
      a: 'CPU can be high while users are fine, so this pages people for nothing.',
      b: 'Some errors are normal. Paging on every one trains people to ignore the pager.',
      d: 'Too late: a checkout outage at 2 a.m. needs a human before morning.',
    },
  },
  {
    slug: 'prod-feature-flag-kill-switch',
    title: 'An off switch for checkout',
    topicSlug,
    subtopic: 'deploys',
    type,
    difficulty: 1,
    prompt:
      'You are launching a risky new checkout flow. If it misbehaves, you want to turn it off within seconds, without a deploy. What do you build?',
    options: opts(
      'Keep it on a long-lived branch and merge it only once it is fully proven',
      'Deploy it late at night when there is less traffic',
      'Leave the old code commented out so it can be restored quickly',
      'A feature flag that switches between the old and new flow at runtime',
    ),
    answerKey: 'd',
    explanation:
      'A feature flag is read at runtime from config, so flipping it changes behaviour in seconds with no build or deploy. You can also turn it on for 1% of users first and widen it as it proves itself.',
    misconception:
      'Shipping code and releasing a feature can be separate steps. Flags let you deploy dark and release when you choose.',
    optionFeedback: {
      a: 'The risk just moves to the merge day, and the branch drifts from main.',
      b: 'Fewer users see the problem, but turning it off still needs a deploy.',
      c: 'Restoring commented code is a code change plus a deploy, not seconds.',
    },
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'prod-p95-latency',
    title: 'The average looks fine',
    topicSlug,
    subtopic: 'metrics',
    type,
    difficulty: 2,
    prompt:
      'The dashboard shows an average latency of 120 ms, yet many users complain that the app is slow. Which metric should you look at?',
    options: opts(
      'The median latency, which is not skewed by outliers',
      'p95 / p99 latency',
      'Requests per second, to see whether traffic grew',
      'CPU usage of the API servers',
    ),
    answerKey: 'b',
    explanation:
      'Averages hide the slow tail. p95 is the latency that 5% of requests exceed. If it is 3 s, one in twenty requests is painfully slow even though the average looks healthy.',
    misconception:
      'An average describes no real user. Percentiles describe what users actually feel.',
    optionFeedback: {
      a: 'The median hides the slow tail too: half the requests can be fast while many are slow.',
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
    type,
    difficulty: 2,
    prompt:
      "The platform keeps restarting your service. Its /health endpoint queries five tables and sometimes takes 10 s, beyond the platform's 5 s health-check timeout. What do you change?",
    options: opts(
      'Remove the health check, since it is causing the restarts',
      "Raise the platform's health-check timeout to 15 s",
      'Cache the five-table result and refresh it every minute',
      'Make /health answer fast from the process alone; check the database in readiness',
    ),
    answerKey: 'd',
    explanation:
      'A health check that triggers restarts should answer "is this process alive?" quickly, without calling the database: a restart cannot fix a slow database. Heavy checks fail under load, the platform restarts healthy instances, and load gets even worse. Dependency checks belong in a readiness check, which only stops traffic.',
    misconception:
      'A more thorough health check is not a safer one. It becomes a source of outages.',
    optionFeedback: {
      a: 'Then truly broken instances keep receiving traffic.',
      b: 'Hides the slowness, and a stuck instance now takes three times longer to be noticed.',
      c: 'A cached answer can say "healthy" for a minute after the instance broke.',
    },
    hint: 'What question should a health check answer, and how fast?',
  },
  {
    slug: 'prod-request-ids',
    title: 'One request, many log lines',
    topicSlug,
    subtopic: 'observability',
    type,
    difficulty: 2,
    prompt:
      "One user's request fails somewhere across the API, a worker and a payment call. The logs from all users are interleaved. How do you trace that one request?",
    options: opts(
      'Add more console.log lines in every service around the failing code',
      "Reproduce it locally by guessing the user's inputs",
      'Put a request id on every log line and pass it downstream',
      'Lower the log level to debug everywhere until it happens again',
    ),
    answerKey: 'c',
    explanation:
      'A correlation (request) id in structured logs lets you filter every line that belongs to one request, across services. That turns a haystack into a timeline.',
    misconception: 'More logs is not better observability. Logs you can connect to each other are.',
    optionFeedback: {
      a: 'More unconnected text makes the haystack bigger.',
      b: 'Slow, unreliable and often impossible.',
      d: 'Much more volume and cost, and the lines still cannot be tied to one request.',
    },
  },
  {
    slug: 'prod-canary',
    title: 'The canary got sick',
    topicSlug,
    subtopic: 'deploys',
    type,
    difficulty: 2,
    prompt:
      'You roll a release out to 5% of servers first (a canary). After an hour, the canary has served 20,000 requests with 400 errors (2%), while the other servers sit at 1%. What next?',
    options: opts(
      'Stop the rollout and roll the canary back, then investigate',
      'Roll out to 100% to get a bigger sample',
      'Carry on: 5% of traffic is small and the other servers look normal',
      'Restart the canary servers and continue the rollout',
    ),
    answerKey: 'a',
    explanation:
      'This is exactly what a canary is for: catching a bad release while it affects few users. 400 errors where about 200 were expected, over 20,000 requests, is far beyond chance, so you halt and roll back before it reaches everyone.',
    misconception:
      'Canary results are not noise to average away. A difference between canary and baseline is the signal.',
    optionFeedback: {
      b: 'Spreads a known regression to all users.',
      c: 'Those are real users, and the problem grows on full rollout.',
      d: 'A restart does not change the new code.',
    },
    hint: 'Why deploy to 5% first?',
  },
  {
    slug: 'prod-log-volume-cost',
    title: 'The log bill tripled',
    topicSlug,
    subtopic: 'logging',
    type,
    difficulty: 2,
    prompt:
      'Your log bill tripled. 80% of lines are info-level "request done" lines, most of them for /health probes. You still need every error and every slow request. What do you do?',
    options: opts(
      'Switch production to the error level only',
      'Skip access logs for /health, sample successful fast requests, keep all errors and slow ones',
      'Keep everything, but shorten retention from 30 days to 3',
      'Move logging to console.log, which is cheaper',
    ),
    answerKey: 'b',
    explanation:
      'Cut the lines with no value (health probes) and sample the routine ones (keep, say, 1 in 20 successful fast requests), while keeping every line you said you need. Volume drops by most of the 80% and nothing important is lost. Metrics, not logs, are the cheap way to count every request.',
    misconception:
      'Logging less does not mean seeing less. What matters is keeping the lines that answer questions.',
    optionFeedback: {
      a: 'Loses slow-request lines and every warning, which you said you need.',
      c: 'You pay to ingest the same volume, and you lose history you need to investigate.',
      d: 'Where the lines are written does not change how many reach the log service.',
    },
  },
  {
    slug: 'prod-timeout-optional-dependency',
    title: 'Recommendations that hang',
    topicSlug,
    subtopic: 'timeouts',
    type,
    difficulty: 2,
    prompt:
      "The product page calls a recommendations service. It usually answers in 100 ms but sometimes hangs for 60 s, and the gateway kills page requests after 10 s. Recommendations are optional on the page. What do you change?",
    options: opts(
      'Retry the recommendations call up to 3 times when it is slow',
      "Raise the gateway timeout to 60 s so the page can wait",
      'Give the pool more connections so hung calls do not block others',
      'A short timeout (about 300 ms) on the call; render the page without recommendations if it fires',
    ),
    answerKey: 'd',
    explanation:
      'An optional dependency must never take the page down with it. A tight timeout caps how long it can delay you, and a fallback (no recommendations, or a cached list) keeps the page useful. Your own deadline (10 s) should be longer than the longest chain of calls made one after another beneath it.',
    misconception:
      'No timeout means "wait as long as the slowest dependency". Every outbound call needs an explicit deadline and a plan for when it passes.',
    optionFeedback: {
      a: 'Each retry can hang too: three 60 s waits instead of one, and more load on a struggling service.',
      b: 'Users leave long before 60 s, and each waiting request holds memory and sockets.',
      c: 'Hung calls fill the bigger pool too; it only delays the moment it runs out.',
    },
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'prod-retry-storm-breaker',
    title: 'Helping it to death',
    topicSlug,
    subtopic: 'retries',
    type,
    difficulty: 3,
    prompt:
      'The pricing service is overloaded and fails 60% of requests with 503. Your 40 API instances each retry a failed call 3 times immediately. Pricing cannot be scaled for another hour. What do you change in your API?',
    options: opts(
      'A circuit breaker that stops calling pricing for a while after repeated failures, plus backoff with jitter',
      'More retries (5), so more requests eventually get through',
      'Scale your API to 80 instances so more requests are in flight',
      'Raise the call timeout from 2 s to 20 s so slow requests can finish',
    ),
    answerKey: 'a',
    explanation:
      'At 60% failure, immediate retries roughly double the load on a service that is failing because of load, so it stays down. A circuit breaker notices the failure rate, fails fast (show cached prices or an error) and lets a few trial requests through to see when pricing recovers. Backoff with jitter spreads the retries that remain.',
    misconception:
      'Retries are a load multiplier. Against an overloaded service, the kind thing is to stop calling it for a while.',
    optionFeedback: {
      b: 'More retries mean even more load on the overloaded service, and fewer successes.',
      c: 'Twice the callers sending twice the retries. Pricing is the bottleneck, not your API.',
      d: 'Requests pile up in flight on both sides, which deepens the overload.',
    },
  },
  {
    slug: 'prod-rollback-blocked-by-migration',
    title: 'The rollback that breaks inserts',
    topicSlug,
    subtopic: 'deploys',
    type,
    difficulty: 3,
    prompt:
      'Release v42 added a NOT NULL column orders.channel (no default) and code that fills it. v42 also broke order search. v41 knows nothing about channel. Orders keep flowing in, and the channel of every order placed since v42 must be kept. What do you do?',
    options: opts(
      'Roll back to v41 right away: rollbacks come first',
      'Roll back to v41 and run the down-migration that drops channel',
      'Ship v43: v42 minus the search change, keeping the column',
      'Leave v42 running until the search bug is fixed properly',
    ),
    answerKey: 'c',
    explanation:
      'Rolling back is normally right, but here the old code would break every insert: v41 does not write channel, and the column is NOT NULL with no default. Reverting just the broken search commit and deploying forward restores search while keeping the schema the running code needs. Next time, use expand and contract: add the column as nullable (or with a default) first, so either version can run against the schema.',
    misconception:
      'A rollback is only safe if the old code works with the new schema. Migrations can make the "last good version" incompatible.',
    optionFeedback: {
      a: 'v41 inserts without channel, so every new order fails the NOT NULL constraint.',
      b: 'Dropping the column throws away the channel data you were told to keep, and the down-migration needs its own lock and deploy under pressure.',
      d: 'Search stays broken for every user until a full fix lands, when a one-commit revert would restore it now.',
    },
  },
  {
    slug: 'prod-canary-small-sample',
    title: 'Two errors',
    topicSlug,
    subtopic: 'deploys',
    type,
    difficulty: 3,
    prompt:
      'After 10 minutes the canary has served 400 requests with 2 errors (0.5%). The baseline served 7,600 with 30 errors (0.39%). No alerts, no complaints, and the rollout has an automatic rollback if the canary error rate passes 2%. What do you do?',
    options: opts(
      'Roll back: the canary error rate is higher than the baseline',
      'Promote to 100%: the difference is tiny',
      'Restart the canary to see whether the errors go away',
      'Keep the canary at 5% and wait for more data',
    ),
    answerKey: 'd',
    explanation:
      'At the baseline rate, 400 requests would produce about 1.6 errors, so 2 errors is exactly what chance looks like. The data cannot tell a good release from a bad one yet. Keep the canary running (with the automatic rollback as a safety net) until there is enough traffic to see a real difference, then decide. Canary tools use statistical tests for this reason.',
    misconception:
      'A higher number is not a significant difference. With small samples, a canary needs time before it can say anything.',
    optionFeedback: {
      a: 'Rolls back a release on noise; do that often and canaries stop being trusted.',
      b: 'Promotes a release that has not been tested on enough traffic to know.',
      c: 'A restart does not change the code, and two errors give no sign that the process is unhealthy.',
    },
  },
  {
    slug: 'prod-heap-snapshot-leak',
    title: 'A leak worth finding',
    topicSlug,
    subtopic: 'memory leaks',
    type,
    difficulty: 3,
    prompt:
      'Heap use grows by about 50 MB an hour on every instance, and each one is killed for running out of memory every 8 hours. Taking a heap snapshot pauses the process for several seconds and needs extra memory. How do you find the cause?',
    options: opts(
      'Raise the memory limit to 4 GB so instances last for days',
      'On one instance taken out of the load balancer, take two heap snapshots an hour apart and compare what grew',
      'Snapshot every instance at once at peak traffic, for the biggest sample',
      'Restart every instance on a 6-hour schedule',
    ),
    answerKey: 'b',
    explanation:
      'Comparing two snapshots shows which objects (and which code that retains them) grew between them. Doing it on an instance with no traffic avoids a multi-second pause for users and an out-of-memory crash during the snapshot. The other options keep the service up for longer but never tell you what leaks.',
    misconception:
      'Restarts and bigger limits are mitigations, not fixes. A leak is found by comparing what memory holds over time.',
    optionFeedback: {
      a: 'Buys time, but the leak is still there and the crashes come later.',
      c: 'Pauses every instance during peak traffic, and a snapshot can push a nearly full instance over its limit.',
      d: 'A reasonable stopgap, but it hides the leak instead of finding it.',
    },
  },
  {
    slug: 'prod-postmortem-action',
    title: 'One typo, every region',
    topicSlug,
    subtopic: 'incident response',
    type,
    difficulty: 3,
    prompt:
      'An engineer pushed a config change with a typo. The config system applied it to every region within 20 seconds, and the site was down for 40 minutes. Which postmortem action best stops one bad change from reaching every region again?',
    options: opts(
      'Roll config out region by region with automatic validation and health checks between steps',
      'Take config access away from the engineer who made the typo',
      'Add a checklist item: "double-check config changes before pushing"',
      'Require a second reviewer to approve every config change',
    ),
    answerKey: 'a',
    explanation:
      'The typo was a human mistake that will happen again. What turned it into a global outage was the system: a change reached every region at once with nothing checking it. Validation catches many bad configs before they apply, and a staged rollout limits the blast radius of the ones that get through. That fixes the system rather than the person.',
    misconception:
      'Postmortems are blameless for a reason: people always make mistakes, so the useful question is why one mistake could reach everyone at once.',
    optionFeedback: {
      b: 'Blame teaches people to hide mistakes, and the next person makes the same typo.',
      c: 'Relies on people never being tired or rushed, which is the failure that just happened.',
      d: 'Worth having, but reviewers miss typos too, and a change that slips through still reaches every region at once.',
    },
  },
  {
    slug: 'prod-load-shedding',
    title: 'Three times the traffic',
    topicSlug,
    subtopic: 'overload',
    type,
    difficulty: 3,
    prompt:
      'A marketing push sends 3× normal traffic. The database is at 100% CPU, p99 is 30 s and checkout is failing along with everything else. A bigger database or read replicas take 20 minutes. What do you do now?',
    options: opts(
      'Restart the database to clear the overload',
      'Raise every timeout so slow requests can finish',
      'Shed load: quickly reject or degrade non-critical endpoints (recommendations, search) so checkout gets the capacity',
      'Increase each API instance pool from 10 to 50 connections',
    ),
    answerKey: 'c',
    explanation:
      'When demand is above capacity, something has to give. Choosing what gives (fast 503s or cached responses for the less important endpoints) keeps checkout inside the capacity you have, while the bigger database is being prepared. Without shedding, every request slows down and almost none succeed.',
    misconception:
      'Under overload, serving everyone slowly means serving no one. Rejecting some requests quickly is how the important ones succeed.',
    optionFeedback: {
      a: 'All the traffic comes straight back to a cold database, and in-flight work is lost.',
      b: 'More requests are in flight at once, which means more queueing on the database.',
      d: 'More concurrent queries on a database already at 100% CPU make each one slower.',
    },
  },
];
