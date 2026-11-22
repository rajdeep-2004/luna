# Decision Log — Luna

Every non-trivial decision made while building this project, with the reasoning behind it.
Written so that someone reading it after the project is finished can understand **what** was built,
**why** it was built that way, and **how** the logic works.

Rules: append new entries at the bottom. Never delete an entry. If a decision changes, add a new
entry and mark the old one `Superseded by D-###`.

## Index
| ID | Date | Step / phase | Title | Status |
|---|---|---|---|---|
| D-001 | 2026-11-22 | P0 planning | V1 scope is P0 + P1 from the brainstorm | Active |
| D-002 | 2026-11-22 | P0 planning | Project workflow: branch per phase, no PRs, gitignored API tests | Active |
| D-003 | 2026-11-22 | P0 planning | Tech stack, with plain React Navigation | Active |
| D-004 | 2026-11-22 | P0 planning | Monorepo with npm workspaces and a shared Zod contract package | Active |
| D-005 | 2026-11-22 | P0 planning | Testing: backend API tests only, kept out of the repo | Active |
| D-006 | 2026-11-22 | P0 planning | Deployment: Render + Atlas + Expo Go, no CI, no Docker | Active |
| D-007 | 2026-11-22 | P0 planning | App name StackSprint, repo name luna (assumption) | Superseded by D-012 |
| D-008 | 2026-11-22 | P0 planning | Single 7-day JWT, no refresh tokens | Active |
| D-009 | 2026-11-22 | P0 planning | API shape changes from the brainstorm | Active |
| D-010 | 2026-11-22 | P0 planning | Server-side integrity: answer keys, XP ledger, idempotent writes | Active |
| D-011 | 2026-11-22 | P0 planning | Time rules: local-day streaks, UTC-week leaderboard | Active |
| D-012 | 2026-11-22 | P0 planning | The app is called Luna | Active |
| D-013 | 2026-11-22 | P0 planning | Product design spec written before development (docs/product/) | Proposed |

---

### D-001 — V1 scope is P0 + P1 from the brainstorm
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** product

**Context.** The brainstorm (`docs/luna-idea.md`) splits features into P0 (mandatory MVP),
P1 (complete V1) and P2 (future). The capstone demo scenario in the brainstorm (§22) uses
P1 features: Friend Duel and the weekly leaderboard.

**Decision.** Build P0 + P1. P2 stays out.

**Alternatives considered.** *P0 only* would be smaller and safer, but the demo would have no
multi-user story, and a capstone that is "just a quiz app" undersells the backend work. *P0 plus
competition only* would leave out achievements and adaptivity. Those are cheap to add once the XP
ledger exists, and they are what makes the app feel personalised.

**Why.** The demo needs two users competing to show server-side evaluation, persistence and
multi-user logic. P1 items are mostly rules on top of data that P0 already stores.

**Revisit if** the timeline slips. P6 (competition) can be trimmed to the leaderboard only, and
achievements can be dropped first.

---

### D-002 — Project workflow: branch per phase, no PRs, gitignored API tests
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** tooling

**Context.** Rajdeep's global working rules say: TDD always, a PR per milestone, and `/review`,
`/qa` and `/ship` after each one. For this capstone, Rajdeep asked for a lighter process.

**Decision.** This project overrides the global rules:
- Work in "phases" on branches `phase/p<n>-<slug>`. When a phase is done, merge it into `main`
  and push. Do not open a PR.
- No TDD requirement. Backend API tests are written, but they live in gitignored `.scratch/`.
- Backend phases get one backend-focused code review. No UI reviewer looks at backend code,
  and only a small number of review agents are used.
- Rajdeep tests the frontend by hand from a checklist.

**Why.** Rajdeep wants the pushed repository to contain only the product, and wants to keep
reviewing effort proportional to the project.

**Revisit if** the course requires visible tests in the repo. In that case, move
`.scratch/api-tests` to `server/test` and add an `npm test` script.

---

### D-003 — Tech stack, with plain React Navigation
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** stack

**Context.** The brainstorm proposes Expo + React Native + TypeScript on the client and Node +
Express + MongoDB on the server. Expo's current default is Expo Router (file-based routing).

**Decision.** Keep the brainstorm's stack. Use **React Navigation** directly (native stack +
bottom tabs), not Expo Router. Rajdeep chose this in chat. Also use Express 5, Mongoose,
TanStack Query, Zustand and expo-secure-store.

**Alternatives considered.** *Expo Router* has file-based routes and less boilerplate, and it is
built on React Navigation, but Rajdeep prefers the explicit navigator API. *Postgres* would give
relational integrity, but the brainstorm, the course and the document-shaped content (challenges
with nested options and incident stages) all point to MongoDB.

