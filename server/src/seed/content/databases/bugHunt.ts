import type { ChallengeSeed } from '../../schema';

const topicSlug = 'databases' as const;
const type = 'BUG_HUNT' as const;

/** Databases: Bug Hunt, 6 per level (P11). answerKey is the 1-based buggy line. */
export const DATABASES_BUG_HUNT: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'db-sql-injection',
    title: 'A search box with a secret',
    topicSlug,
    subtopic: 'security',
    type,
    difficulty: 1,
    prompt: "Searching for  ' OR '1'='1  returns every product. Which line is the bug?",
    codeSnippet:
      "app.get('/search', async (req, res) => {\n  const term = req.query.q;\n  const sql = `SELECT * FROM products WHERE name = '${term}'`;\n  const rows = await db.query(sql);\n  res.json(rows);\n});",
    answerKey: '3',
    explanation:
      'User input is pasted straight into the SQL text, so the input can change the query itself. That is SQL injection. Use a parameterised query: db.query("... WHERE name = $1", [term]).',
    misconception:
      'Escaping quotes by hand is fragile. Parameters keep data and code separate by design.',
  },
  {
    slug: 'db-update-without-where',
    title: 'Everyone got upgraded',
    topicSlug,
    subtopic: 'SQL',
    type,
    difficulty: 1,
    prompt: 'One user upgraded to Pro, and now every user is on Pro. Which line is the bug?',
    codeSnippet:
      "async function upgrade(userId) {\n  await db.query('BEGIN');\n  await db.query(\"UPDATE users SET plan = 'pro'\");\n  await db.query('INSERT INTO upgrades (user_id) VALUES ($1)', [userId]);\n  await db.query('COMMIT');\n}",
    answerKey: '3',
    explanation:
      'An UPDATE without WHERE changes every row in the table. It needs WHERE id = $1 with userId as the parameter.',
    misconception:
      'Wrapping it in a transaction does not help: the bad update commits successfully.',
  },
  {
    slug: 'db-float-money',
    title: 'A cent goes missing',
    topicSlug,
    subtopic: 'data types',
    type,
    difficulty: 1,
    prompt:
      'Finance reports that daily totals are sometimes off by a cent, for example 0.1 + 0.2 shows as 0.30000000000000004. Which line is the root cause?',
    codeSnippet:
      'CREATE TABLE payments (\n  id BIGSERIAL PRIMARY KEY,\n  user_id BIGINT NOT NULL,\n  amount DOUBLE PRECISION NOT NULL,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n);',
    answerKey: '4',
    explanation:
      'Floating-point types store binary fractions, and most decimal amounts like 0.10 cannot be represented exactly. The tiny errors add up in totals. Store money as an integer number of minor units (amount_cents BIGINT), or as NUMERIC with fixed scale.',
    misconception:
      '"Double precision" sounds precise, but it is precise about binary fractions, not decimal cents.',
  },
  {
    slug: 'db-delete-wrong-column',
    title: 'Logged out everywhere',
    topicSlug,
    subtopic: 'SQL',
    type,
    difficulty: 1,
    prompt:
      'Tapping "log out" on one phone also logs the user out on their laptop and tablet. Which line is the bug?',
    codeSnippet:
      "app.post('/logout', async (req, res) => {\n  const { sessionId, userId } = req.auth;\n  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);\n  res.status(204).end();\n});",
    answerKey: '3',
    explanation:
      'The DELETE matches every session that belongs to the user, not only the current one. Logging out of one device should delete one row: WHERE id = $1 with sessionId. Deleting by user_id is the right query only for a deliberate "log out everywhere" button.',
    misconception:
      'A WHERE clause can be present and still too broad. Ask which rows it matches, not only whether it exists.',
  },
  {
    slug: 'db-mongo-find-array',
    title: 'The 404 that never happens',
    topicSlug,
    subtopic: 'mongoose',
    type,
    difficulty: 1,
    prompt:
      'Looking up an email that does not exist returns 200 with an empty name instead of 404. Which line is the bug?',
    codeSnippet:
      "app.get('/users/by-email', async (req, res) => {\n  const user = await User.find({ email: req.query.email });\n  if (!user) return res.status(404).json({ error: 'Not found' });\n  res.json({ name: user.name });\n});",
    answerKey: '2',
    explanation:
      'find() always returns an array, and an empty array is truthy in JavaScript, so the 404 check never fires and user.name is undefined. Use findOne(), which returns the document or null.',
    misconception:
      'Line 3 looks wrong, but it is correct for a single document. The bug is the query that returns a list.',
  },
  {
    slug: 'db-missing-unique',
    title: 'Two accounts, one email',
    topicSlug,
    subtopic: 'constraints',
    type,
    difficulty: 1,
    prompt:
      'Signup checks for an existing email in code, yet the table now has several accounts with the same email. Which line should have prevented it?',
    codeSnippet:
      'CREATE TABLE users (\n  id BIGSERIAL PRIMARY KEY,\n  email TEXT NOT NULL,\n  password_hash TEXT NOT NULL,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n);',
    answerKey: '3',
    explanation:
      'Only the database sees every insert, so only the database can guarantee uniqueness. Two signups that check at the same moment both find nothing and both insert. email TEXT NOT NULL UNIQUE makes the second insert fail, and the app turns that error into "email already used".',
    misconception:
      'A check in application code is a courtesy for nicer messages. The constraint is the guarantee.',
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'db-n-plus-one',
    title: 'Twenty-one queries for one page',
    topicSlug,
    subtopic: 'query performance',
    type,
    difficulty: 2,
    prompt:
      'This page makes 21 database queries and gets slower as you raise the limit. Which line causes it?',
    codeSnippet:
      'const posts = await Post.find().limit(20);\nfor (const post of posts) {\n  post.author = await User.findById(post.authorId);\n}\nres.json(posts);',
    answerKey: '3',
    explanation:
      'One query loads the posts, then the loop runs one more query per post: the N+1 problem. Collect the author ids and load them in one query with $in, or use a join or populate.',
    misconception:
      'Each small query looks cheap, but round trips add up linearly with the list size.',
    hint: 'How many times does the loop body run?',
  },
  {
    slug: 'db-pool-query-outside-tx',
    title: 'Half a transfer',
    topicSlug,
    subtopic: 'transactions',
    type,
    difficulty: 2,
    prompt:
      "After the server crashed in the middle of a transfer, the sender's balance had dropped but the receiver got nothing. Which line runs outside the transaction?",
    codeSnippet:
      "async function transfer(from, to, cents) {\n  const client = await pool.connect();\n  try {\n    await client.query('BEGIN');\n    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [cents, to]);\n    await pool.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [cents, from]);\n    await client.query('COMMIT');\n  } catch (err) {\n    await client.query('ROLLBACK');\n    throw err;\n  } finally {\n    client.release();\n  }\n}",
    answerKey: '6',
    explanation:
      'A transaction lives on one connection. pool.query borrows whichever connection is free, so line 6 runs and commits on its own, outside the BEGIN on client. Every statement of the transaction must use the same client.',
    misconception:
      'BEGIN does not start a transaction for "the database". It starts one for that single connection.',
    hint: 'Which object does each line send its query through?',
  },
  {
    slug: 'db-offset-no-order',
    title: 'Products on two pages',
    topicSlug,
    subtopic: 'pagination',
    type,
    difficulty: 2,
    prompt:
      'Users scrolling the catalogue see some products twice and never see others, even when nothing is being added. Which line is the bug?',
    codeSnippet:
      "app.get('/products', async (req, res) => {\n  const page = parsePage(req.query.page);\n  const { rows } = await db.query(\n    'SELECT id, name, price_cents FROM products LIMIT 20 OFFSET $1',\n    [page * 20],\n  );\n  res.json({ items: rows });\n});",
    answerKey: '4',
    explanation:
      'Without ORDER BY, SQL promises no order at all. The database may return rows in a different order for each query (after updates, vacuum or a different plan), so OFFSET skips a different set every time. Add a total order, for example ORDER BY id.',
    misconception:
      '"It came back in id order when I tested it" is luck, not a guarantee. Pagination needs an explicit, unique sort.',
  },
  {
    slug: 'db-pg-sum-string',
    title: 'A total of "15000250"',
    topicSlug,
    subtopic: 'data types',
    type,
    difficulty: 2,
    prompt:
      'The user has paid 15000 cents and the fee is 250. The API returns withFee: "15000250". Which line is the root cause?',
    codeSnippet:
      "const { rows } = await pool.query(\n  'SELECT SUM(amount_cents) AS total FROM payments WHERE user_id = $1',\n  [userId],\n);\nconst total = rows[0].total;\nconst withFee = total + FEE_CENTS;\nres.json({ withFee });",
    answerKey: '5',
    explanation:
      'SUM of a BIGINT column returns NUMERIC, and node-postgres returns NUMERIC and BIGINT values as strings so no precision is lost. total is "15000", and + joins strings. Convert at the boundary: Number(rows[0].total ?? 0), which also covers SUM returning NULL when the user has no payments.',
    misconception:
      'Line 6 shows the symptom, but the bug is trusting the type of a value that came out of the driver.',
    hint: 'What JavaScript type does the driver use for a NUMERIC result?',
  },
  {
    slug: 'db-objectid-equality',
    title: 'Owners cannot edit their posts',
    topicSlug,
    subtopic: 'mongoose',
    type,
    difficulty: 2,
    prompt:
      'Every author gets 403 when editing their own post. req.user.id is a string from the JWT. Which line is the bug?',
    codeSnippet:
      "app.patch('/posts/:id', async (req, res) => {\n  const post = await Post.findById(req.params.id);\n  if (!post) return res.status(404).end();\n  if (post.authorId !== req.user.id) return res.status(403).end();\n  post.body = req.body.body;\n  await post.save();\n  res.json(post);\n});",
    answerKey: '4',
    explanation:
      'post.authorId is an ObjectId object, req.user.id is a string, and !== compares by identity and type, so they are never equal. Compare post.authorId.equals(req.user.id), or compare two strings with String(post.authorId).',
    misconception:
      'An ObjectId prints like a string but is an object. Strict equality between an object and a string is always false.',
  },
  {
    slug: 'db-group-by-name',
    title: 'Two Ashas, one total',
    topicSlug,
    subtopic: 'aggregation',
    type,
    difficulty: 2,
    prompt:
      'The "top customers" report shows one Asha with the spending of two different customers called Asha. Which line is the bug?',
    codeSnippet:
      'SELECT u.name, SUM(o.total_cents) AS spent\nFROM users u\nJOIN orders o ON o.user_id = u.id\nGROUP BY u.name\nORDER BY spent DESC\nLIMIT 10;',
    answerKey: '4',
    explanation:
      'Grouping by name merges everyone who shares a name. Group by the key that identifies a customer, GROUP BY u.id, u.name, so each person gets their own row.',
    misconception:
      'Names are labels, not identities. Grouping, joining and deduplicating should use keys.',
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'db-missing-for-update',
    title: 'Two purchases, one wallet',
    topicSlug,
    subtopic: 'concurrency',
    type,
    difficulty: 3,
    prompt:
      'Two purchases at the same moment both succeed although the wallet only covered one. Adding one clause to one line fixes it without changing the rest. Which line?',
    codeSnippet:
      "await tx.query('BEGIN');\nconst { rows } = await tx.query('SELECT balance FROM wallets WHERE user_id = $1', [id]);\nif (rows[0].balance < price) throw new InsufficientFunds();\nawait tx.query('UPDATE wallets SET balance = $1 WHERE user_id = $2', [rows[0].balance - price, id]);\nawait tx.query('INSERT INTO purchases (user_id, price) VALUES ($1, $2)', [id, price]);\nawait tx.query('COMMIT');",
    answerKey: '2',
    explanation:
      'Both transactions read the same balance before either writes, so both pass the check. SELECT ... FOR UPDATE on line 2 locks the wallet row: the second purchase waits, then reads the reduced balance and fails the check. A single conditional UPDATE (balance = balance - $1 WHERE balance >= $1) is the other good fix, but it needs line 4 rewritten.',
    misconception:
      'BEGIN alone does not stop two transactions from reading the same value. The read itself has to take the lock.',
    hint: 'What stops a second transaction from reading the balance before the first one writes?',
  },
  {
    slug: 'db-create-index-blocking',
    title: 'Checkout froze during the deploy',
    topicSlug,
    subtopic: 'migrations',
    type,
    difficulty: 3,
    prompt:
      'orders has 80 million rows. While this migration ran, every checkout hung for four minutes. Which line caused it?',
    codeSnippet:
      "export async function up(db) {\n  await db.query('ALTER TABLE orders ADD COLUMN coupon_code TEXT');\n  await db.query('CREATE INDEX orders_coupon_idx ON orders (coupon_code)');\n}",
    answerKey: '3',
    explanation:
      'A plain CREATE INDEX blocks every INSERT, UPDATE and DELETE on the table until the whole index is built, which takes minutes on 80M rows. CREATE INDEX CONCURRENTLY builds it without blocking writes (it is slower and cannot run inside a transaction block). Adding a nullable column with no default, line 2, only changes the catalog and is instant.',
    misconception:
      'Migrations that are instant on a dev database can lock a production table for minutes. Know which DDL blocks writes.',
  },
  {
    slug: 'db-keyset-ties',
    title: 'Missing posts at the page edge',
    topicSlug,
    subtopic: 'pagination',
    type,
    difficulty: 3,
    prompt:
      'The feed uses keyset pagination. A bulk import gave many posts the same created_at, and some of them never appear while scrolling. Which line is the bug?',
    codeSnippet:
      'const { rows } = await db.query(\n  `SELECT id, title, created_at FROM posts\n   WHERE created_at < $1\n   ORDER BY created_at DESC, id DESC\n   LIMIT 20`,\n  [cursor.createdAt],\n);',
    answerKey: '3',
    explanation:
      'If page 1 ends in the middle of a group of posts sharing one created_at, "created_at < cursor" skips the rest of that group. The cursor must include the tie-breaker: WHERE (created_at, id) < ($1, $2), with cursor.id as the second parameter, matching the ORDER BY. Passing that parameter is a companion edit; the bug is the WHERE clause that ignores the tie-breaker.',
    misconception:
      'A keyset cursor must be unique. Sorting by a tie-breaker is not enough if the WHERE clause ignores it.',
    hint: "What happens to rows that have exactly the cursor's created_at?",
  },
  {
    slug: 'db-replica-read-after-write',
    title: 'The old email came back',
    topicSlug,
    subtopic: 'replication',
    type,
    difficulty: 3,
    prompt:
      'After saving a new email, the settings screen often shows the old one until the user refreshes. Replication lag is usually 100–500 ms. Which line is the bug?',
    codeSnippet:
      "async function changeEmail(userId, email) {\n  await primary.query('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);\n  const { rows } = await replica.query('SELECT * FROM users WHERE id = $1', [userId]);\n  return rows[0];\n}",
    answerKey: '3',
    explanation:
      'Replicas apply changes after the primary, so a read a few milliseconds after a write can see the old row. A read that must reflect your own write goes to the primary, or the UPDATE returns the new row with RETURNING *. Replicas are fine for reads that tolerate a little staleness.',
    misconception:
      'A successful write on the primary does not mean every replica has it yet. "Read your own writes" has to be designed in.',
  },
  {
    slug: 'db-skip-locked-missing',
    title: 'Ten workers, one at a time',
    topicSlug,
    subtopic: 'locking',
    type,
    difficulty: 3,
    prompt:
      'A Postgres table is used as a job queue. Going from 1 worker to 10 did not increase throughput at all. Which line is the bug?',
    codeSnippet:
      "BEGIN;\nSELECT id, payload FROM jobs\n  WHERE status = 'queued'\n  ORDER BY id\n  LIMIT 1\n  FOR UPDATE;\n-- process the job, then:\nUPDATE jobs SET status = 'done' WHERE id = $1;\nCOMMIT;",
    answerKey: '6',
    explanation:
      'Every worker selects the same oldest row and FOR UPDATE makes all but one wait for its lock. When it is released, Postgres re-checks the row for each waiting worker, sees it is no longer queued, and with LIMIT 1 usually returns no row at all, so jobs are still processed about one at a time. FOR UPDATE SKIP LOCKED makes each worker skip rows that are already locked and take the next free job.',
    misconception:
      'Adding workers only helps if they can claim different work. Lock contention on the same row serialises them.',
    hint: 'Which row does every worker try to lock?',
  },
  {
    slug: 'db-upsert-without-unique',
    title: 'Two step counts for one day',
    topicSlug,
    subtopic: 'constraints',
    type,
    difficulty: 3,
    prompt:
      'The app syncs steps from two devices at once. Some users now have two documents for the same day, and their totals are split. Which line is the bug?',
    codeSnippet:
      "const daySchema = new Schema({ userId: ObjectId, day: String, steps: Number });\ndaySchema.index({ userId: 1, day: 1 });\nexport const Day = model('Day', daySchema);\n\nawait Day.updateOne(\n  { userId, day },\n  { $inc: { steps: delta } },\n  { upsert: true },\n);",
    answerKey: '2',
    explanation:
      'Two concurrent upserts can both find no document and both insert one. Only a unique index makes the second insert fail; MongoDB then retries that upsert as an update. Make line 2 daySchema.index({ userId: 1, day: 1 }, { unique: true }).',
    misconception:
      'An upsert is atomic per document, not across "find nothing, then insert". Without a unique index it can create duplicates under concurrency.',
  },
];
