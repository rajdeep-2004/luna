import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'http-apis' as const;
const type = 'INCIDENT' as const;

/** HTTP & APIs: Incident Room, difficulty 1, 2, 2, 3 (P10). Stages: alert → investigate → resolve. */
export const HTTP_APIS_INCIDENTS: ChallengeSeed[] = [
  {
    slug: 'incident-http-false-success',
    title: '"Order placed!" for orders that failed',
    topicSlug,
    subtopic: 'status codes',
    type,
    difficulty: 1,
    prompt: 'Customers get an "Order placed!" screen, but no order and no confirmation email.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The orders service logged 140 "out of stock" failures today. The app\'s analytics show 0 failed checkouts. Error dashboards for the API show no 4xx or 5xx at all.',
        prompt: 'What is the most likely gap?',
        options: opts(
          'The analytics SDK is broken',
          'Customers are refreshing too fast',
          'The API reports failures with a success status',
          'The database lost the orders',
        ),
        answerKey: 'c',
        explanation:
          'The server knows the orders failed, but neither the app nor the dashboards see any error status. That points at failures being sent with 200, so everything downstream counts them as successes.',
        misconception:
          'Monitoring counts status codes, not error messages in bodies. If the status lies, the dashboards lie too.',
      },
      {
        title: 'Investigate',
        evidence:
          'The handler ends with:\n} catch (err) {\n  res.json({ error: err.message });\n}\nThe app does: if (response.ok) showSuccess();',
        prompt: 'Why does the app show success?',
        options: opts(
          'response.ok is true for any response with a body',
          'res.json without a status sends 200, so response.ok is true',
          'The catch block never runs',
          'The app caches the last successful response',
        ),
        answerKey: 'b',
        explanation:
          'res.json() defaults to 200. response.ok is true for any 2xx, so the app takes the success path even though the body says error.',
        misconception: 'response.ok looks at the status code only; it never reads the body.',
      },
      {
        title: 'Resolve',
        evidence: 'Out of stock is a normal business case; real crashes also happen sometimes.',
        prompt: 'What do you ship?',
        options: opts(
          'Return 409 for out of stock and 500 for unexpected errors, with a clear error body',
          'Make the app search every body for an "error" key',
          'Return 200 and add "success": false',
          'Hide the success screen until the email arrives',
        ),
        answerKey: 'a',
        explanation:
          'A status that matches the outcome lets the app branch correctly, retries behave, and dashboards count failures again. 409 says "conflicts with current state" (no stock), and 500 is reserved for real server faults.',
        misconception:
          "Clients should not parse bodies to learn whether a request worked. That is the status code's job.",
      },
    ],
    rootCause:
      'The order handler caught errors and replied with res.json({ error }), which defaults to 200. The app checked response.ok and showed success, and monitoring saw no errors, so failed orders went unnoticed.',
  },
  {
    slug: 'incident-http-cdn-private-data',
    title: "Someone else's name on my profile",
    topicSlug,
    subtopic: 'caching',
    type,
    difficulty: 2,
    prompt: "A few users report seeing another person's name and email on their profile screen.",
    stages: [
      {
        title: 'Alert',
        evidence:
          'Reports started an hour after a release that "sped up the API with caching". Affected users always see the same stranger for a few minutes, then their own data. Only GET /api/v1/me is affected.',
        prompt: 'What do you suspect?',
        options: opts(
          "A shared cache is serving one user's response to others",
          'The database returned the wrong row',
          "Users logged in to each other's accounts",
          'The JWT secret leaked',
        ),
        answerKey: 'a',
        explanation:
          'Same wrong user for a few minutes, then correct data, right after a caching change: that is a cached response with a TTL being served to everyone who asks for the same URL.',
        misconception:
          'Data leaks are not always auth bugs. A cache in the wrong place can leak data without anyone logging in as someone else.',
      },
      {
        title: 'Investigate',
        evidence:
          'GET /api/v1/me responses now carry Cache-Control: public, max-age=300, and the CDN adds X-Cache: HIT. The handler reads the user from the Authorization header, which the CDN does not include in its cache key.',
        prompt: 'What is the flaw?',
        options: opts(
          'max-age is too long',
          'The CDN is misconfigured and should be replaced',
          'A per-user response was marked as cacheable by shared caches',
          'The Authorization header is missing',
        ),
        answerKey: 'c',
        explanation:
          '"public" tells every cache, including the CDN, that this response may be stored and reused for anyone requesting the same URL. The URL /me is the same for every user, so the first user\'s profile is served to all.',
        misconception:
          'Shortening the TTL only shrinks the leak window. Per-user data must never enter a shared cache.',
        hint: 'Who is allowed to reuse a "public" response?',
      },
      {
        title: 'Resolve',
        evidence: 'Leaked responses may still be in the CDN for up to 5 minutes.',
        prompt: 'What do you do?',
        options: opts(
          'Lower max-age to 10 seconds',
          'Set Cache-Control: private, no-store on authenticated responses and purge the CDN',
          'Add Vary: Cookie',
          'Ask affected users to log out and in again',
        ),
        answerKey: 'b',
        explanation:
          'private, no-store keeps per-user responses out of shared caches; purging removes the copies already stored. Then review which endpoints really are public before caching them.',
        misconception:
          'Vary on a header the request does not use (the token is in Authorization, not a cookie) fixes nothing.',
      },
    ],
    rootCause:
      "A release added Cache-Control: public, max-age=300 to every GET, including /api/v1/me. The CDN cached the first user's profile under the shared URL and served it to everyone for five minutes.",
  },
  {
    slug: 'incident-http-retry-storm',
    title: 'A two-minute blip, a forty-minute outage',
    topicSlug,
    subtopic: 'retries',
    type,
    difficulty: 3,
    prompt: 'The database failed over in 2 minutes, but the API stayed down for 40.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'After the database recovered, the API received 6–9× its normal request rate even though active users were flat. Error rate stayed above 80% and fell only when traffic was blocked at the edge.',
        prompt: 'What explains the extra traffic?',
        options: opts(
          'A one-off thundering herd of clients reconnecting, which should fade on its own',
          'Load-balancer health checks hammering the instances that had failed',
          'Retries: failed requests were being sent again, and again',
          'The database came back with a cold cache, so every query is slower',
        ),
        answerKey: 'c',
        explanation:
          "More requests with the same number of users means each user's requests are being repeated. During an outage every failure triggers retries, and the retries themselves keep the system overloaded.",
        misconception:
          'An outage can sustain itself. Once load from retries exceeds capacity, the system cannot recover even though the original cause is gone.',
      },
      {
        title: 'Investigate',
        evidence:
          'The mobile app retries 3 times, the API gateway retries 3 times, and the API retries each DB query 3 times, each with a fixed 100 ms delay.',
        prompt: 'Why can the system not recover by itself?',
        options: opts(
          'Retries at three layers multiply (up to 64 attempts per tap), all in sync',
          'The API connection pools were exhausted in the outage and never refilled',
          'The database failed over to a smaller replica that cannot take normal load',
          "The gateway's circuit breaker is stuck open",
        ),
        answerKey: 'a',
        explanation:
          'Each layer retries the layer below, so one user action can become (1+3)³ = 64 database attempts. Fixed delays line those retries up into synchronised waves, so the database never sees a quiet moment to recover.',
        misconception:
          "Each layer's retries look harmless on their own. The danger is multiplication across layers.",
        hint: 'What happens when every layer retries the one below it?',
      },
      {
        title: 'Resolve',
        evidence:
          'Product still wants transient failures to be invisible to users when the system is healthy.',
        prompt: 'What do you ship?',
        options: opts(
          'Remove all retries everywhere',
          'Keep retries at all three layers, but switch each to exponential backoff',
          'Retry only in the mobile app: 3 times, with a fixed 100 ms delay',
          'Retry at one layer, with exponential backoff, jitter and a budget; honour Retry-After and shed load with 503',
        ),
        answerKey: 'd',
        explanation:
          'One retrying layer stops the multiplication. Backoff with jitter spreads retries out, a retry budget caps them when failures are widespread, and fast 503s with Retry-After tell clients to back off while the system recovers.',
        misconception:
          'Removing retries makes every blip visible to users. The goal is retries that get gentler as failure spreads.',
      },
    ],
    rootCause:
      'Three layers each retried three times with a fixed 100 ms delay, so every failed tap became up to 64 database attempts arriving in synchronised waves. After the 2-minute failover, retry traffic alone kept the database overloaded for 40 minutes.',
  },
  {
    slug: 'incident-double-charge',
    title: 'The checkout that charged twice',
    topicSlug: 'http-apis',
    subtopic: 'idempotency',
    type: 'INCIDENT',
    difficulty: 2,
    prompt: 'Support tickets are piling up: customers say they were charged twice.',
    stages: [
      {
        title: 'Alert',
        evidence:
          '0.8% of orders this week have two identical charges about 10 s apart. Almost all come from the mobile app on slow networks.',
        prompt: 'What do you suspect first?',
        options: opts(
          'Client retries after a timeout',
          'A database index is missing',
          'The payment provider is hacked',
          'Users double-tapping on purpose',
        ),
        answerKey: 'a',
        explanation:
          'The pattern (slow networks, duplicates about 10 s apart, a typical client timeout) points at automatic retries of a request that had already succeeded.',
        misconception:
          'Duplicates with a regular time gap are usually machines retrying, not people.',
      },
      {
        title: 'Investigate',
        evidence:
          'Logs show two POST /payments with the same cart. The first finished on the server in 11 s, but the app gave up at 10 s and retried.',
        prompt: 'What is the real flaw?',
        options: opts(
          'POST /payments is not idempotent: a retry creates a new charge',
          'The timeout is too short',
          'The cart id is wrong',
          'The provider is slow and should be replaced',
        ),
        answerKey: 'a',
        explanation:
          'Timeouts will always happen. The flaw is that the server cannot tell a retry from a new payment, so every retry charges again.',
        misconception: 'Tuning the timeout makes duplicates rarer but does not stop them.',
        hint: 'Could the server tell these two requests apart?',
      },
      {
        title: 'Resolve',
        evidence:
          'Product wants this fixed without removing retries, because retries save many payments on bad networks.',
        prompt: 'What do you ship?',
        options: opts(
          'An idempotency key per checkout; the server returns the original result for a repeated key',
          'Remove retries from the app',
          'Increase the timeout to 60 s',
          'Refund duplicates every night',
        ),
        answerKey: 'a',
        explanation:
          'The app generates one key per checkout attempt and sends it with every retry. The server stores it with a unique constraint, so repeats return the first result instead of charging again.',
        misconception: 'Refunds treat the symptom; customers still see the double charge.',
      },
    ],
    rootCause:
      "The payment endpoint wasn't idempotent. Slow networks caused client timeouts, the app retried requests that had already succeeded, and each retry created a new charge.",
  },
];