**How it works.** React Navigation declares screens in code: a `RootNavigator` shows the
`AuthStack` when there is no token, an `OnboardingStack` when the user hasn't onboarded yet, and
otherwise `MainTabs` (Home, Explore, Leaderboard, Profile) with game screens pushed on top as
stack screens. Route params are typed with a `RootStackParamList`.

**Concepts worth learning.**
- *Server state vs client state:* TanStack Query caches data that lives on the server (profile,
  topics). Zustand holds data that only the app knows (the token, which answer is selected).
- *SecureStore:* stores the token in the iOS Keychain or Android Keystore, which are encrypted.
  AsyncStorage is plain text.

---

### D-004 — Monorepo with npm workspaces and a shared Zod contract package
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** architecture

**Decision.** One repo with three npm workspaces: `app/` (Expo), `server/` (Express) and
`shared/` (Zod schemas + TypeScript types for every API request and response).

**Alternatives considered.** *Two separate repos* would mean duplicated types that drift apart.
*Copying types by hand* is error-prone. *pnpm, Turborepo or Nx* would add tools without a real
benefit at this size.

**How it works.** The server validates incoming bodies with, for example,
`shared.RegisterRequest.parse(req.body)`. The app imports the same `z.infer<>` types for its
fetch calls. Change a field once and both sides fail to typecheck until they are updated.
Expo SDK 52+ detects npm workspaces automatically, so Metro needs no extra configuration.

**Revisit if** Metro has trouble resolving `shared/`. The fallback is to build `shared/` to `dist/`.

---

### D-005 — Testing: backend API tests only, kept out of the repo
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** tooling

**Decision.** API tests use Vitest + Supertest + mongodb-memory-server and live in
`.scratch/api-tests/` (gitignored). The server exports `createApp()` separately from `listen()`,
so tests can import it without starting a port.

**How it works (first time this tooling appears).**
- **Vitest** runs the test files.
- **Supertest** sends real HTTP requests to the Express app in memory.
- **mongodb-memory-server** downloads and starts a throwaway MongoDB for the test run. The
  *replica set* variant (`MongoMemoryReplSet`) is needed because the answer flow uses
  transactions, and MongoDB only supports transactions on replica sets (Atlas is one).

**What gets tested.** The things that break silently: answer keys leaking, XP awarded twice,
streaks across midnight and timezones, duplicate daily circuits, two people joining one duel,
users reading other users' data, and rate limits.

**Revisit if** tests need to run in CI (see D-002).

---

### D-006 — Deployment: Render + Atlas + Expo Go, no CI, no Docker
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** infra

**Decision.** Express API on a Render free web service, auto-deployed from `main`. Database on
MongoDB Atlas M0. The app runs in Expo Go. No GitHub Actions, no Docker. Lint and typecheck run
locally before every commit.

**Trade-offs accepted.**
- *Render free tier sleeps after about 15 minutes idle.* The first request takes about 50 seconds.
  The app detects slow requests and shows "Waking up the server..." instead of failing. Before a
  demo, open `/health` once to warm it up.
- *Atlas allows `0.0.0.0/0`* because Render's free tier has no static outbound IP. Mitigation: a
  long random DB password, a DB user with access to one database only, and the connection string
  kept only in Render env vars.
