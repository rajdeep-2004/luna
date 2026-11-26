import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'databases' as const;
const type = 'ENGINEER_CHOICE' as const;

/** Databases: Engineer's Choice, 6 per level (P11). */
export const DATABASES_CHOICE: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'db-add-index',
    title: 'A slow login lookup',
    topicSlug,
    subtopic: 'indexes',
    type,
    difficulty: 1,
    prompt:
      'SELECT * FROM users WHERE email = ? takes 900 ms on a table of 2 million users. What helps most?',
    options: opts(
      'Add an index on email',
      'Add LIMIT 1000 to the query',
      'Give the database more RAM',
      'Select only the id column instead of *',
    ),
    answerKey: 'a',
    explanation:
      'Without an index, the database reads every row to find the email (a full scan). An index lets it jump to the matching row in a few steps. A unique index on email also prevents duplicate accounts.',
    misconception: 'More hardware makes a full scan a bit faster. An index makes it unnecessary.',
    optionFeedback: {
      b: 'The scan still has to search until it finds matches.',
      c: 'Helps a little until the table grows again.',
      d: 'Fewer columns returned, but the same rows scanned.',
    },
  },
  {
    slug: 'db-money-column',
    title: 'Storing prices',
    topicSlug,
    subtopic: 'data types',
    type,
    difficulty: 1,
    prompt:
      'You are adding a price column for a shop that sells in euros. Which type do you choose?',
    options: opts(
      'FLOAT holding euros, because it handles decimals',
      'TEXT holding strings like "19.99", so nothing is rounded',
      'An integer column holding cents',
      'DOUBLE PRECISION, because it has twice the precision of FLOAT',
    ),
    answerKey: 'c',
    explanation:
      'Integers are exact, so 1999 cents is always 1999 and sums never drift. You format as 19.99 only when showing it. NUMERIC with a fixed scale is also exact; the floating-point types are not.',
    misconception:
      'Floating point cannot represent most decimal fractions exactly, so tiny errors appear in totals and comparisons.',
    optionFeedback: {
      a: '0.1 + 0.2 is not exactly 0.3 in floating point; totals drift by cents.',
      b: 'Exact, but you cannot sum, sort or compare it as a number in SQL.',
      d: 'More bits, same problem: it is still binary floating point.',
    },
  },
  {
    slug: 'db-unique-in-database',
    title: 'Where to stop duplicate usernames',
    topicSlug,
    subtopic: 'constraints',
    type,
    difficulty: 1,
    prompt: 'Usernames must be unique. Where should that rule be enforced?',
    options: opts(
      'In the signup form, by checking as the user types',
      'With a UNIQUE constraint in the database, plus a friendly error in the API',
      'In the API, by querying for the name before inserting',
      'In a nightly job that renames duplicates',
    ),
    answerKey: 'b',
    explanation:
      'The database is the only place that sees every write, so a UNIQUE constraint is the only real guarantee. The API catches the unique-violation error and returns a clear "name taken" message. Checks in the form or API are nice for user experience, not for correctness.',
    misconception:
      'Two signups can check at the same moment, both see "free", and both insert. Only the constraint closes that gap.',
    optionFeedback: {
      a: 'The client can be bypassed, and two people can type the same name at once.',
      c: 'Two requests can both pass the check before either inserts.',
      d: 'Users log in with a name that changes overnight.',
    },
  },
  {
    slug: 'db-foreign-key',
    title: 'Orders for users who do not exist',
    topicSlug,
    subtopic: 'constraints',
    type,
    difficulty: 1,
    prompt:
      'Reports keep finding orders whose user_id points at a user that does not exist. How do you stop new ones?',
    options: opts(
      'Check in the order API that the user exists before inserting',
      'Run a weekly script that deletes orphan orders',
      'Store the user name on each order instead of the id',
      'Add a FOREIGN KEY from orders.user_id to users.id',
    ),
    answerKey: 'd',
    explanation:
      'A foreign key makes the database reject any order whose user_id has no matching user, and decides what happens when a user is deleted (block it, or cascade). Every code path, script and admin tool gets the rule for free.',
    misconception:
      'Relationships the data depends on belong in the schema. Code checks are easy to skip in one path.',
    optionFeedback: {
      a: 'Only protects this one code path, and a user can be deleted right after the check.',
      b: 'Cleans up after the damage and deletes real orders.',
      c: 'Names are not unique and change; you lose the link entirely.',
    },
  },
  {
    slug: 'db-paginate-list',
    title: 'All 50,000 orders at once',
    topicSlug,
    subtopic: 'pagination',
    type,
    difficulty: 1,
    prompt:
      'GET /orders returns every order the shop has ever had, about 50,000 rows, and the admin page takes 12 s to load. What do you change?',
    options: opts(
      'Gzip the response so it downloads faster',
      'Return one page at a time, ordered, with a LIMIT and a cursor for the next page',
      'Cache the full 50,000-row response in Redis',
      'Load all the rows, then let the app show 20 at a time',
    ),
    answerKey: 'b',
    explanation:
      'Nobody reads 50,000 rows at once. Paginating means the database reads, the API sends and the phone renders only one page, and the cost stays the same as the table grows.',
    misconception: 'Making a huge response cheaper to send does not fix the fact that it is huge.',
    optionFeedback: {
      a: 'Smaller on the wire, but the query and the JSON are still 50,000 rows.',
      c: 'Still sends 50,000 rows, and the cache is stale after every new order.',
      d: 'The server and network still pay for every row.',
    },
  },
  {
    slug: 'db-connection-pool',
    title: 'Too many connections',
    topicSlug,
    subtopic: 'connections',
    type,
    difficulty: 1,
    prompt:
      'Each request opens a new database connection and closes it at the end. Under load, the database starts refusing with "too many connections". What is the standard fix?',
    options: opts(
      'Raise the database max_connections to 10,000',
      'Keep one global connection and share it for every query',
      'Create a connection pool once at startup and borrow from it',
      'Retry the connection until the database accepts it',
    ),
    answerKey: 'c',
    explanation:
      'A pool keeps a fixed number of open connections and lends them to requests, so you skip the slow connect on every request and never exceed a limit you chose. Requests wait briefly for a free connection instead of overwhelming the database.',
    misconception:
      'Connections are expensive for the database (memory, a process each in Postgres). More of them is not more throughput.',
    optionFeedback: {
      a: 'Each connection costs memory; thousands of them slow the database down.',
      b: 'One connection runs one query at a time, and transactions from different requests mix.',
      d: 'Retries add even more connection attempts to an overloaded server.',
    },
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'db-use-transaction',
    title: 'Both or neither',
    topicSlug,
    subtopic: 'transactions',
    type,
    difficulty: 2,
    prompt:
      'A transfer subtracts from one account and adds to another. If the server crashes between the two updates, money disappears. What do you use?',
    options: opts(
      'Two separate API calls from the client',
      'A database transaction around both updates',
      'A nightly job that fixes mismatched balances',
      'Retry the second update until it works',
    ),
    answerKey: 'b',
    explanation:
      'A transaction makes both updates atomic: they commit together or roll back together. A crash in the middle leaves the data as it was before.',
    misconception: 'Retries cannot fix a crash: the process that would retry is gone.',
    optionFeedback: {
      a: 'The client can disconnect between the calls.',
      c: 'Balances are wrong for hours, and repairs are risky.',
      d: 'Fails if the server itself crashed.',
    },
    hint: 'What gives you all-or-nothing writes?',
  },
  {
    slug: 'db-embed-vs-reference',
    title: 'Orders and their items',
    topicSlug,
    subtopic: 'data modeling',
    type,
    difficulty: 2,
    prompt:
      'In MongoDB, every time you read an order you also need its 1–20 line items. Items are never read on their own. How do you model it?',
    options: opts(
      'Embed the line items as an array inside the order document',
      'Put items in their own collection and $lookup on every read',
      'Store all orders inside the user document',
      'Create one collection per order',
    ),
    answerKey: 'a',
    explanation:
      'Data that is read together and bounded in size belongs together. Embedding gives one read per order and updates the order and its items atomically.',
    misconception:
      '"Always normalise" is a relational habit. In document databases, model around how you read the data.',
    optionFeedback: {
      b: 'An extra join on every read for no benefit.',
      c: 'User documents grow without limit and hit the 16 MB cap.',
      d: 'Collections are not meant to be per record.',
    },
    hint: 'How is this data read, and how big can it get?',
  },
  {
    slug: 'db-keyset-pagination',
    title: 'Page 10,000 is slow',
    topicSlug,
    subtopic: 'pagination',
    type,
    difficulty: 2,
    prompt:
      'The activity log uses ORDER BY id DESC LIMIT 50 OFFSET n. Early pages take 5 ms, but OFFSET 500000 takes 3 s, even with an index on id. The app only has "next page". What do you change?',
    options: opts(
      'Add a second index on id DESC',
      'Cache every page in Redis for an hour',
      'Raise the statement timeout so deep pages finish',
      'Pass the last id seen and query WHERE id < $last ORDER BY id DESC LIMIT 50',
    ),
    answerKey: 'd',
    explanation:
      'OFFSET still walks past every skipped row, so its cost grows with the page number. A keyset (cursor) query jumps straight to the last id through the index and reads 50 rows, so every page is as fast as the first. It fits because the app only moves forward.',
    misconception:
      'An index makes finding a starting point fast; it does not let OFFSET skip rows without visiting them.',
    optionFeedback: {
      a: 'A B-tree index on id already serves both directions.',
      b: 'Each page is stale after new activity, and the first visit is still slow.',
      c: 'Users still wait 3 s, and the database still does the work.',
    },
    hint: 'What does OFFSET 500000 make the database do?',
  },
  {
    slug: 'db-expression-index',
    title: 'Case-insensitive login',
    topicSlug,
    subtopic: 'indexes',
    type,
    difficulty: 2,
    prompt:
      'Login now runs WHERE lower(email) = lower($1) so "Asha@Uni.edu" works. Since then it is slow, although email has an index. What do you add?',
    options: opts(
      'A second plain index on email',
      'An index on the expression lower(email)',
      'LIMIT 1, so the scan stops early',
      'A cache of every user by email in Redis',
    ),
    answerKey: 'b',
    explanation:
      'An index on email stores the original values, and the query asks about lower(email), a value the index does not hold, so Postgres scans the table. An expression index on lower(email) stores exactly what the query compares. (Saving emails already lowercased, or the citext type, also works.)',
    misconception:
      'Wrapping an indexed column in a function usually stops the index from being used.',
    optionFeedback: {
      a: 'Same values as the existing index; the query still cannot use it.',
      c: 'A scan that finds nothing still reads every row before giving up.',
      d: 'Hides the slow query and adds a cache to keep in sync with every email change.',
    },
  },
  {
    slug: 'db-duplicate-signup-race',
    title: 'Double-tap, two accounts',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 2,
    prompt:
      'Signup does: find user by email; if none, insert. Users who double-tap "Create account" sometimes end up with two accounts. What is the robust fix?',
    options: opts(
      'Disable the button after the first tap',
      'Wrap the find and the insert in a transaction',
      'Add a unique index on email and turn the duplicate-key error into a 409',
      'Add a 500 ms sleep between the find and the insert',
    ),
    answerKey: 'c',
    explanation:
      'The two requests both find nothing before either inserts. A unique index makes the database reject the second insert, whatever the timing, and the API maps that error to a clear 409. Disabling the button is still good UX, but it does not stop retries or a second device.',
    misconception:
      'A transaction at the default isolation level does not stop two transactions from both seeing "no rows" and both inserting.',
    optionFeedback: {
      a: 'Good UX, but network retries and other clients still send two requests.',
      b: 'Both transactions read "no user" and both commit their insert.',
      d: 'Makes the race window longer, not shorter.',
    },
    hint: 'What can see both inserts, whatever their timing?',
  },
  {
    slug: 'db-index-write-heavy',
    title: 'Index every column?',
    topicSlug,
    subtopic: 'indexes',
    type,
    difficulty: 2,
    prompt:
      'The events table takes 5,000 inserts per second. The only query filters by (account_id, created_at) for the account dashboard. A teammate wants an index on each of its 8 columns "to be safe". What do you do?',
    options: opts(
      'Index all 8 columns, because indexes only cost disk space',
      'Add no indexes, because they slow down inserts',
      'Index the 4 columns that look most useful',
      'Add one compound index on (account_id, created_at)',
    ),
    answerKey: 'd',
    explanation:
      'Every index must be updated on every insert, so 8 indexes multiply write work on a table that is mostly written. One compound index matching the only query gives fast reads for a small write cost. Add more when a real query needs them.',
    misconception:
      'Indexes are not free: each one adds work to every INSERT, UPDATE and DELETE, plus memory.',
    optionFeedback: {
      a: 'Each index is extra work on all 5,000 inserts a second.',
      b: 'The dashboard query would scan the whole table.',
      c: 'A guess that still costs writes and may not serve the real query.',
    },
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'db-compound-index-order',
    title: 'Which index for the feed?',
    topicSlug,
    subtopic: 'indexes',
    type,
    difficulty: 3,
    prompt:
      "The hot query is: WHERE user_id = ? AND kind IN ('post', 'share') ORDER BY created_at DESC LIMIT 20. About 95% of a user's rows match the kind filter, and power users have millions of rows. Which index serves it best?",
    options: opts(
      'A compound index on (user_id, created_at)',
      'A compound index on (user_id, kind, created_at)',
      'A compound index on (created_at, user_id)',
      'Two separate indexes, on user_id and on created_at',
    ),
    answerKey: 'a',
    explanation:
      "With (user_id, created_at) the database jumps to that user's entries, already ordered by date, and reads them newest first, dropping the 5% with another kind, until it has 20. No sort is needed. Putting kind second looks more precise, but an IN list on it splits the user's rows into two date-ordered runs, so Postgres must read every matching row of both and sort them before the LIMIT.",
    misconception:
      'Matching every filter column is not the goal. A column between the equality filter and the sort column breaks the index order unless it is also an equality.',
    optionFeedback: {
      b: 'The IN on kind breaks the created_at order: millions of rows are read and sorted to return 20.',
      c: "Dates come first, so one user's rows are scattered across the whole index.",
      d: 'The database usually uses one and then filters or sorts; neither gives user rows in date order.',
    },
    hint: "Which index returns this user's rows already in created_at order?",
  },
  {
    slug: 'db-partial-unique-soft-delete',
    title: 'Re-signing up after deleting',
    topicSlug,
    subtopic: 'constraints',
    type,
    difficulty: 3,
    prompt:
      'Accounts are soft-deleted (deleted_at is set). Emails must be unique among active accounts, but someone who deleted their account must be able to sign up again with the same email. What do you build?',
    options: opts(
      'Keep UNIQUE(email) and tell users to contact support',
      'Drop the constraint and check for active duplicates in the API',
      'A unique index on email WHERE deleted_at IS NULL',
      'Rename the email to "deleted-<id>-asha@uni.edu" on delete',
    ),
    answerKey: 'c',
    explanation:
      'A partial unique index only covers rows that match its WHERE, so the rule applies to active accounts and ignores deleted ones. The guarantee stays in the database and the old row keeps its real email for audits.',
    misconception:
      'Uniqueness does not have to cover the whole table. Partial indexes let a constraint follow a business rule exactly.',
    optionFeedback: {
      a: 'Turns a normal flow into a support ticket.',
      b: 'Two concurrent signups both pass the check; the guarantee is gone.',
      d: 'Works, but corrupts audit data and breaks if the mangled value is ever too long or reused.',
    },
  },
  {
    slug: 'db-zero-downtime-rename',
    title: 'Renaming a column on a live API',
    topicSlug,
    subtopic: 'migrations',
    type,
    difficulty: 3,
    prompt:
      'You want to rename users.fullname to display_name. Deploys are rolling: for several minutes old and new app versions run side by side against the same database. How do you do it?',
    options: opts(
      'Add display_name, write both columns, backfill, switch reads, then drop fullname in a later deploy',
      'ALTER TABLE ... RENAME COLUMN in the same deploy as the code change',
      'Rename the column first, then deploy the new code as fast as possible',
      'Create a new users table and copy everything over in one transaction',
    ),
    answerKey: 'a',
    explanation:
      'This is expand and contract. Every step is compatible with both app versions that are running at that moment: old code still finds fullname, new code finds display_name, and the old column is removed only once no running code reads it.',
    misconception:
      'A schema change and a code change never land at the same instant. During a rolling deploy, both versions must work with the schema.',
    optionFeedback: {
      b: 'Old instances still running query fullname and fail until they are replaced.',
      c: 'Every old instance breaks the moment the rename lands.',
      d: 'Locks or doubles a large table, and writes during the copy are lost.',
    },
    hint: 'Which versions of the app are running while the migration lands?',
  },
  {
    slug: 'db-hot-counter-row',
    title: 'One row, three thousand writers',
    topicSlug,
    subtopic: 'locking',
    type,
    difficulty: 3,
    prompt:
      'A live event shows a global "people watching" counter. Every join runs UPDATE stats SET viewers = viewers + 1 WHERE id = 1, about 3,000 times a second, and p99 latency for joins is now 2 s. The number may lag by a few seconds. What do you do?',
    options: opts(
      'Switch to SERIALIZABLE so the updates are correct',
      'Count in memory or Redis per instance and flush the sums to the row every few seconds',
      'Read the value, add 1 in code and write it back',
      'Add an index on stats.id',
    ),
    answerKey: 'b',
    explanation:
      'Every update needs the lock on the same single row, so they queue behind each other. Batching turns 3,000 row updates a second into a handful, and the scenario allows a few seconds of lag. (Splitting the counter into N rows and summing them is the other common fix.)',
    misconception:
      'An atomic increment is correct but not free: on one hot row, writers serialise on the row lock.',
    optionFeedback: {
      a: 'Same lock queue plus serialization failures to retry.',
      c: 'Loses updates, and still takes the same row lock to write.',
      d: 'id is the primary key and already indexed; finding the row is not the slow part.',
    },
  },
  {
    slug: 'db-batched-backfill',
    title: 'Backfilling 50 million rows',
    topicSlug,
    subtopic: 'migrations',
    type,
    difficulty: 3,
    prompt:
      'A new orders.region column must be filled from the shipping address for 50 million existing rows, while the shop keeps taking orders. How do you run the backfill?',
    options: opts(
      'One UPDATE orders SET region = ... for the whole table, at night',
      'Load all orders into the app, compute regions, write them back in one transaction',
      'Make region NOT NULL with a default and let the database fill it',
      'Update in batches of a few thousand by primary-key range, each in its own short transaction, with a pause between batches',
    ),
    answerKey: 'd',
    explanation:
      'Short batches hold row locks for milliseconds, let autovacuum keep up, keep replication lag low, and can be paused or resumed. One giant UPDATE holds locks on 50M rows for its whole run, bloats the table, and if it fails at 90 % it all rolls back.',
    misconception:
      '"Run it at night" does not make a huge transaction safe; locks, bloat and replica lag still hit live traffic.',
    optionFeedback: {
      a: 'Locks millions of rows for a long time and rolls everything back on any failure.',
      b: 'Memory blow-up and the same giant transaction, plus a network trip for every row.',
      c: "A constant default cannot compute a value from each row's address.",
    },
  },
  {
    slug: 'db-serverless-connections',
    title: '200 functions, 100 connections',
    topicSlug,
    subtopic: 'connections',
    type,
    difficulty: 3,
    prompt:
      'The API moved to serverless functions. At peak, 200 instances each open a pool of 10, and Postgres (max_connections 100) refuses connections. What do you do?',
    options: opts(
      'Raise max_connections to 2,000',
      'Retry failed connections with backoff inside each function',
      'Open a new connection per query and close it right away',
      'Put a pooler such as PgBouncer in transaction mode in front of Postgres, and use pool size 1 per instance',
    ),
    answerKey: 'd',
    explanation:
      'Many short-lived instances each holding idle connections exhaust the database. A transaction-mode pooler multiplexes thousands of client connections onto a few dozen real ones, and a pool of 1 per instance stops each function hoarding connections it rarely uses.',
    misconception:
      'Horizontal scaling of app instances multiplies connections. The database limit has to be planned, not raised blindly.',
    optionFeedback: {
      a: 'Each Postgres connection is a process with its own memory; 2,000 hurts performance.',
      b: 'Requests wait or fail, and the retries add even more connection attempts.',
      c: 'Connect cost on every query and the peak count is unchanged.',
    },
    hint: 'What multiplies when the number of instances grows?',
  },
];
