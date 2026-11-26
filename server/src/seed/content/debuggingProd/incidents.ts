import { opts, type ChallengeSeed } from '../../schema';

const topicSlug = 'debugging-prod' as const;
const type = 'INCIDENT' as const;

/** Debugging & production: Incident Room, difficulty 1, 2, 2, 3 (P12). Stages: alert → investigate → resolve. */
export const DEBUGGING_PROD_INCIDENTS: ChallengeSeed[] = [
  // ── Level 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'incident-502-after-deploy',
    title: '502s after deploy',
    topicSlug,
    subtopic: 'configuration',
    type,
    difficulty: 1,
    prompt: 'Two minutes after a deploy, every request returns 502 Bad Gateway.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The load balancer returns 502 for all routes. The new instances show "restarting" in the dashboard. The previous release was fine.',
        prompt: 'What do you check first?',
        options: opts(
          "The users' internet connections and DNS",
          "The new instances' startup logs",
          'The database schema and its recent migrations',
          'The size of the frontend bundle in the new release',
        ),
        answerKey: 'b',
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
          'The new JWT library version is broken',
          'The database is down, so the app cannot start',
          'Traffic is too high for the new instances',
          'A new required env var is missing in production, so the app exits on boot',
        ),
        answerKey: 'd',
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
          'Remove the new config validation so that every instance can start again without the secret',
          'Hardcode the secret in the code and redeploy',
          'Roll back, set the env var on the platform, redeploy, and add it to .env.example',
          'Keep restarting the instances until one of them stays up',
        ),
        answerKey: 'c',
        explanation:
          "Restore service first, then fix the config properly, then make the requirement visible (.env.example, a deploy checklist) so it can't be forgotten again.",
        misconception: 'Hardcoding a secret fixes the outage and creates a security incident.',
      },
    ],
    rootCause:
      'The release made JWT_SECRET a required variable, but it was never set in production, so every new instance failed config validation on boot and the gateway returned 502.',
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'incident-cors-cookies',
    title: 'Login works locally, fails in prod',
    topicSlug,
    subtopic: 'environments',
    type,
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
          'The database moved with the API',
          'The password hashing settings changed',
          'The app and API are now on different origins',
          "Every user's session expired during the move to the new domains",
        ),
        answerKey: 'c',
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
          "Requests don't send credentials, and a wildcard origin is not allowed with credentials",
          'The cookie is too large for the browser to store',
          'The JWT secret changed during the move, so tokens are invalid',
          'The API is too slow and the cookie expires before the next request',
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
          'Keep Access-Control-Allow-Origin: * and add Allow-Credentials: true',
          'Store the session token in localStorage and send it in a header',
          'Ask users to turn off third-party cookie blocking',
          "Allow the exact origin with credentials, send credentials: 'include', and set the cookie Secure",
        ),
        answerKey: 'd',
        explanation:
          'Name the trusted origin explicitly, enable credentials on both sides and use secure cookie flags. app. and api.example.com are the same site, so SameSite=Lax still lets the cookie through. That keeps CSRF and leak protections while making login work.',
        misconception: 'Moving tokens to localStorage dodges CORS but exposes them to any XSS.',
      },
    ],
    rootCause:
      "After splitting the app and API across origins, requests no longer carried the session cookie: the client didn't send credentials and the API used a wildcard CORS origin, which browsers reject with credentials.",
  },
  {
    slug: 'incident-memory-leak-oom',
    title: 'Restarts every three hours',
    topicSlug,
    subtopic: 'memory leaks',
    type,
    difficulty: 2,
    prompt:
      'Since Tuesday, every API pod restarts about every three hours, and a few requests fail each time.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'Pod status: "Last state: Terminated, reason OOMKilled, exit code 137". Memory per pod climbs in a straight line from 200 MB to the 1 GB limit, then drops at the restart. Traffic is flat. There is no stack trace in the logs.',
        prompt: 'What kind of problem is this?',
        options: opts(
          'A traffic spike that needs more pods',
          'A crash on bad input, which needs the stack trace',
          'Planned platform maintenance restarting pods',
          'A memory leak: memory grows with time until the pod is killed',
        ),
        answerKey: 'd',
        explanation:
          'Exit code 137 means the process got SIGKILL, and OOMKilled says why: it passed its memory limit. Memory climbing steadily under flat traffic, resetting on restart, is the shape of a leak. A crash from bad input would exit with an error and a stack trace.',
        misconception:
          'Not every restart is a crash in your code. Read the exit reason before you read the logs.',
      },
      {
        title: 'Investigate',
        evidence:
          'Two heap snapshots an hour apart: +270 MB, mostly closures named onPrice, held in the listener array of the prices EventEmitter (41,000 listeners). Logs show "MaxListenersExceededWarning" since Tuesday\'s release, which added the /prices/stream live feed.',
        prompt: 'What is leaking?',
        options: opts(
          'V8 garbage collection is falling behind and cannot keep up with the load',
          'Each live-feed connection adds a price listener that is never removed',
          'The price feed sends too much data per update',
          'The default limit of 10 listeners is too low for production',
        ),
        answerKey: 'b',
        explanation:
          'Every connection to the feed registers an onPrice listener, and closed connections leave theirs behind. Each listener keeps its response object alive, so the garbage collector cannot free them. 41,000 listeners against a few hundred open connections confirms it.',
        misconception:
          'The garbage collector frees only what nothing references. A forgotten listener on a long-lived emitter is still a reference.',
        hint: 'How many listeners should there be, compared with open connections?',
      },
      {
        title: 'Resolve',
        evidence: 'The feed must stay. You want the fix and a way to catch the next leak sooner.',
        prompt: 'What do you ship?',
        options: opts(
          "Remove the listener on res.on('close') and alert when memory per pod keeps rising",
          'Raise the pod memory limit to 4 GB',
          'Call prices.setMaxListeners(0) to remove the warning',
          'Restart pods every two hours, before they run out',
        ),
        answerKey: 'a',
        explanation:
          "Cleaning up on 'close' (which fires when the client disconnects) removes the leak at its source. An alert on steady memory growth catches the next leak in hours rather than after restarts start hurting users.",
        misconception:
          'Silencing a warning or adding memory makes the symptom quieter, not the bug smaller.',
      },
    ],
    rootCause:
      'The /prices/stream release added an EventEmitter listener per connection and never removed it when clients disconnected, so listeners and their response objects piled up until each pod hit its memory limit and was OOM-killed.',
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'incident-retry-storm',
    title: 'The outage that would not end',
    topicSlug,
    subtopic: 'retries',
    type,
    difficulty: 3,
    prompt:
      'The payments database failed over in 30 seconds, ten minutes ago. Payments is still timing out on 90% of requests.',
    stages: [
      {
        title: 'Alert',
        evidence:
          'The database is healthy again and its CPU is low. Payments CPU is at 100%. Requests reaching payments: 8× normal. User traffic at the edge: normal. No deploy in the last day.',
        prompt: 'What stands out?',
        options: opts(
          'Load on payments is 8× while user traffic is flat, so something between them multiplies requests',
          'The failover is still in progress',
          'Users are pressing the pay button again and again',
          'Payments needs bigger instances for normal traffic',
        ),
        answerKey: 'a',
        explanation:
          'The original cause (the failover) is over, yet payments receives eight times what users send. Users are not the source, because edge traffic is normal. Something inside the system is generating the extra requests.',
        misconception:
          'An outage does not end just because its trigger ended. Look for what is keeping it going.',
      },
      {
        title: 'Investigate',
        evidence:
          'Checkout calls payments with a 2 s timeout and 3 immediate retries. Payments calls the fraud service with 3 retries too. Requests that time out at checkout keep running inside payments until they finish.',
        prompt: 'Why does payments not recover?',
        options: opts(
          'Payments has a memory leak that started at the failover',
          'The fraud service went down during the failover',
          'Retries multiply every slow call, and abandoned requests keep running, so payments stays overloaded',
          'The database connection pool was never re-created',
        ),
        answerKey: 'c',
        explanation:
          'During the failover requests slowed, checkout timed out and retried, and each retry became more work inside payments (and its own fraud retries). Timed-out requests keep using CPU, so payments stays slow, which causes more timeouts and more retries. The system has a stable bad state: a retry storm that sustains itself.',
        misconception:
          'Timeouts and retries feel like safety features, but together they can keep a service down long after the original fault.',
        hint: 'What does each timed-out checkout request leave behind?',
      },
      {
        title: 'Resolve',
        evidence:
          'Payments cannot go faster: its database connection limit is the ceiling, so more instances do not help. You need it back now and want this not to happen again.',
        prompt: 'What do you do?',
        options: opts(
          'Scale payments to 8× the instances to match the load',
          'Cut the retries and shed load so payments can drain; then add retry budgets, jittered backoff and deadlines',
          'Restart payments so its queues are cleared',
          'Raise the checkout timeout to 30 s so requests stop timing out',
        ),
        answerKey: 'b',
        explanation:
          'Breaking the loop needs the extra load to stop: turn retries off (a flag or a circuit breaker) and shed some traffic until payments catches up. After that, retry at one layer only, cap retries as a share of traffic, add jitter, and pass deadlines along so payments drops work its caller has already abandoned.',
        misconception:
          'More capacity is not the only way out of overload. Removing the load that the system generates for itself is faster and cheaper.',
      },
    ],
    rootCause:
      'A short database failover slowed payments; immediate retries at two layers multiplied the load, and abandoned requests kept running, so payments stayed overloaded in a self-sustaining retry storm after the database had recovered.',
  },
];
