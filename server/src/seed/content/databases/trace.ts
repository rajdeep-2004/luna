import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'databases' as const;
const type = 'TRACE' as const;

const TABLES =
  'users: (1, Asha), (2, Ben), (3, Chen)\norders: (101, user 1), (102, user 1), (103, user 2)';

/** Databases: Trace the Stack, 6 per level (P11). */
export const DATABASES_TRACE: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'db-inner-join-rows',
    title: 'Counting join rows',
    topicSlug,
    subtopic: 'joins',
    type,
    difficulty: 1,
    prompt: `${TABLES}\n\nHow many rows does this query return?`,
    codeSnippet: 'SELECT u.name, o.id\nFROM users u\nJOIN orders o ON o.user_id = u.id;',
    options: opts('2', '3', '4', '6'),
    answerKey: 'b',
    explanation:
      'An inner join returns one row per matching pair. Asha matches two orders and Ben one, so 3 rows. Chen has no orders and is left out.',
    misconception: 'An inner join does not keep every user: rows without a match disappear.',
  },
  {
    slug: 'db-null-equals',
    title: 'Who has no referrer?',
    topicSlug,
    subtopic: 'NULL',
    type,
    difficulty: 1,
    prompt:
      'The users table has 5 rows. Three of them have referrer_id set to NULL. What does this query return?',
    codeSnippet: 'SELECT COUNT(*) FROM users\nWHERE referrer_id = NULL;',
    options: opts('3', 'An error: you cannot compare with NULL', '0', '5'),
    answerKey: 'c',
    explanation:
      'NULL means "unknown", and comparing anything with unknown gives unknown, never true. No row passes the WHERE, so the count is 0. Use WHERE referrer_id IS NULL to get 3.',
    misconception:
      '= NULL is valid SQL that quietly matches nothing. It does not raise an error, which is why the bug survives.',
    hint: 'What is NULL = NULL in SQL?',
  },
  {
    slug: 'db-order-by-limit',
    title: 'The top two',
    topicSlug,
    subtopic: 'sorting',
    type,
    difficulty: 1,
    prompt:
      'Rows were inserted in this order: Asha 50, Ben 80, Chen 70, Dev 20. Which names come back, in order?',
    codeSnippet: 'SELECT name FROM players\nORDER BY score DESC\nLIMIT 2;',
    options: opts('Asha, Ben', 'Dev, Asha', 'Chen, Ben', 'Ben, Chen'),
    answerKey: 'd',
    explanation:
      'The database sorts every row by score from highest to lowest (80, 70, 50, 20) and only then keeps the first two: Ben, then Chen.',
    misconception:
      'LIMIT is applied after ORDER BY, not to the first rows inserted. Insert order is never a promise of output order.',
  },
  {
    slug: 'db-group-by-rows',
    title: 'One row per what?',
    topicSlug,
    subtopic: 'aggregation',
    type,
    difficulty: 1,
    prompt: `${TABLES}\n\nHow many rows does this query return?`,
    codeSnippet: 'SELECT user_id, COUNT(*) AS n\nFROM orders\nGROUP BY user_id;',
    options: opts('3, one per order', '1, the total count', '2, one per user who has orders', '3, one per user'),
    answerKey: 'c',
    explanation:
      'GROUP BY collapses rows that share a user_id into one row. The orders table only mentions users 1 and 2, so there are 2 groups: (1, 2) and (2, 1). Chen is not in the orders table at all.',
    misconception:
      'GROUP BY works on the rows of the table you query. It cannot invent a group for a user who has no orders; that needs a join from users.',
  },
  {
    slug: 'db-unique-second-insert',
    title: 'The same email twice',
    topicSlug,
    subtopic: 'constraints',
    type,
    difficulty: 1,
    prompt:
      'The users table has a UNIQUE constraint on email and starts empty. These two statements are sent one after the other, each in its own autocommit transaction. What is in the table afterwards?',
    codeSnippet:
      "INSERT INTO users (email) VALUES ('asha@uni.edu');\nINSERT INTO users (email) VALUES ('asha@uni.edu');",
    options: opts(
      'Two rows that share the same email address',
      'One row; the second INSERT fails',
      'One row; the second INSERT overwrites the first one with the new data',
      'No rows, because the database rejects both statements',
    ),
    answerKey: 'b',
    explanation:
      'The first INSERT succeeds. The second breaks the UNIQUE rule, so the database rejects it with a unique-violation error and leaves the first row untouched.',
    misconception:
      'A unique constraint does not merge or replace rows. If you want "insert or update", you have to ask for it (for example INSERT ... ON CONFLICT).',
  },
  {
    slug: 'db-mongo-inc-concurrent',
    title: 'Two likes at once',
    topicSlug,
    subtopic: 'atomic updates',
    type,
    difficulty: 1,
    prompt:
      'A post has likes: 10. Two users tap like at the same moment, so these two updates reach MongoDB together. What is likes afterwards?',
    codeSnippet:
      '// request 1 and request 2, at the same time\nawait Post.updateOne({ _id: postId }, { $inc: { likes: 1 } });',
    options: opts(
      '11, because the second update overwrites the first',
      'Either 11 or 12, depending on timing',
      '10, because the two updates cancel out',
      '12',
    ),
    answerKey: 'd',
    explanation:
      '$inc is applied inside the database, atomically, to whatever the current value is. Each update adds 1 to the latest value, so the result is always 12.',
    misconception:
      'Lost updates come from reading a value into your code and writing it back. An atomic operator like $inc never reads into the app, so there is nothing to lose.',
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'db-left-join-count',
    title: 'The user with no orders',
    topicSlug,
    subtopic: 'joins',
    type,
    difficulty: 2,
    prompt: `${TABLES}\n\nWhat does Chen's row show?`,
    codeSnippet:
      'SELECT u.name, COUNT(o.id) AS orders\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nGROUP BY u.name;',
    options: opts('Chen, 0', 'Chen, 1', 'Chen, NULL', 'Chen is not in the result'),
    answerKey: 'a',
    explanation:
      'The LEFT JOIN keeps Chen with NULLs for the order columns. COUNT(o.id) counts only non-NULL values, so Chen gets 0.',
    misconception:
      'COUNT(*) and COUNT(column) differ: COUNT(*) would count the NULL row and give 1.',
    hint: 'Which values does COUNT(o.id) skip?',
  },
  {
    slug: 'db-not-in-null',
    title: 'Nobody has referred anyone?',
    topicSlug,
    subtopic: 'NULL',
    type,
    difficulty: 2,
    prompt:
      'users: (1, Asha, referrer NULL), (2, Ben, referrer 1), (3, Chen, referrer 1).\nThe goal is "users who never referred anyone". What comes back?',
    codeSnippet:
      'SELECT name FROM users\nWHERE id NOT IN (\n  SELECT referrer_id FROM users\n);',
    options: opts('Ben, Chen', 'Asha', 'No rows', 'Asha, Ben, Chen'),
    answerKey: 'c',
    explanation:
      'The subquery returns (NULL, 1, 1). For Ben, "2 NOT IN (NULL, 1)" means "2 <> NULL AND 2 <> 1", and 2 <> NULL is unknown, so the whole test is unknown, not true. The same happens for every row, so nothing comes back. NOT EXISTS, or filtering WHERE referrer_id IS NOT NULL in the subquery, gives Ben and Chen.',
    misconception:
      'One NULL inside a NOT IN list makes the whole condition unknown for every row. It is one of the most common silent SQL bugs.',
    hint: 'What is 2 <> NULL?',
  },
  {
    slug: 'db-where-vs-having',
    title: 'Big spenders',
    topicSlug,
    subtopic: 'aggregation',
    type,
    difficulty: 2,
    prompt:
      'Order amounts: user 1 → 30, 60, 80. User 2 → 70. User 3 → 90, 20, 100.\nWhat does the query return (user → n)?',
    codeSnippet:
      'SELECT user_id, COUNT(*) AS n\nFROM orders\nWHERE amount > 50\nGROUP BY user_id\nHAVING COUNT(*) >= 2;',
    options: opts('1 → 3 and 3 → 3', '1 → 2 and 3 → 2', 'Only 3 → 2', '1 → 2, 2 → 1 and 3 → 2'),
    answerKey: 'b',
    explanation:
      'WHERE runs first, on single rows, and drops every order of 50 or less. That leaves user 1 with 2 orders, user 2 with 1 and user 3 with 2. HAVING then runs on the groups and drops user 2.',
    misconception:
      'WHERE filters rows before grouping; HAVING filters groups after. The counts are of the rows that survived WHERE, not of all orders.',
  },
  {
    slug: 'db-read-committed-reread',
    title: 'Reading twice in one transaction',
    topicSlug,
    subtopic: 'isolation levels',
    type,
    difficulty: 2,
    prompt:
      "Postgres, default isolation level (READ COMMITTED). Between Session A's two reads, Session B runs and commits. What does A see?",
    codeSnippet:
      '-- Session A\nBEGIN;\nSELECT balance FROM accounts WHERE id = 1;  -- 100\n\n-- Session B (autocommit)\nUPDATE accounts SET balance = 70 WHERE id = 1;\n\n-- Session A again\nSELECT balance FROM accounts WHERE id = 1;\nCOMMIT;',
    options: opts(
      '100 both times, because A is inside a transaction',
      'Session B blocks until A commits',
      '100, then 70',
      'An error, because the row changed under A',
    ),
    answerKey: 'c',
    explanation:
      "In READ COMMITTED each statement sees the data committed before that statement started. B's update committed between A's two reads, so the second read sees 70. A plain SELECT takes no row lock, so B is not blocked.",
    misconception:
      'A transaction does not freeze the data you read. Getting the same answer twice needs REPEATABLE READ (or a lock), not just BEGIN.',
    hint: 'When does each statement take its snapshot at this level?',
  },
  {
    slug: 'db-join-fanout-sum',
    title: 'Revenue went up by itself',
    topicSlug,
    subtopic: 'joins',
    type,
    difficulty: 2,
    prompt:
      "Asha has order 101 (total 40) with tags 'gift' and 'sale', and order 102 (total 10) with tag 'sale'. What is her revenue in this report?",
    codeSnippet:
      'SELECT u.name, SUM(o.total) AS revenue\nFROM users u\nJOIN orders o ON o.user_id = u.id\nJOIN order_tags t ON t.order_id = o.id\nGROUP BY u.name;',
    options: opts('50', '100', '90', '130'),
    answerKey: 'c',
    explanation:
      'The second join turns order 101 into two rows (one per tag), so its total of 40 is summed twice: 40 + 40 + 10 = 90. Aggregate orders before joining the tags, or drop the tag join when you only need totals.',
    misconception:
      'Joining a one-to-many table multiplies rows. SUM and COUNT then count the duplicates, and nothing warns you.',
    hint: 'How many rows does order 101 become after the tag join?',
  },
  {
    slug: 'db-find-one-and-update-old',
    title: 'Coins that did not arrive',
    topicSlug,
    subtopic: 'mongoose',
    type,
    difficulty: 2,
    prompt:
      'The user has 100 coins. This Mongoose handler runs once. What is in the JSON response, and what is stored?',
    codeSnippet:
      "app.post('/reward', async (req, res) => {\n  const user = await User.findOneAndUpdate(\n    { _id: req.user.id },\n    { $inc: { coins: 50 } },\n  );\n  res.json({ coins: user.coins });\n});",
    options: opts(
      'Responds 150; stores 150',
      'Responds 50; stores 150',
      'Responds 100; stores 100',
      'Responds 100; stores 150',
    ),
    answerKey: 'd',
    explanation:
      'The update is applied, so the database holds 150. But findOneAndUpdate returns the document as it was before the update unless you pass { new: true } (or returnDocument: "after"), so the response shows 100.',
    misconception:
      'The returned document is not automatically the saved one. Check which version a "find and modify" call gives you back.',
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'db-zero-row-update-commit',
    title: 'The transfer that lost money',
    topicSlug,
    subtopic: 'transactions',
    type,
    difficulty: 3,
    prompt: 'Account 1 has 500. There is no account 99. What happens?',
    codeSnippet:
      'BEGIN;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 99;\nCOMMIT;',
    options: opts(
      'The transaction fails and account 1 keeps 500',
      'It commits: account 1 has 400 and the 100 goes nowhere',
      'The database creates account 99 with 100',
      'It deadlocks',
    ),
    answerKey: 'b',
    explanation:
      'An UPDATE that matches zero rows is not an error, so nothing triggers a rollback and COMMIT succeeds. Application code must check the affected-row count and roll back when it is not 1.',
    misconception:
      'Transactions roll back on errors, not on logic mistakes. "0 rows updated" is a success to the database.',
    hint: 'Is "0 rows affected" an error?',
  },
  {
    slug: 'db-aborted-transaction',
    title: 'Ignoring one failed insert',
    topicSlug,
    subtopic: 'transactions',
    type,
    difficulty: 3,
    prompt:
      "Postgres with node-postgres. tags.name is UNIQUE and the table starts empty. The code ignores the duplicate error on purpose. What ends up in tags?",
    codeSnippet:
      "await client.query('BEGIN');\nawait client.query(\"INSERT INTO tags (name) VALUES ('a')\");\ntry {\n  await client.query(\"INSERT INTO tags (name) VALUES ('a')\");\n} catch {}\nawait client.query(\"INSERT INTO tags (name) VALUES ('b')\");\nawait client.query('COMMIT');",
    options: opts(
      "'a' and 'b'",
      "Only 'a'",
      "Only 'b'",
      "Nothing; the 'b' insert throws too",
    ),
    answerKey: 'd',
    explanation:
      'In Postgres, any error inside a transaction marks the whole transaction as aborted. Every later statement fails with "current transaction is aborted, commands ignored until end of transaction block", so the \'b\' insert throws, COMMIT is never reached, and nothing is saved. Use a SAVEPOINT around the risky statement, or INSERT ... ON CONFLICT DO NOTHING.',
    misconception:
      'Catching the error in JavaScript does not repair the transaction on the server. The database already gave up on it.',
    hint: 'What state is the transaction in after a failed statement?',
  },
  {
    slug: 'db-lost-update-read-committed',
    title: 'Two buyers, one decrement',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 3,
    prompt:
      'Stock is 5. Two checkouts run this at the same moment, each in its own READ COMMITTED transaction. Both SELECTs finish before either UPDATE. What is the final stock?',
    codeSnippet:
      "await tx.query('BEGIN');\nconst { rows } = await tx.query('SELECT stock FROM items WHERE id = $1', [id]);\nconst next = rows[0].stock - 1;\nawait tx.query('UPDATE items SET stock = $1 WHERE id = $2', [next, id]);\nawait tx.query('COMMIT');",
    options: opts(
      '3',
      '4',
      'One transaction fails with a serialization error',
      'It deadlocks and the database aborts one transaction',
    ),
    answerKey: 'b',
    explanation:
      'Both read 5 and both compute 4. The second UPDATE waits for the first row lock, then overwrites the row with 4 as well. One sale is lost. Write SET stock = stock - 1 (computed in the database), or lock the row with SELECT ... FOR UPDATE.',
    misconception:
      'A transaction is not a lock on everything you read. At READ COMMITTED, a value you read can be stale by the time you write it back.',
    hint: 'Where is "stock - 1" computed?',
  },
  {
    slug: 'db-repeatable-read-conflict',
    title: 'Same rows, stricter level',
    topicSlug,
    subtopic: 'isolation levels',
    type,
    difficulty: 3,
    prompt:
      'Same two checkouts as a plain read-then-write, but now both transactions use REPEATABLE READ in Postgres. Both read stock 5, then A updates to 4 and commits. What happens to B\'s UPDATE?',
    codeSnippet:
      "-- A and B both:\nBEGIN ISOLATION LEVEL REPEATABLE READ;\nSELECT stock FROM items WHERE id = 7;        -- 5\nUPDATE items SET stock = $1 WHERE id = 7;  -- $1 = value read - 1 (4)\nCOMMIT;",
    options: opts(
      'It fails with "could not serialize access due to concurrent update"',
      'It succeeds and the stock ends at 4, as at READ COMMITTED',
      'It succeeds and Postgres rewrites it so the stock ends at 3',
      'It waits until A commits, then succeeds with 3',
    ),
    answerKey: 'a',
    explanation:
      'At REPEATABLE READ, B works from the snapshot taken at its first query. When it tries to update a row that someone else changed and committed after that snapshot, Postgres refuses with a serialization error. The application must retry the whole transaction, which then reads 4 and writes 3.',
    misconception:
      'Stricter isolation does not make conflicts disappear. It turns silent lost updates into errors you must catch and retry.',
  },
  {
    slug: 'db-write-skew',
    title: 'Nobody on call',
    topicSlug,
    subtopic: 'isolation levels',
    type,
    difficulty: 3,
    prompt:
      'Rule: at least one doctor must stay on call. Alice and Bob are both on call. Each clicks "go off call" at the same moment. Both transactions run at REPEATABLE READ in Postgres. How many doctors are on call afterwards?',
    codeSnippet:
      "BEGIN ISOLATION LEVEL REPEATABLE READ;\nSELECT COUNT(*) FROM doctors WHERE on_call;   -- 2\n-- 2 > 1, so it is safe to leave\nUPDATE doctors SET on_call = false WHERE name = $me;\nCOMMIT;",
    options: opts(
      '1, because the second transaction sees the first one\'s change',
      '1, because one transaction fails with a serialization error',
      '2, because the two updates block each other',
      '0',
    ),
    answerKey: 'd',
    explanation:
      'Each transaction reads the same snapshot (2 on call) and updates a different row, so there is no write conflict to detect. Both commit and the rule is broken. This anomaly is write skew. SERIALIZABLE detects it (one transaction fails and is retried), or you can lock the rows you checked with SELECT ... FOR UPDATE.',
    misconception:
      'REPEATABLE READ in Postgres is snapshot isolation, not full serializability. It stops two writers on the same row, not two writers whose decision depends on the same read.',
    hint: 'Do the two transactions ever write the same row?',
  },
  {
    slug: 'db-now-in-transaction',
    title: 'Two seconds apart?',
    topicSlug,
    subtopic: 'timestamps',
    type,
    difficulty: 3,
    prompt:
      'Postgres. The batch job inserts two events with a two-second pause between them, inside one transaction. Compare their created_at values.',
    codeSnippet:
      "BEGIN;\nINSERT INTO events (name, created_at) VALUES ('first', now());\nSELECT pg_sleep(2);\nINSERT INTO events (name, created_at) VALUES ('second', now());\nCOMMIT;",
    options: opts(
      'They are identical',
      "'second' is about 2 seconds after 'first'",
      "'second' is earlier, because rows commit in reverse",
      'They differ by a few microseconds',
    ),
    answerKey: 'a',
    explanation:
      'now() in Postgres is the start time of the current transaction, so it returns the same value for every statement inside it. Both rows get the same timestamp. clock_timestamp() gives the real wall-clock time. This matters when you sort or paginate by created_at: a long batch writes many rows with one timestamp.',
    misconception:
      'now() is not "the time this line ran". In a transaction it is frozen, which is useful for consistency and surprising for ordering.',
  },
];
