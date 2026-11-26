import { opts, type ChallengeSeed } from '../schema';

/**
 * Incident Room scenarios (docs/product/game-modes.md §5). Three stages each: alert → investigate → resolve.
 * Topics with a finished V2 bank keep theirs next to their singles (jsAsync/, httpApis/).
 */
export const INCIDENTS: ChallengeSeed[] = [
  {
    slug: 'incident-missing-index',
    title: 'Production is slowing down',
    topicSlug: 'databases',
    subtopic: 'indexes',
    type: 'INCIDENT',
    difficulty: 1,
    prompt: 'You are on call. The API has slowed to a crawl.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'p95 latency is 2.4 s (normally 150 ms). Database CPU 92%. App server CPU 35%. Traffic is normal.',
        prompt: 'What do you investigate first?',
        options: opts(
          'Database query performance',
          'Frontend rendering',
          'App server CPU',
          'DNS configuration',
        ),
        answerKey: 'a',
        explanation:
          'Traffic is normal and the app servers are relaxed, but the database is pegged. The load is coming from the queries the app sends it.',
        misconception:
          'High latency is not always an app-server problem. Follow the resource that is saturated.',
      },
      {
        title: 'Investigate',
        evidence:
          'The slow-query log shows one query running on every request: WHERE customer_email = ? taking 1.8 s and reading 2.4M rows.',
        prompt: 'What do you look at next?',
        options: opts(
          "The query's execution plan and indexes",
          'Restart the app servers',
          'Raise the frontend cache duration',
          'Change the API endpoint URL',
        ),
        answerKey: 'a',
        explanation:
          'Reading 2.4M rows to return a handful smells like a full table scan. The execution plan (EXPLAIN) shows whether an index is being used.',
        misconception:
          'Restarting changes nothing when the slow query will run again on the next request.',
        hint: 'Why would one lookup read 2.4 million rows?',
      },
      {
        title: 'Resolve',
        evidence: 'EXPLAIN shows a full collection scan: there is no index on customer_email.',
        prompt: 'What is the corrective action?',
        options: opts(
          'Add an index on customer_email after checking the workload',
          'Increase the frontend timeout',
          'Add another app server',
          'Disable database transactions',
        ),
        answerKey: 'a',
        explanation:
          'An index on the filtered column turns the scan into a direct lookup. Check write volume first, because every index adds a little cost to inserts and updates.',
        misconception:
          'Scaling app servers sends even more slow queries to the same struggling database.',
      },
    ],
    rootCause:
      'A frequent query filtered on customer_email, which had no index, so every request did a full table scan. That saturated the database CPU.',
  },
  {
    slug: 'incident-stale-prices',
    title: 'Stale prices after a sale',
    topicSlug: 'caching-queues',
    subtopic: 'invalidation',
    type: 'INCIDENT',
    difficulty: 2,
    prompt: 'A flash sale started at noon, but customers still see full prices.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The database shows sale prices. The product page API returns old prices for some products. Admin edits saved successfully.',
        prompt: 'Where do you look first?',
        options: opts(
          'The cache in front of the product API',
          'The database replica',
          "The customers' phones",
          'The CDN for images',
        ),
        answerKey: 'a',
        explanation:
          'The source of truth is correct, but the API returns something else. A layer in between, the cache, is serving stale data.',
        misconception:
          'If the database is right and the response is wrong, the bug is in the path between them.',
      },
      {
        title: 'Investigate',
        evidence:
          'Product entries are cached for 24 hours. The admin "save price" code writes to the database only.',
        prompt: 'What is wrong?',
        options: opts(
          "Writes don't invalidate the cache, and the TTL is very long",
          'Redis is out of memory',
          'The database is too slow',
          'The sale started too early',
        ),
        answerKey: 'a',
        explanation:
          'Nothing removes the old entry when the price changes, so it lives until its 24-hour TTL ends.',
        misconception:
          'A TTL is not an invalidation strategy for data that must change at a precise moment.',
        hint: 'What tells the cache that the price changed?',
      },
      {
        title: 'Resolve',
        evidence: 'You need prices to update within seconds of an admin edit.',
        prompt: 'What do you change?',
        options: opts(
          "After the database write succeeds, delete that product's cache key; keep a shorter TTL as a safety net",
          'Delete the cache key before writing to the database',
          'Turn off caching for the sale',
          'Ask customers to refresh',
        ),
        answerKey: 'a',
        explanation:
          "Invalidate after a successful write, so a concurrent read can't re-cache the old value. A shorter TTL bounds the damage if an invalidation is ever missed.",
        misconception:
          'Deleting before the write races with readers and can bring the old price back.',
      },
    ],
    rootCause:
      'Admin price updates wrote to the database but never invalidated the product cache, which had a 24-hour TTL, so old prices stayed in the cache.',
  },
  {
    slug: 'incident-poison-message',
    title: 'The queue that never drains',
    topicSlug: 'caching-queues',
    subtopic: 'queues',
    type: 'INCIDENT',
    difficulty: 3,
    prompt: 'Order confirmation emails stopped going out an hour ago.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The email queue holds 18,000 messages and keeps growing. Workers are running at 100% CPU. Emails sent in the last hour: 0.',
        prompt: 'Busy workers but nothing sent. What do you check?',
        options: opts(
          'Worker logs for what they are processing',
          'Add ten more workers right away',
          'Purge the whole queue',
          'Check the database indexes',
        ),
        answerKey: 'a',
        explanation:
          'Workers are busy but produce nothing, so they are stuck doing the same failing work. Their logs show what.',
        misconception: "More workers help a slow queue. They don't help a stuck one.",
      },
      {
        title: 'Investigate',
        evidence:
          'Every worker crashes on the same message (id 7f3a): the template throws on a null customer name. The message is redelivered immediately, forever.',
        prompt: 'What kind of problem is this?',
        options: opts(
          'A poison message that blocks the queue by failing and retrying forever',
          'The email provider is down',
          'The queue is too small',
          'A memory leak in the workers',
        ),
        answerKey: 'a',
        explanation:
          'One message that can never succeed is retried endlessly, so it takes all the worker capacity and the queue behind it stops moving.',
        misconception: 'Infinite retries turn one bad record into a total outage.',
        hint: 'What happens to a message that always fails?',
      },
      {
        title: 'Resolve',
        evidence: 'You need emails flowing again now and a guard against this happening again.',
        prompt: 'What do you do?',
        options: opts(
          'Cap retries with backoff and move failing messages to a dead-letter queue; fix the null-name bug',
          'Delete the message by hand and change nothing',
          'Retry faster',
          'Stop sending confirmation emails',
        ),
        answerKey: 'a',
        explanation:
          'A retry limit plus a dead-letter queue isolates bad messages so the rest flow. Fixing the template handles the null case, and the DLQ keeps the message for inspection.',
        misconception:
          'Deleting the one message fixes today. The next bad record brings the queue down again.',
      },
    ],
    rootCause:
      'A message with a null customer name crashed the email template on every attempt. Without a retry limit or a dead-letter queue, it was retried forever and blocked all the workers.',
  },
  {
    slug: 'incident-502-after-deploy',
    title: '502s after deploy',
    topicSlug: 'debugging-prod',
    subtopic: 'configuration',
    type: 'INCIDENT',
    difficulty: 1,
    prompt: 'Two minutes after a deploy, every request returns 502 Bad Gateway.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The load balancer returns 502 for all routes. The new instances show "restarting" in the dashboard. The previous release was fine.',
        prompt: 'What do you check first?',
        options: opts(
          "The new instances' startup logs",
          "The users' internet connections",
          'The database schema',
          'Frontend bundle size',
        ),
        answerKey: 'a',
        explanation:
          'A 502 means the gateway got no valid response from the app. Instances that keep restarting are probably crashing on boot, and the startup logs say why.',
        misconception:
          'A 502 is not the app returning an error. It means the app is not answering at all.',
      },
      {
        title: 'Investigate',
        evidence:
          'Startup log: "Invalid environment configuration: JWT_SECRET is required". The release added JWT_SECRET to config validation.',
        prompt: 'What is happening?',
        options: opts(
          'A new required env var is missing in production, so the app exits on boot',
          'The JWT library is broken',
          'The database is down',
          'Too much traffic',
        ),
        answerKey: 'a',
        explanation:
          'The config check correctly refuses to start without the secret. It was added locally but never set on the platform, so every new instance exits.',
        misconception:
          'Failing fast on bad config is a feature: it is better than running with a missing secret.',
        hint: 'What is different between your laptop and production?',
      },
      {
        title: 'Resolve',
        evidence: 'Users are down right now.',
        prompt: 'What is the best sequence?',
        options: opts(
          'Roll back to restore service, set the env var on the platform, redeploy, and add it to .env.example',
          'Remove the config validation',
          'Hardcode the secret in the code',
          'Keep restarting until it works',
        ),
        answerKey: 'a',
        explanation:
          "Restore service first, then fix the config properly, then make the requirement visible (.env.example, a deploy checklist) so it can't be forgotten again.",
        misconception: 'Hardcoding a secret fixes the outage and creates a security incident.',
      },
    ],
    rootCause:
      'The release made JWT_SECRET a required variable, but it was never set in production, so every new instance failed config validation on boot and the gateway returned 502.',
  },
  {
    slug: 'incident-cors-cookies',
    title: 'Login works locally, fails in prod',
    topicSlug: 'debugging-prod',
    subtopic: 'environments',
    type: 'INCIDENT',
    difficulty: 2,
    prompt:
      'After moving the web app to app.example.com and the API to api.example.com, nobody can stay logged in.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'Login returns 200 with a Set-Cookie header, but the next request arrives without the cookie and gets 401. Locally everything worked on one origin.',
        prompt: 'What changed that matters?',
        options: opts(
          'The app and API are now on different origins',
          'The database moved',
          'The password hashing changed',
          "Users' passwords expired",
        ),
        answerKey: 'a',
        explanation:
          'Locally both ran on one origin. Now the browser treats the API as cross-origin, and cookies and CORS behave differently.',
        misconception: '"Works locally" often means "works on a single origin".',
      },
      {
        title: 'Investigate',
        evidence:
          "The cookie is set with SameSite=Lax and no Secure flag. The frontend fetch calls don't use credentials: 'include'. The API responds with Access-Control-Allow-Origin: *.",
        prompt: 'Which explanation fits?',
        options: opts(
          "Cross-origin requests aren't sending credentials, and a wildcard origin can't be used with credentials",
          'The cookie is too large',
          'The JWT secret changed',
          'The API is too slow',
        ),
        answerKey: 'a',
        explanation:
          "Browsers only send cookies cross-origin with credentials: 'include', and only if the server allows that exact origin with Allow-Credentials: true. A wildcard origin is not allowed with credentials.",
        misconception:
          'CORS errors are not server bugs. They are the browser enforcing the rules the server declares.',
        hint: 'When does a browser attach cookies to a cross-origin request?',
      },
      {
        title: 'Resolve',
        evidence: 'You want secure cookie auth across the two subdomains.',
        prompt: 'What do you ship?',
        options: opts(
          "Allow the exact origin with credentials, send requests with credentials: 'include', and set the cookie Secure with a suitable SameSite",
          'Set Access-Control-Allow-Origin: * and hope',
          'Store the session token in localStorage instead',
          'Turn off CORS in the browser',
        ),
        answerKey: 'a',
        explanation:
          'Name the trusted origin explicitly, enable credentials on both sides and use secure cookie flags. That keeps CSRF and leak protections while making login work.',
        misconception: 'Moving tokens to localStorage dodges CORS but exposes them to any XSS.',
      },
    ],
    rootCause:
      "After splitting the app and API across origins, requests no longer carried the session cookie: the client didn't send credentials and the API used a wildcard CORS origin, which browsers reject with credentials.",
  },
  {
    slug: 'incident-deadlock',
    title: 'Deadlock at month-end',
    topicSlug: 'databases',
    subtopic: 'transactions',
    type: 'INCIDENT',
    difficulty: 3,
    prompt: 'During the month-end payout run, transfers start failing in bursts.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'About 3% of transfers fail with "deadlock detected; transaction rolled back". It only happens under heavy concurrent load.',
        prompt: 'What does a deadlock mean?',
        options: opts(
          'Two transactions each hold a lock the other needs, so the database kills one',
          'The database ran out of disk',
          'A query is missing an index',
          'The network dropped packets',
        ),
        answerKey: 'a',
        explanation:
          'Each transaction waits for the other forever, so the database detects the cycle and aborts one of them. It shows up under concurrency, which matches the month-end peak.',
        misconception:
          'Deadlocks are not random database failures. They come from the order your code takes locks in.',
      },
      {
        title: 'Investigate',
        evidence:
          'transfer(A, B) locks account A then B. At the same time, transfer(B, A) locks B then A.',
        prompt: 'Why do these two deadlock?',
        options: opts(
          'They lock the same two rows in opposite order',
          'Both transfers are too large',
          'Accounts A and B are on different servers',
          'The isolation level is too low',
        ),
        answerKey: 'a',
        explanation:
          'Each takes its first lock and then waits for the row the other already holds: a cycle. Lock order is the cause.',
        misconception:
          'More hardware does not fix a lock cycle; it only changes how often it happens.',
        hint: 'Compare the order each transfer locks the rows in.',
      },
      {
        title: 'Resolve',
        evidence: 'Transfers between any two accounts can run at the same time.',
        prompt: 'What is the robust fix?',
        options: opts(
          'Always lock rows in a consistent order (e.g. lowest account id first), and retry the rare deadlock that remains',
          'Run transfers one at a time globally',
          'Remove transactions from transfers',
          'Increase the lock timeout',
        ),
        answerKey: 'a',
        explanation:
          'If every transaction takes locks in the same global order, no cycle can form. A small retry on deadlock errors covers any remaining edge cases safely.',
        misconception: 'Removing transactions trades a deadlock for corrupted balances.',
      },
    ],
    rootCause:
      'Concurrent transfers locked the same pair of account rows in opposite orders, forming lock cycles that the database resolved by aborting one of the transactions.',
  },
];
