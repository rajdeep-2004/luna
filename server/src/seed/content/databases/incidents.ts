import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'databases' as const;
const type = 'INCIDENT' as const;

/** Databases: Incident Room, difficulty 1, 2, 2, 3 (P11). Stages: alert → investigate → resolve. */
export const DATABASES_INCIDENTS: ChallengeSeed[] = [
  // ── Level 1 (V1, options re-ordered in P11) ──────────────────────────────────────
  {
    slug: 'incident-missing-index',
    title: 'Production is slowing down',
    topicSlug,
    subtopic: 'indexes',
    type,
    difficulty: 1,
    prompt: 'You are on call. The API has slowed to a crawl.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'p95 latency is 2.4 s (normally 150 ms). Database CPU 92%. App server CPU 35%. Traffic is normal.',
        prompt: 'What do you investigate first?',
        options: opts(
          'App server CPU',
          'Frontend rendering',
          'DNS configuration',
          'Database query performance',
        ),
        answerKey: 'd',
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
          'Restart the app servers',
          "The query's execution plan and indexes",
          'Raise the frontend cache duration',
          'The size of the database server',
        ),
        answerKey: 'b',
        explanation:
          'Reading 2.4M rows to return a handful smells like a full table scan. The execution plan (EXPLAIN) shows whether an index is being used.',
        misconception:
          'Restarting changes nothing when the slow query will run again on the next request, and a bigger server only scans faster.',
        hint: 'Why would one lookup read 2.4 million rows?',
      },
      {
        title: 'Resolve',
        evidence:
          'EXPLAIN shows a sequential scan of the whole table: there is no index on customer_email.',
        prompt: 'What is the corrective action?',
        options: opts(
          'Add another app server',
          'Increase the API timeout',
          'Add an index on customer_email',
          'Cache every query result for an hour',
        ),
        answerKey: 'c',
        explanation:
          'An index on the filtered column turns the scan into a direct lookup. Check write volume first, because every index adds a little cost to inserts and updates.',
        misconception:
          'Scaling app servers sends even more slow queries to the same struggling database, and caching hides the scan instead of removing it.',
      },
    ],
    rootCause:
      'A frequent query filtered on customer_email, which had no index, so every request did a full table scan. That saturated the database CPU.',
  },
  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'incident-db-pool-exhausted',
    title: 'Timeouts with an idle database',
    topicSlug,
    subtopic: 'connections',
    type,
    difficulty: 2,
    prompt:
      "After this morning's release, the API times out on most requests, but the database looks bored.",
    stages: [
      {
        title: 'Alert',
        evidence:
          'Errors: "timeout acquiring a connection from the pool" (pool size 10). Database CPU 4%, 10 connections open, all "idle in transaction". App CPU low.',
        prompt: 'What does this combination tell you?',
        options: opts(
          'The database is overloaded and needs a bigger instance',
          'The pool is too small for normal traffic',
          'Connections are checked out and never given back, so requests wait for a free one',
          'The network between app and database is dropping packets',
        ),
        answerKey: 'c',
        explanation:
          '"Idle in transaction" means a client opened a transaction and then stopped sending queries without committing. The database is doing nothing; the app simply holds all 10 connections, so new requests wait for the pool and time out.',
        misconception:
          'A pool timeout is not a sign the database is slow. Check what the connections are doing before scaling anything.',
      },
      {
        title: 'Investigate',
        evidence:
          "The release added a coupon check:\nconst client = await pool.connect();\nawait client.query('BEGIN');\nconst c = await findCoupon(client, code);\nif (!c) return res.status(404).end();\n...\nawait client.query('COMMIT');\nclient.release();",
        prompt: 'Which path leaks the connection?',
        options: opts(
          'The 404 return: it never commits, rolls back or releases the client',
          'The COMMIT path: release must come before COMMIT',
          'pool.connect(): it opens a new pool every call',
          'BEGIN: the pool does not support transactions',
        ),
        answerKey: 'a',
        explanation:
          'An early return skips both COMMIT and release(). The client stays checked out with an open transaction. Ten invalid coupons later, the pool is empty.',
        misconception:
          'Every exit path, including early returns and thrown errors, must hand the connection back.',
        hint: 'Follow the request whose coupon code does not exist.',
      },
      {
        title: 'Resolve',
        evidence: 'You want the fix to hold for paths added later too.',
        prompt: 'What do you ship?',
        options: opts(
          'Double the pool size to 20',
          'Restart the API every hour to free connections',
          'Call release() in the 404 branch only',
          'Wrap the work in try/catch/finally: ROLLBACK on error, release() in finally; set idle_in_transaction_session_timeout as a backstop',
        ),
        answerKey: 'd',
        explanation:
          'finally runs on every exit, so no future early return can leak a client. The server-side timeout kills any transaction left idle anyway, so one bug cannot drain the pool for good.',
        misconception:
          'A bigger pool only delays the outage: leaked connections keep piling up until it is full again.',
      },
    ],
    rootCause:
      'A new early return in a transaction skipped COMMIT and release(), so each invalid coupon left a connection checked out and idle in transaction until the pool was empty.',
  },
  {
    slug: 'incident-db-migration-lock',
    title: 'A one-line migration takes the site down',
    topicSlug,
    subtopic: 'migrations',
    type,
    difficulty: 2,
    prompt: 'A deploy ran a migration, and within seconds every request touching orders hangs.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The migration is still running: ALTER TABLE orders ADD COLUMN region text NOT NULL DEFAULT \'eu\'. pg_stat_activity shows 300 queries on orders "waiting for lock". Database CPU is low.',
        prompt: 'Why are simple SELECTs on orders stuck?',
        options: opts(
          'The ALTER is waiting for an exclusive lock, and every new query queues behind it',
          'The new column made each row too large to read',
          'The database is rewriting its indexes in the background',
          'SELECTs are never blocked by schema changes, so it must be the network',
        ),
        answerKey: 'a',
        explanation:
          'ALTER TABLE needs an ACCESS EXCLUSIVE lock. While it waits for that lock, Postgres queues every later query on the table behind it, even plain reads. Low CPU plus "waiting for lock" is the signature.',
        misconception:
          'Even a fast DDL statement can stall a table: what hurts is the queue that forms while it waits for its lock.',
      },
      {
        title: 'Investigate',
        evidence:
          'The oldest blocker is a reporting query started 40 minutes ago holding a lock on orders. The ALTER cannot get its lock until that query ends.',
        prompt: 'What is the chain of events?',
        options: opts(
          'The ALTER is slow because adding a column with a default rewrites the table',
          'A long-running read holds a lock; the ALTER waits for it; everything else waits for the ALTER',
          'The reporting query and the ALTER deadlocked each other',
          'The reporting query is blocked by the ALTER',
        ),
        answerKey: 'b',
        explanation:
          'Locks queue in order. The report holds a shared lock, the ALTER waits for an exclusive one, and every new query lines up behind the ALTER. Since Postgres 11, adding a column with a constant default does not rewrite the table, so the ALTER itself would take milliseconds once it got the lock.',
        misconception:
          'It is not a deadlock: there is no cycle, just a long line behind a waiter. Postgres would resolve a real deadlock by itself.',
        hint: 'Who has been running the longest?',
      },
      {
        title: 'Resolve',
        evidence: 'You need the site back now and safe migrations from now on.',
        prompt: 'What do you do?',
        options: opts(
          'Kill the reporting query and never run reports again',
          'Run all future migrations at 3 a.m. and hope nothing is running',
          "Cancel the migration, then rerun it with SET lock_timeout = '3s' and retries, so it gives up instead of blocking traffic",
          'Raise max_connections so the waiting queries do not fail',
        ),
        answerKey: 'c',
        explanation:
          'Cancelling the ALTER releases the queue immediately. A short lock_timeout makes a migration fail fast when it cannot get its lock, instead of holding everyone hostage; a retry loop runs it again a moment later.',
        misconception:
          'A quiet hour lowers the odds but does not remove them; one long query is enough. Bound the wait instead.',
      },
    ],
    rootCause:
      'An ALTER TABLE waited behind a 40-minute reporting query for its exclusive lock, and every new query on orders queued behind the ALTER. The migration had no lock_timeout.',
  },
  // ── Level 3 (V1, options re-ordered in P11) ──────────────────────────────────────
  {
    slug: 'incident-deadlock',
    title: 'Deadlock at month-end',
    topicSlug,
    subtopic: 'transactions',
    type,
    difficulty: 3,
    prompt: 'During the month-end payout run, transfers start failing in bursts.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'About 3% of transfers fail with "deadlock detected; transaction rolled back". It only happens under heavy concurrent load.',
        prompt: 'What does a deadlock mean?',
        options: opts(
          'A query ran past the statement timeout',
          'Two transactions each hold a lock the other needs, so the database aborts one',
          'Two transactions waited on each other until the lock timeout expired',
          'A row was updated by two transactions, so both were rolled back',
        ),
        answerKey: 'b',
        explanation:
          'Each transaction waits for the other forever, so the database detects the cycle and aborts one of them; the other carries on. It shows up under concurrency, which matches the month-end peak.',
        misconception:
          'Deadlocks are not random database failures. They come from the order your code takes locks in.',
      },
      {
        title: 'Investigate',
        evidence:
          'transfer(A, B) locks account A then B. At the same time, transfer(B, A) locks B then A.',
        prompt: 'Why do these two deadlock?',
        options: opts(
          'The isolation level is too low',
          "The payout run's transactions are long, so lock waits pile up",
          'They lock the same two rows in opposite order',
          'The accounts table is missing an index',
        ),
        answerKey: 'c',
        explanation:
          'Each takes its first lock and then waits for the row the other already holds: a cycle. Lock order is the cause; a stricter isolation level adds more conflicts, not fewer.',
        misconception:
          'More hardware or a different isolation level does not fix a lock cycle; it only changes how often it happens.',
        hint: 'Compare the order each transfer locks the rows in.',
      },
      {
        title: 'Resolve',
        evidence: 'Transfers between any two accounts can run at the same time.',
        prompt: 'What is the robust fix?',
        options: opts(
          'Run transfers one at a time globally',
          'Lock with FOR UPDATE NOWAIT and fail the transfer if a row is busy',
          'Increase the lock timeout',
          'Lock both rows in a fixed order (lowest account id first) and retry the rare deadlock',
        ),
        answerKey: 'd',
        explanation:
          'If every transaction takes locks in the same global order, no cycle can form. A small retry on deadlock errors covers any remaining edge cases safely. A global queue works but throws away all concurrency.',
        misconception:
          'NOWAIT or a longer lock timeout only changes how a lock cycle fails. The cycle comes from lock order, so fix the order.',
      },
    ],
    rootCause:
      'Concurrent transfers locked the same pair of account rows in opposite orders, forming lock cycles that the database resolved by aborting one of the transactions.',
  },
];
