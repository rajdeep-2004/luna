# Build Plan — StackSprint

> Last updated: 2026-11-22. Phase status lives in `docs/prd.md` §9. This file holds the task list
> per phase, the API surface, and how each phase is checked.

## How each phase runs

1. Rajdeep says **"start P<n>"**. Claude creates branch `phase/p<n>-<slug>` from an up-to-date
   `main`, sets the phase to `building` in `prd.md`, and lists the tasks.
2. Build, one commit per task (conventional commits). Before each commit: `npm run lint`,
   `npm run typecheck`, and for backend work the API tests in `.scratch/api-tests/` (gitignored).
3. **Check:**
   - Backend phases (P1, P3, P5 server part, P6 server part): **one backend code review** of the
     branch diff. Fix critical and high findings.
   - Frontend phases: no automated UI reviewer on backend code. Claude gives Rajdeep a click-through
     checklist and Rajdeep tests on Expo Go.
4. Report (5 lines max) and **stop**. Rajdeep reviews and asks for changes if needed.
5. When Rajdeep says the phase is done: update `prd.md` status to `shipped`, add a decisions entry,
   merge the branch into `main` (`git merge --no-ff`), and push `main` and the branch. **No PR.**
6. Rajdeep `/clear`s and says "start P<n+1>". Claude never starts the next phase on its own.

## API surface (`/api/v1`)

| Method | Endpoint | Auth | Phase | Purpose |
|---|---|---|---|---|
| GET | `/health` | — | P1 | liveness + DB ping |
| POST | `/auth/register` | — | P1 | create account, return token + user |
| POST | `/auth/login` | — | P1 | return token + user |
| GET | `/users/me` | ✓ | P1 | current profile |
| PATCH | `/users/me` | ✓ | P1 | onboarding: username, avatarId, preferredTopicIds, experienceLevel, timezone |
| GET | `/topics` | ✓ | P3 | topic list |
| POST | `/sessions` | ✓ | P3 | start PRACTICE (`topicId`) or BASELINE session → challenges without answer keys |
| GET | `/sessions/:id` | ✓ | P3 | resume a session (items, answered state) |
| POST | `/sessions/:id/answers` | ✓ | P3 | submit an answer (`challengeId`, `stageIndex?`, `answer`) → evaluation + next stage |
| POST | `/sessions/:id/complete` | ✓ | P3 | finish → summary (idempotent) |
| GET | `/daily` | ✓ | P5 | today's circuit (creates it once) + its session |
| GET | `/users/me/progress` | ✓ | P5 | XP, level, streaks, per-topic mastery, weakest topic, recommendation |
| GET | `/users/me/sessions` | ✓ | P6 | paginated session history |
| GET | `/users/me/achievements` | ✓ | P6 | earned and locked achievements |
| GET | `/leaderboard/weekly` | ✓ | P6 | `?cursor=&limit=` ranking + `me` row |
| POST | `/duels` | ✓ | P6 | create duel → code + creator session |
| POST | `/duels/:code/join` | ✓ | P6 | join → opponent session |
| GET | `/duels/:id` | ✓ | P6 | status (participants only) |
| GET | `/duels/:id/result` | ✓ | P6 | scores + winner once both are done |

Changes from the brainstorm: endpoints are versioned under `/api/v1`. `POST /sessions/:id/answer`
became `/answers`. `GET /challenges/daily` became `GET /daily`, because it returns a circuit plus a
session, not a challenge. `PATCH /users/me` was added for onboarding. See D-009.

---

## P0 — Docs and plan
- [x] PRD, architecture, build plan, decisions log, CLAUDE.md, TODOS.md, .gitignore.
- [x] Move `luna-idea.md` into `docs/` unchanged.

## P1 — Backend foundation and auth  *(backend review)*
1. Root npm workspaces (`app`, `server`, `shared`), shared ESLint + Prettier + tsconfig base, root scripts `lint`, `typecheck`.
2. `shared/`: Zod schemas for auth requests/responses and the envelope types.
3. `server/` skeleton: config (Zod env parsing), pino logger, requestId, helmet, cors, JSON body limit (100 kb),
   error envelope + `AppError`, 404 handler, `/health` with DB ping, graceful shutdown.
4. Mongo connection (timeouts, retry on boot) + `User` model with indexes.
5. Auth module: register, login (bcrypt, JWT), `requireAuth`, rate limits, `GET/PATCH /users/me`.
6. `.scratch/api-tests/` harness (MongoMemoryReplSet + Supertest) with auth tests: happy path, duplicate
   email/username, bad password, rate limit, missing/expired token, no passwordHash in responses.

