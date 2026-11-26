import { opts, type ChallengeSeed } from '../schema';

/**
 * Incident Room scenarios (docs/product/game-modes.md §5). Three stages each: alert → investigate → resolve.
 * Topics with a finished V2 bank keep theirs next to their singles (jsAsync/, httpApis/, databases/, cachingQueues/).
 */
export const INCIDENTS: ChallengeSeed[] = [
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
];