- *No CI* means nothing enforces the checks on push. The local pre-commit checks are the only
  gate (Rajdeep's choice).

**Revisit if** the app is published to a store (EAS Build) or more people contribute (add CI).

---

### D-007 — App name StackSprint, repo name luna (assumption)
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Superseded by D-012 · **Type:** assumption

The brainstorm calls the product **StackSprint**, and the repo folder is `luna`. Unless Rajdeep
says otherwise, the app's display name, Expo `name` and docs use "StackSprint", and the repo stays
`luna`. Renaming later is a string change in `app.json` and the docs.

---

### D-008 — Single 7-day JWT, no refresh tokens
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** security

**Decision.** Login returns one HS256 JWT valid for 7 days, stored in SecureStore and sent as a
Bearer header. When it expires (401), the app clears it and returns to login.

**Alternatives considered.** *Short access token + rotating refresh token* is the industry
standard for production apps, but it needs a token store, rotation and reuse detection. That is
significant work for a capstone with no sensitive data. *Cookies* don't suit a native app.

**Revisit if** the app handles anything sensitive or is published. Add refresh tokens then
(logged in `TODOS.md`).

---

### D-009 — API shape changes from the brainstorm
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** api

- All routes are under `/api/v1`, so a breaking change can ship as `/v2` without breaking
  installed apps.
- `POST /sessions/:id/answer` became `/answers`, because it is a collection of attempts.
- `GET /challenges/daily` became `GET /daily`, because it returns a circuit and its session.
- Added `PATCH /users/me` for onboarding, plus `GET /sessions/:id` so a game can resume after
  the app is killed.
- Every response uses `{ data }` or `{ error: { code, message } }`. Lists are cursor-paginated.

---

### D-010 — Server-side integrity: answer keys, XP ledger, idempotent writes
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** architecture

**Context.** A game with a leaderboard invites cheating. The brainstorm requires that answer keys
stay on the server and that XP is only earned on first completion.

**Decision.**
1. **Answer keys never leave the server.** The challenge repository has one "public projection"
   that removes `answerKey` and each incident stage's answer key, and every response goes through
   it. A test deep-scans responses for these fields.
2. **XP is a ledger.** Each award is an `xpevents` row with a `sourceKey` such as
   `challenge:<id>` or `daily:2026-11-22`, and a unique index on `{userId, sourceKey}`. A second
   correct answer to the same challenge hits the unique index, so no XP. The total is incremented
   in the same transaction as the event insert.
3. **Every write is idempotent.**
   - A unique index on `{sessionId, challengeId, stageIndex}` turns a double-tapped Submit into
     a harmless 409.
   - Session completion is a conditional `ACTIVE → COMPLETED` update, so only the first call
     awards anything.
   - The daily circuit is unique per `{userId, date}`.
   - A duel join is an atomic conditional update, so only one opponent can ever get in.
4. **Time is measured on the server**, between the previous answer and this one, so a client
   can't fake fast times to win duels.

**Concepts worth learning.**
- *Idempotency:* doing something twice has the same effect as doing it once.
- *Unique index as a lock:* let the database reject the duplicate, instead of "check, then
  insert", which has a race window.
- *Transaction:* several writes that all succeed or all roll back.

---

### D-011 — Time rules: local-day streaks, UTC-week leaderboard
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** algorithm

**Decision.** Streaks and the Daily Circuit use the user's **local calendar day**. The app sends
its IANA timezone (e.g. `Asia/Kolkata`) during onboarding, and the server converts "now" to a
`YYYY-MM-DD` string in that zone. The weekly leaderboard uses one **global ISO week in UTC**
(it resets Monday 00:00 UTC), so everyone competes in the same window.

**Why.** A streak should match what the user calls "today". A leaderboard must have one shared
boundary, or users in different timezones would be on different weeks.

**Edge cases.** Same day → streak unchanged. Exactly the previous local day → +1. Any other gap
→ reset to 1. An invalid timezone falls back to UTC.

---

### D-012 — The app is called Luna
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** product

Rajdeep decided that the product name is **Luna**, not the brainstorm's "StackSprint". This
supersedes D-007. All docs, the Expo app name and database names (`luna_dev`, `luna_prod`) use
Luna. The brainstorm file `docs/luna-idea.md` keeps its original text as a historical record.

---

### D-013 — Product design spec written before development (`docs/product/`)
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Proposed, awaiting Rajdeep's approval · **Type:** product

**Context.** The first version of the docs only covered engineering. The brainstorm left the game
rules loose: 5 provisional level names, "optional timer", no durations, no duel details, a
50–60 question target with no breakdown. Leaving these to development would mean building, then
being told to change the rules, then rebuilding. That doubles the work.

**Decision.** Write a product design spec in `docs/product/` (users, game modes, scoring,
progression, competition, benchmarks) and get it approved before P1. The proposed headline choices:
- **Theme:** a night dojo. Levels are **10 samurai ranks** (Deshi → Shogun). Topic mastery is shown
  as **moon phases** 🌑🌒🌓🌕. The daily session is renamed **Daily Kata**.
- **Answers as the unit:** an incident stage counts as one answer, so one rule covers accuracy,
  mastery and duel scores.
- **XP:** first-correct only, 10/15/20 by difficulty. Hints halve the XP. 2 "review XP" for repeats
  inside the Daily Kata only. Bonuses are capped and recorded in the ledger.
- **Timer:** only Duels have a countdown (60 s). Learning sessions are untimed but measured.
- **Duels:** 5 single challenges, no incident, 48 h expiry, max 3 win bonuses per day.
- **Cut:** the daily leaderboard and promotion/relegation leagues, because they need more users
  than a capstone has.
- **Proposed new scope:** a Checkpoint re-assessment every 7 active days, so learning can be measured.

**Alternatives considered.** *Keep the brainstorm's 5 levels:* the top would be reached in about
2 weeks, leaving no long-term goal. *Percent mastery:* the brainstorm explicitly rejects
"you know 87%". *Timers everywhere:* they punish slow readers and conflict with the "don't exclude
beginners" principle. *Speed XP:* it rewards guessing.

**Concepts worth learning.**
- *Core loop:* the repeated cycle a product is built around (open → Kata → feedback → progress → return).
- *Separating effort from skill metrics:* XP only grows and rewards showing up. Mastery can drop,
  and it tells the truth about skill. Mixing the two makes both meaningless.
- *Anti-farming:* designing rewards so the cheapest way to earn them is the behaviour you want.

**Revisit if** usability testing shows the levels are too slow or fast (adjust the thresholds in
`server/src/config/game.ts`), or users find the theme confusing.

---
