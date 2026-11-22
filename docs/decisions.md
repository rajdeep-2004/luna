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
| D-013 | 2026-11-22 | P0 planning | Product design spec written before development (docs/product/) | Active (approved) |
| D-014 | 2026-11-22 | P0 design | UI direction: calm night, one moon accent | Active |
| D-015 | 2026-11-22 | P0 design | Lean backend, UI first; phases merged from 7 to 6 | Active |
| D-016 | 2026-11-22 | P1 | Backend build choices: bundling, bcryptjs, slugs, computed levels, hint endpoint | Active |
| D-017 | 2026-11-22 | P1 | Question bank V1: 50 challenges + 8 incidents, validated at seed time | Active |
| D-018 | 2026-11-22 | P1 review | Backend review findings: 5 fixed, 3 accepted | Active |

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
- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active, approved by Rajdeep on 2026-11-22 · **Type:** product

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

### D-014 — UI direction: calm night, one moon accent
- **Date:** 2026-11-22 · **Step:** P0 design (HTML mockups, 2 rounds) · **Status:** Active · **Type:** product / design

**Context.** Rajdeep wants a UI that doesn't look like a basic template app, with good motion
and a coherent theme. Before writing any React Native, six key screens were mocked up as HTML
on a private design canvas.

**Round 1 → feedback.** The dark night background, the Sugoi grade and the small animations
worked. But the fonts and palette felt overwhelming: heavy serif everywhere, vermilion buttons,
coloured chips, syntax-highlighted code. Home showed too much (XP bar, 5 moons, 2 extra cards),
and Bug Hunt and Incident Room felt busy.

**Decision (round 2, approved).**
- **One accent:** moon-gold for every primary action, progress and correct answer. Ember is kept
  only for wrong answers and alerts.
- **The serif at most once per screen**, at a lighter weight. Inter for questions and body text.
- **No card borders.** Depth comes from surface vs background.
- **Home shows three things only:** rank and streak, the Daily Kata moon with *Begin kata*, and
  the weakest topic.
- **Game screens:** plain code, a thin progress line, evidence in plain English, simple option rows.

Full tokens, components and motion specs are in `docs/product/ui-design.md`.

**Concepts worth learning.**
- *Visual hierarchy:* when everything is emphasised, nothing is. A single accent colour lets the
  eye find the one action that matters.
- *Design tokens:* named values (`moon`, `surface`) used everywhere instead of raw hex codes,
  so the whole look can change in one file.

---

### D-015 — Lean backend, UI first; phases merged from 7 to 6
- **Date:** 2026-11-22 · **Step:** P0 design · **Status:** Active · **Type:** process / architecture

**Context.** Rajdeep said the backend can be lighter: this is a capstone presentation, and the
UI and experience matter most.

**Decision.**
- **Keep** what makes the demo correct: authentication, answer keys only on the server,
  first-correct XP through the unique-keyed ledger, idempotent session completion, correct streaks,
  and only one duel opponent.
- **Drop multi-document transactions.** Use ordered single-document writes instead, with the
  idempotency write (the attempt insert) first. Worst case after a crash: one lost progress update,
  never double XP.
- **Smoke tests only** in `.scratch/`, covering the critical paths, not every edge case.
- **Basic rate limiting** on `/auth/*` only.
- **Phases:** the old P1 (foundation + auth) and P3 (content + engine) become one backend phase,
  P1. That leaves six phases, P1–P6.

**Alternatives considered.** Keeping transactions: safer, but more code and harder test setup
(it needs a replica-set test DB), for a failure that's very unlikely at demo scale.

**Revisit if** the app is used beyond the capstone. Add transactions around the answer flow then.

---

### D-016 — Backend build choices: bundling, bcryptjs, slugs, computed levels, hint endpoint
- **Date:** 2026-11-22 · **Step:** P1 — Backend core · **Status:** Active · **Type:** tooling / architecture

**Decisions and why.**
- **`shared/` stays TypeScript source; the server build bundles it with tsup.** In dev, `tsx`
  runs TS directly, including the workspace import. For production, `tsup` produces one
  `dist/index.js` with `@luna/shared` inlined (`noExternal`), so Render runs plain Node with no TS
  toolchain. *Rejected:* compiling `shared` to `dist/` and publishing it (an extra build step to
  keep in sync), and `.js`-extension NodeNext imports everywhere (noisy).