## P2 — App foundation, auth and onboarding UI  *(manual test)*
1. Expo app (TypeScript) in `app/`, wired to `shared/`. Theme tokens and base components (Button with pending/disabled state, TextField with label + error, Card, Loading, ErrorState with Retry).
2. API client: base URL from `EXPO_PUBLIC_API_URL`, 15 s timeout, GET retry with backoff, envelope parsing, typed errors, "waking server" detection.
3. Auth store (Zustand + SecureStore) and React Navigation: `RootNavigator` switches AuthStack / OnboardingStack / MainTabs (Home, Explore, Leaderboard, Profile) on auth + onboarding state.
4. Screens: Welcome, Register, Login (validation, double-submit protection, server error messages), Logout.
5. Onboarding: username, preset avatar grid, preferred topics, experience level, timezone captured from the device. Placeholder tab screens.

## P3 — Content and challenge engine API  *(backend review)*
1. `Topic` + `Challenge` models (incl. incident `stages`) and a public projection that strips `answerKey` everywhere.
2. Question bank in `server/src/seed/content/`: 5 topics, **≥50 challenges** (≥10 per topic, all 3 difficulties, all 4 types) + **≥4 Incident Room scenarios** (3 stages each). Content is validated against a Zod schema at seed time. Seed is idempotent (upsert by `slug`).
3. Session service: start PRACTICE (5 challenges for a topic at the user's difficulty) and BASELINE (1 beginner per topic).
4. Answer evaluation: per type (option id, bug line number, incident stage option). Server-measured time, unique attempt index, transaction, incident stage reveal.
5. Complete session: idempotent, summary (correct, accuracy, time, per-topic results, weak areas).
6. API tests: answer key never leaks (deep-scan responses), double submit → 409, wrong session owner → 404, incident stage order enforced, complete twice → same summary.

## P4 — Game UI  *(manual test)*
1. Explore screen: 5 topic cards → start a practice session.
2. Game screen shell: title, difficulty, progress (n/5), optional timer, hint, resume after an app restart (`GET /sessions/:id`).
3. Challenge components: `TraceChallenge`, `BugHuntChallenge` (tappable code lines, monospace, horizontal scroll), `ChoiceChallenge`, `IncidentChallenge` (stage stepper, evidence panel, incident report).
4. Feedback screen: correct/incorrect, correct answer, explanation, misconception, XP, Next. Submit button disabled while in flight.
5. Session summary screen. Error, empty and offline states throughout.

## P5 — Progression  *(backend review for the server part, manual test for the UI)*
1. XP ledger (`xpevents`), level thresholds, first-completion rule, daily bonus, first-incident bonus.
2. Streak manager (timezone-aware) + tests: same day, next day, gap, timezone edge, double complete.
3. Topic progress: mastery labels, adaptive difficulty (last 5), weakest topic, mistake revisiting queue.
4. Daily Circuit service + `GET /daily` (unique per user per day, composition, personalisation, fallbacks) + tests incl. concurrent first open.
5. `GET /users/me/progress`. Baseline assessment sets the initial difficulty per topic.
6. UI: Home dashboard (all F-03 widgets), Start Daily Circuit, baseline step at the end of onboarding, streak/XP updates on the summary.

## P6 — Competition and profile  *(backend review for the server part, manual test for the UI)*
1. Weekly leaderboard aggregation (paginated + `me` row, tier = level title) + tests (week boundary, ties).
2. Duels: create (code generation), join (atomic, not your own, not expired), DUEL sessions, result + tests (join race, expiry, tie-break by time, non-participant → 404).
3. Achievements engine (5 badges, awarded once) + session history endpoint.
4. UI: Leaderboard tab, Duel create/share (`Share` API)/join/waiting/result screens, Profile (stats, topic table, achievements, recent activity).

## P7 — Polish, deploy and demo prep  *(manual test)*
1. Deploy the API to Render + Atlas prod DB. Run the seed on prod. Verify `/health`.
2. App polish: transitions, haptics on answer, accessibility labels, contrast check, small-screen layout.
3. Network failure pass: airplane mode, Render cold start, token expiry → back to login.
4. Run the full acceptance checklist (PRD acceptance criteria 1–12) with two accounts. Write `README.md` with setup + demo script.
