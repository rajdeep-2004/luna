import { opts, type ChallengeSeed } from '../schema';

const topicSlug = 'databases' as const;

const TABLES =
  'users: (1, Asha), (2, Ben), (3, Chen)\norders: (101, user 1), (102, user 1), (103, user 2)';

export const DATABASES: ChallengeSeed[] = [
  {
    slug: 'db-inner-join-rows',
    title: 'Counting join rows',
    topicSlug,
    subtopic: 'joins',
    type: 'TRACE',
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
    slug: 'db-left-join-count',
    title: 'The user with no orders',
    topicSlug,
    subtopic: 'joins',
    type: 'TRACE',
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
    slug: 'db-zero-row-update-commit',
    title: 'The transfer that lost money',
    topicSlug,
    subtopic: 'transactions',
    type: 'TRACE',
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
    slug: 'db-sql-injection',
    title: 'A search box with a secret',
    topicSlug,
    subtopic: 'security',
    type: 'BUG_HUNT',
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
    slug: 'db-n-plus-one',
    title: 'Twenty-one queries for one page',
    topicSlug,
    subtopic: 'query performance',
    type: 'BUG_HUNT',
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
    slug: 'db-update-without-where',
    title: 'Everyone got upgraded',
    topicSlug,
    subtopic: 'SQL',
    type: 'BUG_HUNT',
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
    slug: 'db-add-index',
    title: 'A slow login lookup',
    topicSlug,
    subtopic: 'indexes',
    type: 'ENGINEER_CHOICE',
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
    slug: 'db-use-transaction',
    title: 'Both or neither',
    topicSlug,
    subtopic: 'transactions',
    type: 'ENGINEER_CHOICE',
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
    slug: 'db-compound-index-order',
    title: 'Which index for the feed?',
    topicSlug,
    subtopic: 'indexes',
    type: 'ENGINEER_CHOICE',
    difficulty: 3,
    prompt:
      'The hot query is: WHERE user_id = ? ORDER BY created_at DESC LIMIT 20. Which index serves it best?',
    options: opts(
      'A compound index on (user_id, created_at)',
      'A compound index on (created_at, user_id)',
      'Two separate indexes, one on each column',
      'An index on created_at only',
    ),
    answerKey: 'a',
    explanation:
      "Put the equality column first and the sort column second. The database jumps to that user's entries, which are already ordered by date, and reads 20 of them. No sorting is needed.",
    misconception:
      'Column order in a compound index matters: it works like a phone book sorted by last name, then first name.',
    optionFeedback: {
      b: "Dates come first, so one user's rows are scattered across the index.",
      c: 'The database usually uses only one, then filters or sorts the rest.',
      d: "It reads everyone's recent rows and filters out other users.",
    },
    hint: 'Equality filter first, then the sort.',
  },
  {
    slug: 'db-embed-vs-reference',
    title: 'Orders and their items',
    topicSlug,
    subtopic: 'data modeling',
    type: 'ENGINEER_CHOICE',
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
];