- **bcryptjs instead of bcrypt.** It's pure JavaScript, so there's no native compile step on Render
  or on a laptop, and it ships its own types. It's slower than native bcrypt, which is acceptable
  at cost 12 for login traffic at this scale.
- **Challenges reference topics by slug** (`databases`), not by ObjectId. Slugs are fixed in
  `shared/domain.ts`, so no lookup or join is needed and the seed is simpler.
- **Level and rank are computed from `totalXP`** (`levelForXP` in `config/game.ts`), not stored.
  One source of truth: changing the thresholds never needs a data migration.
- **A separate `POST /sessions/:id/hint` endpoint** (new, not in the brainstorm). The server must
  know a hint was used to halve the XP, so the hint is revealed through the server and recorded
  on the session item. It is never sent with the challenge.
- **Starting a session resumes an open one of the same kind.** A double tap on "Start practice"
  returns the same session instead of creating two.
- **Server time per answer** = time since the previous answer in the session (or the session
  start), capped at 10 minutes so an idle phone doesn't skew stats.
- **Rate limiting:** `/auth/*` 10 per 15 min per IP (skipped when `NODE_ENV=test`, because the
  local smoke tests register many users), plus a global 300/min.

**How answer submission works** (`sessions.service.ts → submitAnswer`):
1. Load the session (it must be the user's own and ACTIVE), the item and the challenge.
2. Check that the stage is the next unanswered one: earlier → 409 "Already answered", later →
   409 "Answer the earlier stage first".
3. Evaluate on the server (`sessions.evaluator.ts`): option id, Bug Hunt line number, or incident
   stage option.
4. Insert the attempt. The unique index turns a double tap into a 409.
5. Update topic progress with one atomic `$inc`/`$push` + `$slice`.
6. If the answer is correct (and not the baseline), award XP through the ledger:
   `challenge:<id>` or `challenge:<id>:<stage>`. A duplicate key means "already earned", so 0 XP.
7. Return the evaluation, XP, the next incident stage (if any), and the root cause after the last stage.

**Concepts worth learning.**
- *Allow-list projection:* `toPublicChallenge` copies only named safe fields, so a new secret
  field added to the model can't leak by accident.
- *Timing-equalised login:* comparing against a dummy hash when the email doesn't exist makes
  "wrong email" and "wrong password" take the same time, so attackers can't probe which emails
  have accounts.

**Files:** `server/src/**`, `shared/src/**`, `server/tsup.config.ts`.

---

### D-017 — Question bank V1: 50 challenges + 8 incidents, validated at seed time
- **Date:** 2026-11-22 · **Step:** P1 — Backend core · **Status:** Active · **Type:** content

**Decision.** The bank in `server/src/seed/content/` matches `docs/product/game-modes.md` §5
exactly. Each topic has 10 single challenges with 4 beginner, 4 intermediate and 2 advanced, and
the type mix per topic follows the plan. On top of that there are 8 three-stage incidents. Every
item is checked by a Zod schema at seed time. An `answerKey` must match an option. A Bug Hunt
line must be inside the snippet. An incident must have 3 stages. Slugs must be unique. One bad
item fails the whole seed, so the bank never half-loads.

**Seeding is idempotent:** items are upserted by `slug`, and items removed from the files are
deactivated rather than deleted, so past attempts still point at real challenges.

**Quality rules followed:** one concept per item; wrong options are plausible misconceptions
(the brainstorm's "Replace HTTP with WebSocket" option was replaced); explanations of 2–4
sentences plus one misconception line; hints on intermediate and advanced items.

**Revisit if** usability testers report confusing items. Edit the file and re-run `npm run seed -w server`.

---

### D-018 — Backend review findings: 5 fixed, 3 accepted
- **Date:** 2026-11-22 · **Step:** P1 — backend code review (one reviewer) · **Status:** Active · **Type:** security / edge-case

The reviewer reported 1 question and 7 medium risks, and no critical or high ones.

**Fixed (each covered by a local smoke test):**
1. **Bug Hunt compared lines as strings,** so "07" was marked wrong. It now compares numerically.
2. **Concurrent session starts** could create two open baselines. There is now a partial unique
   index on `{userId, type, topicSlug}` for ACTIVE PRACTICE and BASELINE sessions; the loser of a
   race returns the winner's session.
3. **Lost XP after a partial failure:** if the attempt was saved but XP wasn't awarded, a retry
   hit 409 and the XP was gone. On a duplicate attempt, the server now re-runs the XP award, which
   the ledger turns into a no-op if it already happened.
4. **Concurrent first answers on a topic** could both try to insert the progress row. The loser
   now retries as an update.
5. **No per-account brute-force guard** (the per-IP limit can be dodged with many IPs). Five
   consecutive failed logins now lock the account for 15 minutes (`config/security.ts`), and a
   successful login resets the counter. A locked account answers 429 even with the right password.

**Accepted, not changed:**
- **The first-incident bonus pays on finishing, even with wrong stages.** That's intended:
  `scoring.md` rewards completing your first Incident Room, not acing it.
- **The ledger insert and `$inc totalXP` aren't atomic.** A crash between them loses that XP.
  This is the trade-off D-015 accepted. *Revisit if* XP discrepancies appear: recompute
  `totalXP` from the `xpevents` sum.
- **Register says "An account with this email already exists".** Technically this allows account
  enumeration, but it is standard UX, and the endpoint is rate-limited. A generic message would
  confuse real users who forgot they signed up.

---

### D-019 — App scaffold: Expo SDK 58 in the `app` workspace, theme tokens in one folder
- **Date:** 2026-11-22 · **Step:** P2 task 1 · **Status:** Active · **Type:** technical

**Context.** P2 starts the mobile app. We needed a project that runs in Expo Go, shares the Zod
types in `shared/`, and keeps every colour, size and font in one place so screens never hardcode them.

**Decision.** `app/` is a new npm workspace (`@luna/app`) on the latest stable Expo SDK (58, React
Native 0.88, React 19.3). It was created from the `blank-typescript` template and then trimmed by hand,
because the template's own `package.json` and git folder do not fit a monorepo. Theme tokens
live in `app/src/theme/` (`colors`, `spacing`, `typography`, `fonts`) and mirror `ui-design.md`
exactly. `ui-design.md` already says values live there "and nowhere else".

**Dependencies added, and why.** `expo-font` plus the three `@expo-google-fonts/*` packages load
Shippori Mincho, Inter and JetBrains Mono (the design system's fonts). `react-native-svg` draws the
moon phases and yokai masks as vectors. `react-native-reanimated` and `react-native-worklets`
power the motion in `ui-design.md` §6 (used from P3). `expo-haptics` gives the tap feedback.
`expo-secure-store` keeps the login token in the phone's keychain, not in plain storage.
`@react-navigation/*` with `react-native-screens` and `react-native-safe-area-context` is the
navigation stack chosen in D-003. `@tanstack/react-query` handles server state and `zustand` the
small auth store. The device timezone for the streak logic comes from the built-in `Intl` API, so no extra package is needed.

**Alternatives rejected.** Expo Router (already rejected in D-003). A bare React Native project
(needs native build tooling; Expo Go avoids it). A custom `babel.config.js`: SDK 58's default preset
already includes the Reanimated plugin, so we ship none.

**How it works.** Fonts are loaded with `useFonts` and the app renders nothing until they are ready,
so there is no flash of the wrong font. Spacing, radii and type roles are plain objects, so a screen
writes `typography.title` instead of repeating a font size.

**Files.** `app/*`, `package.json` (workspace added), `docs/prd.md` (P2 → building).
**Concepts.** npm workspaces + Metro monorepo resolution; Expo Go vs. development builds.
**Revisit if** a feature needs a native module Expo Go does not ship (then switch to a dev build).

### D-020 — Core UI components: small, token-only, accessible by default
- **Date:** 2026-11-22 · **Step:** P2 task 2 · **Status:** Active · **Type:** technical

**Decision.** Twelve components live in `app/src/components/` (Screen, Button, TextField, Card,
ProgressLine, MoonPhase, YokaiAvatar, Lantern, EmptyState, ErrorState, WakingServer, plus an `AppText`
wrapper). None hardcodes a colour, size or font: they read `src/theme`. `AppText` takes a `variant`
(not `role`, which React Native's own `Text` already uses for accessibility) and caps Dynamic Type at 1.3x.

**Edge cases handled.** `Button` ignores taps while `pending` (the double-submit rule) and exposes
`busy`/`disabled` to screen readers. `ProgressLine` clamps its value to 0..1 and treats NaN as 0.
`TextField` shows its error in a live region. Moons and avatars are SVG, so they stay sharp at any size.

**Alternatives rejected.** A UI kit such as React Native Paper: it would bring its own look and fight the
"calm night, one moon" design. Bitmap avatars: heavier and blurry when scaled.

**Revisit if** the masks need to be redrawn by a designer. Each is one entry in `YokaiAvatar.tsx`.

### D-021 — API client, auth store and the cold-start notice
- **Date:** 2026-11-22 · **Step:** P2 task 3 · **Status:** Active · **Type:** technical

**Decision.** `app/src/api/client.ts` is a thin wrapper over `fetch`. It sets a 15 s timeout,
unwraps the `{ data }` / `{ error }` envelope into either a value or an `ApiError`, and retries
**GET requests only**, twice, with 500 ms then 1 s backoff, and only for transient failures (network,
timeout, 503, 5xx gateway). POSTs and PATCHes are never replayed automatically, as `architecture.md` §9
says. A 401 on an authenticated call signs the user out.

**Cold start.** Render's free tier sleeps and wakes in about 30 s. If a request is still pending after
4 s, a small Zustand store flips `waking` to true and the UI shows the `WakingServer` notice, so the
user sees an explanation instead of a frozen screen. A counter handles several slow requests at once.

**Auth store.** Zustand holds `status`, `token` and `user`. The token is saved with `expo-secure-store`
(the phone's keychain), never AsyncStorage. On launch `hydrate()` reads the token and calls
`GET /users/me`: a 401 signs out; a network failure sets `error` and offers Retry instead of logging
the user out because their train had no signal. The client and store connect through `configureApi`, which
avoids a circular import. Logout also clears the React Query cache so the next user never sees old data.

**Config.** `src/config/env.ts` is the only file that reads `process.env`, mirroring the server's rule.
It fails fast with a clear message when `EXPO_PUBLIC_API_URL` is missing. `.env.example` documents it.

**Alternatives rejected.** Axios (extra dependency for what `fetch` does). Retrying POSTs (risks
duplicates; server idempotency exists but the user should choose). Storing the token in AsyncStorage (unencrypted).
**Revisit if** the JWT expiry (7 days, no refresh token) annoys testers; then add refresh tokens.

### D-022 — Navigation, auth and onboarding screens
- **Date:** 2026-11-22 · **Step:** P2 tasks 4–5 · **Status:** Active · **Type:** product + technical

**Decision.** `RootNavigator` chooses what to show from the auth store: a spinner while the saved
token is checked, an `ErrorState` with Retry if the server was unreachable, `AuthStack` (Welcome,
Register, Login) when signed out, `OnboardingStack` (Avatar, Topics, Level) when signed in but
`onboarded` is false, and `MainTabs` (Dojo, Explore, Duel, Profile) otherwise. The stack is *swapped*
rather than pushed, so a finished user cannot press Back into onboarding, and logging out drops them
straight onto Welcome. Onboarding is "resumable" for free: if the app is closed halfway, `onboarded` is
still false on the server and the user lands on the same flow.

**Product deviation: no separate username step.** `build-plan.md` lists username as an onboarding step, but
the register endpoint already requires a username (and validates it is unique), so asking again would be
redundant friction. The username is collected on Register, and onboarding has three steps: avatar, topics,
level. Fewer steps before the first challenge supports the activation goal in `prd.md`.

**How the forms work.** Inputs are validated on the device with the same Zod schemas the server uses
(`RegisterRequest`, `LoginRequest` from `shared/`), so error text is identical and never drifts. Server
errors (wrong password, email taken, locked account, rate limit) show in one message above the button. The
submit button shows a spinner and ignores taps while the request is in flight. The three onboarding answers
are kept in a small Zustand draft store and sent in one `PATCH /users/me` on the last step, with the
device timezone and `completeOnboarding: true`. Success updates the auth store, and the root navigator
swaps to the tabs by itself.

**Tabs.** Dojo, Explore and Duel are `EmptyState` placeholders that show the user's avatar, name and
lantern so P2 auth can be checked by eye. Profile has a Log out button. Tab icons are left out on purpose
(labels only) to avoid an icon dependency; they can be added when the real screens land.

**Alternatives rejected.** Collecting onboarding answers across separate API calls (a half-finished profile
would be possible). Expo Router (D-003).
**Files.** `app/App.tsx`, `app/src/navigation/*`, `app/src/screens/*`, `app/src/store/onboarding.ts`, `app/src/lib/*`.
**Concepts.** Conditional navigators (auth flow pattern in React Navigation); controlled inputs; schema reuse across client and server.
**Revisit if** testers want to change avatar or topics later; that belongs in the Profile screen (P5).
