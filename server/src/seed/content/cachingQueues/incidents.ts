import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'caching-queues' as const;
const type = 'INCIDENT' as const;

/** Caching & queues: Incident Room, difficulty 1, 2, 2, 3 (P11). Stages: alert → investigate → resolve. */
export const CACHING_QUEUES_INCIDENTS: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'incident-cache-redis-oom',
    title: 'Carts that will not save',
    topicSlug,
    subtopic: 'eviction',
    type,
    difficulty: 1,
    prompt: 'Since this morning, adding an item to a cart fails for every user.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'API logs: "OOM command not allowed when used memory > \'maxmemory\'" on every cart write. Redis memory: 4.0 GB of 4.0 GB. Postgres and app servers look normal.',
        prompt: 'What is failing?',
        options: opts(
          'Postgres is out of disk space',
          'Redis is full and refusing new writes',
          'The app servers are out of memory',
          'The network to Redis is down',
        ),
        answerKey: 'b',
        explanation:
          'The error comes from Redis, and Redis memory is at its limit. Reads still work, but every write that needs more memory is rejected.',
        misconception:
          'An "OOM" error is not always the app running out of memory. Read which system the error comes from.',
      },
      {
        title: 'Investigate',
        evidence:
          'maxmemory-policy is noeviction. 92% of keys are page-cache entries like page:/products?sort=new&ref=..., written with no TTL. They grow by about 200 MB a day.',
        prompt: 'Why did Redis fill up?',
        options: opts(
          'Carts are too large',
          'Redis has a memory leak',
          'Cache keys never expire, and the policy forbids evicting them',
          'Too many users are online at once',
        ),
        answerKey: 'c',
        explanation:
          'Every unique URL creates a new page key that lives forever, and noeviction tells Redis never to remove anything. Memory only goes up until it hits the limit.',
        misconception:
          'A cache that never forgets is just a slow memory leak. Every cache entry needs a way out: a TTL, an eviction policy, or both.',
        hint: 'How does a page-cache key ever leave Redis?',
      },
      {
        title: 'Resolve',
        evidence: 'Carts must never be evicted. Page-cache entries can always be rebuilt.',
        prompt: 'What do you change?',
        options: opts(
          'Restart Redis now and add an alert for when memory is high',
          'Double maxmemory to 8 GB',
          'Switch the shared instance to allkeys-lru so it evicts when full',
          'TTL page keys; move them to a cache-only instance with allkeys-lru',
        ),
        answerKey: 'd',
        explanation:
          'TTLs stop cache keys piling up, and a cache-only instance with allkeys-lru can evict freely. Carts stay on an instance that never evicts, so they are never lost to make room for a page.',
        misconception:
          'allkeys-lru on the shared instance would fix the errors by evicting carts too. Data you cannot lose and data you can rebuild need different eviction rules.',
      },
    ],
    rootCause:
      'Page-cache entries were written without TTLs into a Redis that used noeviction and also held carts. Memory filled up and Redis rejected every write, including cart updates.',
  },
  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'incident-stale-prices',
    title: 'Stale prices after a sale',
    topicSlug,
    subtopic: 'invalidation',
    type,
    difficulty: 2,
    prompt: 'A flash sale started at noon, but customers still see full prices.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The database shows sale prices. The product page API returns old prices for some products. Admin edits saved successfully.',
        prompt: 'Where do you look first?',
        options: opts(
          'The database replica',
          "The customers' phones",
          'The cache in front of the product API',
          'The CDN for product images',
        ),
        answerKey: 'c',
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
          'Redis is out of memory',
          "Writes don't invalidate the cache, and the TTL is very long",
          'The database is too slow to serve sale traffic',
          'The sale was scheduled in the wrong time zone',
        ),
        answerKey: 'b',
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
          'Delete the cache key first, then write the new price to the database',
          'Turn off caching for the whole sale',
          'Lower the TTL to 1 minute and change nothing else',
          'Delete the key after the write succeeds; keep a short TTL as backstop',
        ),
        answerKey: 'd',
        explanation:
          'Invalidating after a successful write means any read that starts afterwards loads the new price. A rare slow read that straddles the write can still re-cache the old value, so a shorter TTL bounds that case and any invalidation that is ever missed.',
        misconception:
          'Deleting before the write races with readers and can bring the old price back. A short TTL alone still leaves a minute of wrong prices and more database load.',
      },
    ],
    rootCause:
      'Admin price updates wrote to the database but never invalidated the product cache, which had a 24-hour TTL, so old prices stayed in the cache.',
  },
  {
    slug: 'incident-queue-reset-emails-late',
    title: 'Password resets arrive 40 minutes late',
    topicSlug,
    subtopic: 'priorities',
    type,
    difficulty: 2,
    prompt:
      'Support is flooded: password reset emails take 40 minutes to arrive. Yesterday they took seconds.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The email queue has 180,000 waiting jobs. Workers are healthy and sending about 75 emails a second. The email provider reports no errors.',
        prompt: 'What do you check first?',
        options: opts(
          "The email provider's status page",
          'Which jobs make up the backlog, and when they were added',
          'The reset-token code',
          'DNS records for the email domain',
        ),
        answerKey: 'b',
        explanation:
          'Everything is working, just slowly: a big backlog and a steady send rate. The question is where the backlog came from. 180,000 jobs at 75 a second is 40 minutes, which matches the delay.',
        misconception:
          'Late is not the same as failing. When nothing errors, look at what is waiting in front of the slow work.',
      },
      {
        title: 'Investigate',
        evidence:
          'At 9:00 marketing enqueued 180,000 newsletter jobs. Reset emails go into the same queue, behind them. Workers take jobs strictly in order.',
        prompt: 'Why are resets late?',
        options: opts(
          'The newsletter crashed the workers',
          'Reset jobs have a lower retry limit',
          'Workers pick newsletter jobs first because they are smaller and faster',
          'Urgent jobs wait in line behind a bulk send in a shared FIFO queue',
        ),
        answerKey: 'd',
        explanation:
          'A FIFO queue treats every job the same. A reset added at 9:01 waits behind 180,000 newsletters, no matter how urgent it is.',
        misconception: "One queue for all work means the biggest batch sets everyone's latency.",
        hint: 'Where does a reset job added at 9:01 sit in the queue?',
      },
      {
        title: 'Resolve',
        evidence: 'Resets must arrive within a minute, even during a newsletter send.',
        prompt: 'What do you change?',
        options: opts(
          'Give transactional email its own queue and workers',
          'Add enough workers to clear 180,000 jobs in a minute',
          'Ask marketing to send newsletters at night',
          'Send reset emails inside the HTTP request instead of queueing them',
        ),
        answerKey: 'a',
        explanation:
          "Dedicated capacity for transactional mail means a bulk send can never get in front of a reset. Rate-limiting the bulk queue also keeps it from using up the provider's sending limit.",
        misconception:
          'Scaling workers to the largest burst is costly and the provider would throttle you anyway. Isolate work with different urgency instead.',
      },
    ],
    rootCause:
      'Password reset emails shared one FIFO queue with a 180,000-email newsletter, so every reset waited behind the whole bulk send.',
  },
  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'incident-poison-message',
    title: 'The queue that never drains',
    topicSlug,
    subtopic: 'queues',
    type,
    difficulty: 3,
    prompt: 'Order confirmation emails stopped going out an hour ago.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The email queue holds 18,000 messages and keeps growing. Workers are running at 100% CPU. Emails sent in the last hour: 0.',
        prompt: 'Busy workers but nothing sent. What do you check?',
        options: opts(
          'Add ten more workers right away',
          'Purge the whole queue and start fresh',
          'Check the database indexes',
          'Worker logs for what they are processing',
        ),
        answerKey: 'd',
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
          'The email provider is down',
          'A poison message that fails and is retried forever',
          'The queue has run out of space',
          'A memory leak in the workers',
        ),
        answerKey: 'b',
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
          'Delete the message by hand and change nothing',
          'Retry faster so the message gets through',
          'Cap retries, dead-letter what still fails, fix the null name',
          'Stop sending confirmation emails until the template is rewritten',
        ),
        answerKey: 'c',
        explanation:
          'A retry limit plus a dead-letter queue isolates bad messages so the rest flow. Fixing the template handles the null case, and the DLQ keeps the message for inspection.',
        misconception:
          'Deleting the one message fixes today. The next bad record brings the queue down again.',
      },
    ],
    rootCause:
      'A message with a null customer name crashed the email template on every attempt. Without a retry limit or a dead-letter queue, it was retried forever and blocked all the workers.',
  },
];
