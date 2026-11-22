# Decision Log — Luna

Every non-trivial decision made while building this project, with the reasoning behind it.
Written so that someone reading it after the project is finished can understand **what** was built,
**why** it was built that way, and **how** the logic works.

Rules: append new entries at the bottom. Never delete an entry. If a decision changes, add a new
entry and mark the old one `Superseded by D-###`.

## Index

| ID    | Date       | Step / phase | Title                                                                            | Status              |
| ----- | ---------- | ------------ | -------------------------------------------------------------------------------- | ------------------- |
| D-001 | 2026-11-22 | P0 planning  | V1 scope is P0 + P1 from the brainstorm                                          | Active              |
| D-002 | 2026-11-22 | P0 planning  | Project workflow: branch per phase, no PRs, gitignored API tests                 | Active              |
| D-003 | 2026-11-22 | P0 planning  | Tech stack, with plain React Navigation                                          | Active              |
| D-004 | 2026-11-22 | P0 planning  | Monorepo with npm workspaces and a shared Zod contract package                   | Active              |
| D-005 | 2026-11-22 | P0 planning  | Testing: backend API tests only, kept out of the repo                            | Active              |
| D-006 | 2026-11-22 | P0 planning  | Deployment: Render + Atlas + Expo Go, no CI, no Docker                           | Active              |
| D-007 | 2026-11-22 | P0 planning  | App name StackSprint, repo name luna (assumption)                                | Superseded by D-012 |
| D-008 | 2026-11-22 | P0 planning  | Single 7-day JWT, no refresh tokens                                              | Active              |
| D-009 | 2026-11-22 | P0 planning  | API shape changes from the brainstorm                                            | Active              |
| D-010 | 2026-11-22 | P0 planning  | Server-side integrity: answer keys, XP ledger, idempotent writes                 | Active              |
| D-011 | 2026-11-22 | P0 planning  | Time rules: local-day streaks, UTC-week leaderboard                              | Active              |
| D-012 | 2026-11-22 | P0 planning  | The app is called Luna                                                           | Active              |
| D-013 | 2026-11-22 | P0 planning  | Product design spec written before development (docs/product/)                   | Active (approved)   |
| D-014 | 2026-11-22 | P0 design    | UI direction: calm night, one moon accent                                        | Active              |
| D-015 | 2026-11-22 | P0 design    | Lean backend, UI first; phases merged from 7 to 6                                | Active              |
| D-016 | 2026-11-22 | P1           | Backend build choices: bundling, bcryptjs, slugs, computed levels, hint endpoint | Active              |
| D-017 | 2026-11-22 | P1           | Question bank V1: 50 challenges + 8 incidents, validated at seed time            | Active              |
| D-018 | 2026-11-22 | P1 review    | Backend review findings: 5 fixed, 3 accepted                                     | Active              |

---

### D-001 — V1 scope is P0 + P1 from the brainstorm

- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** product

**Context.** The brainstorm (`docs/luna-idea.md`) splits features into P0 (mandatory MVP),
P1 (complete V1) and P2 (future). The capstone demo scenario in the brainstorm (§22) uses
P1 features: Friend Duel and the weekly leaderboard.

**Decision.** Build P0 + P1. P2 stays out.

**Alternatives considered.** _P0 only_ would be smaller and safer, but the demo would have no
multi-user story, and a capstone that is "just a quiz app" undersells the backend work. _P0 plus
competition only_ would leave out achievements and adaptivity. Those are cheap to add once the XP
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

**Alternatives considered.** _Expo Router_ has file-based routes and less boilerplate, and it is
built on React Navigation, but Rajdeep prefers the explicit navigator API. _Postgres_ would give
relational integrity, but the brainstorm, the course and the document-shaped content (challenges
with nested options and incident stages) all point to MongoDB.

**How it works.** React Navigation declares screens in code: a `RootNavigator` shows the
`AuthStack` when there is no token, an `OnboardingStack` when the user hasn't onboarded yet, and
otherwise `MainTabs` (Home, Explore, Leaderboard, Profile) with game screens pushed on top as
stack screens. Route params are typed with a `RootStackParamList`.

**Concepts worth learning.**

- _Server state vs client state:_ TanStack Query caches data that lives on the server (profile,
  topics). Zustand holds data that only the app knows (the token, which answer is selected).
- _SecureStore:_ stores the token in the iOS Keychain or Android Keystore, which are encrypted.
  AsyncStorage is plain text.

---

### D-004 — Monorepo with npm workspaces and a shared Zod contract package

- **Date:** 2026-11-22 · **Step:** P0 planning · **Status:** Active · **Type:** architecture

**Decision.** One repo with three npm workspaces: `app/` (Expo), `server/` (Express) and
`shared/` (Zod schemas + TypeScript types for every API request and response).

**Alternatives considered.** _Two separate repos_ would mean duplicated types that drift apart.
_Copying types by hand_ is error-prone. _pnpm, Turborepo or Nx_ would add tools without a real
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
  _replica set_ variant (`MongoMemoryReplSet`) is needed because the answer flow uses
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

- _Render free tier sleeps after about 15 minutes idle._ The first request takes about 50 seconds.
  The app detects slow requests and shows "Waking up the server..." instead of failing. Before a
  demo, open `/health` once to warm it up.
- _Atlas allows `0.0.0.0/0`_ because Render's free tier has no static outbound IP. Mitigation: a
  long random DB password, a DB user with access to one database only, and the connection string
  kept only in Render env vars.
- _No CI_ means nothing enforces the checks on push. The local pre-commit checks are the only
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

**Alternatives considered.** _Short access token + rotating refresh token_ is the industry
standard for production apps, but it needs a token store, rotation and reuse detection. That is
significant work for a capstone with no sensitive data. _Cookies_ don't suit a native app.

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

- _Idempotency:_ doing something twice has the same effect as doing it once.
- _Unique index as a lock:_ let the database reject the duplicate, instead of "check, then
  insert", which has a race window.
- _Transaction:_ several writes that all succeed or all roll back.

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

**Alternatives considered.** _Keep the brainstorm's 5 levels:_ the top would be reached in about
2 weeks, leaving no long-term goal. _Percent mastery:_ the brainstorm explicitly rejects
"you know 87%". _Timers everywhere:_ they punish slow readers and conflict with the "don't exclude
beginners" principle. _Speed XP:_ it rewards guessing.

**Concepts worth learning.**

- _Core loop:_ the repeated cycle a product is built around (open → Kata → feedback → progress → return).
- _Separating effort from skill metrics:_ XP only grows and rewards showing up. Mastery can drop,
  and it tells the truth about skill. Mixing the two makes both meaningless.
- _Anti-farming:_ designing rewards so the cheapest way to earn them is the behaviour you want.

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
- **Home shows three things only:** rank and streak, the Daily Kata moon with _Begin kata_, and
  the weakest topic.
- **Game screens:** plain code, a thin progress line, evidence in plain English, simple option rows.

Full tokens, components and motion specs are in `docs/product/ui-design.md`.

**Concepts worth learning.**

- _Visual hierarchy:_ when everything is emphasised, nothing is. A single accent colour lets the
  eye find the one action that matters.
- _Design tokens:_ named values (`moon`, `surface`) used everywhere instead of raw hex codes,
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
  toolchain. _Rejected:_ compiling `shared` to `dist/` and publishing it (an extra build step to
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

- _Allow-list projection:_ `toPublicChallenge` copies only named safe fields, so a new secret
  field added to the model can't leak by accident.
- _Timing-equalised login:_ comparing against a dummy hash when the email doesn't exist makes
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
  This is the trade-off D-015 accepted. _Revisit if_ XP discrepancies appear: recompute
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
`onboarded` is false, and `MainTabs` (Dojo, Explore, Duel, Profile) otherwise. The stack is _swapped_
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

### D-023 — P2 closed after manual test

- **Date:** 2026-11-22 · **Step:** P2 — manual review · **Status:** Active · **Type:** process

Rajdeep clicked through the P2 checklist in Expo Go and approved it. The only problem found was that the
app showed "Cannot reach the server" because the API was not reachable on the configured port. After
the port setting was corrected, register and onboarding worked. This was setup, not a code bug.
Native Expo Go requests send no `Origin` header, so CORS only matters for Expo web. As P2 is frontend-only,
no automated review ran, following the project rules. P2 is marked `shipped` in `prd.md` and merged into `main`.

### D-024 — Game UI: server-driven session screen, feedback sheet, summary

- **Date:** 2026-11-22 · **Step:** P3 tasks 1–5 · **Status:** Active · **Type:** product + technical

**Context.** P3 turns the finished backend (P1) into the playable loop: pick a topic, answer, get
feedback, see a summary. The risk with game screens is the app and server disagreeing about where the
player is, so the main design question was who owns the position inside a session.

**Decision: the server owns the position, the app derives it.** `SessionScreen` loads `GET /sessions/:id`
and `lib/session.ts#findStep` picks the first unfinished item and, for an Incident, the first unanswered
stage. After each answer, "Next" refetches the session instead of the app counting forward by itself. That
makes resume free (close the app, reopen the session, land on the right question), and a duplicate answer
(HTTP 409 after a lost response) is handled by resyncing rather than showing an error. The leave button only
navigates away; the session stays open on the server.

**One screen, four modes.** Trace and Engineer's Choice share `ChoiceBody`; Bug Hunt uses tappable
`CodeLine`s and sends the 1-based line number as the answer; the Incident Room shows earlier stages as a muted
timeline, the current stage's evidence in a card, then its question and options. All four use the same
header, the same "Strike" button, and the same feedback sheet, so the interaction feels consistent.

**Feedback.** After a verdict a sheet rises (500 ms) with a 正/誤 stamp, an XP count-up, the explanation,
the misconception, and for Engineer's Choice a line on why each wrong option is worse. Correct and wrong are
never colour alone: correct is a gold filled circle with ✓, wrong an ember outline with ✕. Haptics: `selection`
on tap, `success` / `error` on the verdict. **Reduce Motion** (the OS setting) turns off the spring, the shake,
the count-up and the slide, replacing them with a short fade.

**Hints.** The "Need a hint?" button asks for confirmation ("Using a hint halves the XP for this question")
before calling the hint endpoint, as `game-modes.md` §3 requires. The hint text is kept only in local state.

**Summary.** `SummaryScreen` calls `POST /sessions/:id/complete`. The server makes that idempotent, so
reopening is safe, and the Incident Report (stages correct, grade, time, XP, root cause) is the same screen with
different labels. The root cause arrives with the last stage's answer and is passed to the summary as a route
param, because the summary payload doesn't carry it. If the app is killed before the summary, the root cause is
not shown on resume; the score still is. After completing, the app refreshes `/users/me` so XP and streak are
current. "Worth another look" buttons start a practice session on the weakest topics.

**Assumptions I made.** The username/avatar header from P2 stays on the placeholder tabs. Topic cards show a
new moon for every topic because mastery phases arrive in P4. The petals and the rank-up banner in `ui-design.md`
§6 are left for P4 (rank-up) and P6 (polish).

**Alternatives rejected.** Client-side counting of the question index (breaks resume). Putting the feedback in a
`Modal` (focus and animation quirks on Android; an absolutely positioned view is simpler and keeps our own dimming).

**Files.** `app/src/screens/{explore,game}/*`, `app/src/lib/{session,haptics,useCountUp,useTopicNames}.ts`,
`app/src/components/{OptionRow,CodeBlock,Marker,Stamp}.tsx`, `app/src/navigation/AppStack.tsx`.
**Concepts.** Server-driven UI state; idempotent endpoints; accessibility state (`radio`, `checked`, live regions);
the OS Reduce Motion setting.
**Revisit if** the first-correct-XP rule makes repeat practice feel unrewarding, or testers lose their Incident
root cause on resume.

### D-025 — P3 accepted; visual polish deferred to after V1

- **Date:** 2026-11-22 · **Step:** P3 — manual review · **Status:** Active · **Type:** product

Rajdeep reviewed P3 in Expo Go. The Explore page was approved as is. The feedback was that the game screens
look plain (UI and copy). Decision: do not polish now. The point of V1 is the complete loop (progression,
daily kata, duels, profile), and polish is cheaper and better judged once every screen exists, so the
whole app can be given one consistent set of micro-interactions. The idea is logged in `TODOS.md` and
belongs to the P6 polish pass. This is a deliberate trade-off: function first, delight second, with a date
on the second. P3 is marked `shipped` in `prd.md` and merged into `main`.

### D-026 — Streaks, bonuses and rank-up are settled when a session completes

- **Date:** 2026-11-22 · **Step:** P4 task 1 · **Status:** Active · **Type:** technical

**Context.** P4 adds the Daily Kata bonus (15), the Perfect Kata bonus (+10), streak milestones (3, 7
and 30 days) and the rank-up moment. The first-incident bonus already existed but was paid inside the
answer to the last incident stage.

**Decision.** All bonuses are now paid in one place, `settleProgression` in the sessions service, which
runs when a session completes. It runs _before_ the session is flipped to `COMPLETED`, because every step
inside it is idempotent: each bonus is a ledger row under a unique key (`daily:<date>`, `perfect:<date>`,
`streak<N>:<runStart>`, `first-incident`), and the streak moves through a compare-and-set update on
`lastDailyDate`. If the server crashes halfway, the app's retry re-runs the whole thing and nothing is
lost or paid twice. Had the bonuses run after the flip, a crash would leave a completed session whose
bonuses were never paid, and the retry would just return the stored summary.

**How the streak works.** `nextStreak` is a pure function over the user's local date (`YYYY-MM-DD` in
their IANA timezone, computed with `Intl.DateTimeFormat`). Same day: no change. The day after the last
Kata: +1. Any gap: back to 1. If the stored date is _later_ than today (the user moved their timezone
west), it is also "no change", so changing timezone can never add a day. Day arithmetic is done on the
date string in UTC, so daylight-saving changes cannot shift it. The streak and the bonus keys both use the
Kata's own date. _(Amended in D-028: answers to a Kata are refused once its day ends, so an old Kata can't
be finished later to repair a broken streak.)_

**Milestones once per run.** The run start is derived (`lastDate − (current − 1)` days) instead of
stored, and keys the milestone. A new run after a break has a new start date, so it can earn the
milestones again, as `scoring.md` §3 says.

**Reporting bonuses.** The summary lists the bonuses the session earned. It does not trust "what my
own insert just did": it reads back the ledger rows for its keys created since the session started. A
parallel retry therefore reports the same list instead of zero. `xpEarned` in the summary now includes
the bonuses, so the existing XP count-up shows the true total.

**Rank-up.** Computed at completion as `level(totalXP)` vs `level(totalXP − session XP)`. A rank-up in a
different session running at the same moment could be attributed to this one; that is harmless and
not worth a stored "last seen level" field.

**Alternatives rejected.** A multi-document transaction (D-015 already chose ordered idempotent writes
over transactions). Storing `streakRunStart` on the user (derivable, so one less field to keep in sync).

**Files.** `server/src/modules/progress/{streak,progression.service}.ts`, `server/src/lib/time.ts`,
`server/src/config/game.ts`, `server/src/modules/sessions/{sessions.service,sessions.summary}.ts`,
`server/src/modules/users/users.repository.ts`, `server/src/models/Session.ts` (`dailyDate`),
`shared/src/sessions.ts` (`bonuses`, `streak`, `rankUp` on the summary).
**Concepts.** Compare-and-set (optimistic concurrency); idempotency keys; pure functions for time rules.
**Revisit if** a streak freeze is added (it would need a stored state, not just a date comparison).

### D-027 — Mastery, adaptive difficulty and the revisit queue

- **Date:** 2026-11-22 · **Step:** P4 task 2 · **Status:** Active · **Type:** technical + product

**Context.** `progression.md` §2–5 defines moon-phase mastery, per-topic adaptive difficulty, a light
revisit queue for mistakes, and the "weakest blade" recommendation. The Dojo home (task 4) needs all of
it in one call.

**Adaptive difficulty in one atomic update.** Each answer already updated the topic row with one
`updateOne`. The adaptive rule needs to read the last 5 results, decide, and maybe reset the window, which
looks like a read-modify-write. Instead it runs as a MongoDB **update pipeline**: a list of `$set` stages
that the database evaluates on the document itself, in one atomic step. Stage 1 appends the result to
`recentResults` (kept to 10) and `adaptWindow` (kept to 5); stage 2 counts the hits; stage 3 picks the new
difficulty (4–5 correct: +1, 0–2: −1, 3: same, clamped to 1–3); stage 4 empties the window only if the
difficulty changed. Two answers arriving at once are applied one after the other by the database, so no
answer is lost and the decision is never made on a stale window. When a change is blocked by the clamp
(already at 3 with 5/5), the window keeps sliding instead of resetting, because nothing changed.

**Mastery and weakest topic are pure functions** (`mastery.ts`) over the stored row, computed on read.
Storing the phase would mean keeping it in sync on every answer, and it is cheap to compute for 5 topics.

**Revisit queue.** A new `revisititems` collection, one row per missed challenge (unique on user +
challenge). A correct answer anywhere deletes the row; a miss upserts it. If the row already existed (a
revisit missed again), the same atomic pipeline sets `notBeforeDate = today + 2 days`. "At least 3 other
answers since the miss" is checked with one query: find the user's 3rd-latest answer, and an item is due
only if it was missed strictly before that. The Daily Kata also skips items missed today. Topic Practice
puts up to 1 due revisit first, marked `isRevisit`, and the summary reports `fixedMistakes`.

**Product choice: incidents are not queued.** An incident is a three-stage story; dropping one back into
a Kata as a "revisit" would cost a whole slot and replay the story. Players can replay incidents from the
incident list. Revisits are single challenges only. Revisit this if testers want missed incidents back.

**The lantern is honest.** The stored streak only changes when a Kata completes, so a run that broke still
holds its old number. `streakStatus` shows `0` with `wentOut: true` when the last Kata was before yesterday,
both in `/users/me` and in the progress view, so the app can show "Your lantern went out. Light it again
today." without guessing.

**`GET /users/me/progress`** returns rank (with XP for the current and next level, for a progress bar),
the lantern, the five moons (phase, answers, recent accuracy, difficulty), the weakest topic, and the queue
size. All reads are bounded (5 topic rows, one count).

**Alternatives rejected.** Read the row, decide in Node, write back (racy without a version guard). A
full spaced-repetition scheduler such as SM-2 (more than V1 needs; the brainstorm asked for "light").

**Files.** `server/src/modules/progress/{topicProgress.service,mastery,revisit.service,progress.service,streak}.ts`,
`server/src/models/{UserTopicProgress,RevisitItem}.ts`, `server/src/modules/sessions/{sessions.selection,sessions.service}.ts`,
`server/src/modules/users/{users.routes,users.mapper}.ts`, `server/src/config/game.ts`, `shared/src/progress.ts`.
**Concepts.** MongoDB update pipelines (atomic conditional updates); derived vs stored state; spaced repetition.
**Revisit if** difficulty bounces too often in play tests (raise the window), or the queue grows large enough
to need a cap.

### D-028 — Daily Kata as a session, review XP, baseline effect, Checkpoint

- **Date:** 2026-11-22 · **Step:** P4 task 3 · **Status:** Active · **Type:** technical + product

**The Kata is a session, not a separate "circuit".** The architecture planned a `dailycircuits`
collection holding the five challenge ids plus a link to the session. The session already stores its
challenges, their option order and now its `dailyDate`, so the circuit would only duplicate it. Instead a
unique partial index on sessions `{userId, dailyDate}` (only for `DAILY`) is the "one Kata per user per
day" guarantee. Two phones opening the app at the same moment both try to insert; the database accepts
one, the other gets a duplicate-key error and returns the winner's Kata. One less collection to keep in
sync. `GET /daily` returns `{ date, session, summary }`: building it on the first open, resuming it after,
and including the stored summary once it is finished.

**Composition.** Five slots: Trace, Bug Hunt, two Engineer's Choice, Incident (incident last, as the
climax). Up to 2 due revisits (missed before today, 3+ answers ago) take a slot of their own type. Each
other slot takes the lowest-scoring challenge of its type, where the score adds: +10 if seen, the distance
from the user's difficulty for that topic, −0.5 for a preferred topic, −0.75 for the weakest topic, +0.75
per earlier slot already from that topic (spread), and a little randomness. Because "seen" only adds a
penalty, a user who has seen everything still gets a full Kata of the least-bad options: that is the
fallback `game-modes.md` describes.

**Expiry.** `game-modes.md` says an unfinished Kata expires at the end of the local day: answers count for
mastery, but no bonus or streak. Implemented as: answering (or asking for a hint in) a Kata whose
`dailyDate` is before today is a 409 "This Kata ended at midnight". The next `GET /daily` builds today's.
So the streak can safely use the Kata's own date.

**Review XP.** A correct answer to content already earned pays 2 XP, only inside the Kata, under the key
`review:<date>:<challenge>[:stage]`. The subtle part is the retry path: a retry finds the first-correct
ledger row already there (inserted by the first try) and must not mistake it for "earned before". So
"earned before" means a ledger row created _before this attempt's timestamp_. The XP rules moved to
`sessions.xp.ts`, used by both the normal and the retry path. Baseline and Checkpoint pay nothing
(`NO_XP_SESSION_TYPES`).

**Baseline effect.** When the baseline completes, each topic's difficulty is set from its one question:
correct keeps the onboarding segment's difficulty, wrong sets 1 (`progression.md` §4). Plain `$set`s, so a
retry is harmless.

**Checkpoint (approved scope, `benchmarks.md` §1).** `POST /sessions {type: CHECKPOINT}`: one intermediate
single challenge per topic, unseen first, no XP. "Every 7 active days" is defined as every 7 completed
Daily Katas (one per local day, so each is an active day): the Nth Checkpoint needs N × 7. That rule is
computed, not stored, and can't be farmed. The progress view gets `assessments` (baseline score, latest
checkpoint score, availability, Katas to go), which is the "Baseline 2/5 → Checkpoint 4/5" learning metric.
Concurrent starts are de-duplicated by adding CHECKPOINT to the existing "one open session" index.

**Refactor.** `sessions.service.ts` was near 400 lines, so progression settlement moved to
`sessions.settle.ts` and answer XP to `sessions.xp.ts`. `createSession` is shared by `startSession` and
the Daily service.

**Alternatives rejected.** Keep `dailycircuits` (duplicate state). Let an expired Kata be finished
without bonus (more states for the app to explain, same outcome). Count "active days" from XP events by
day (a practice-only day would count, which isn't what a checkpoint window means).

**Files.** `server/src/modules/daily/*`, `server/src/modules/sessions/{sessions.service,sessions.settle,sessions.xp,sessions.selection}.ts`,
`server/src/modules/progress/{assessments.service,progression.service,progress.service}.ts`,
`server/src/models/Session.ts`, `server/src/config/game.ts`, `shared/src/{sessions,progress}.ts`, `docs/architecture.md`.
**Concepts.** Partial unique indexes as concurrency guards; deriving rules from history instead of storing
counters; timestamp-ordered idempotency.
**Revisit if** the bank grows enough that the scoring weights need tuning, or testers ask to finish
yesterday's Kata.

### D-029 — Dojo home, rank-up moment, baseline offer, Checkpoint card

- **Date:** 2026-11-22 · **Step:** P4 task 4 · **Status:** Active · **Type:** product + technical

**Dojo home.** Follows `ui-design.md` §1.3: three things only. The header holds the avatar, rank (name,
kanji, level), the lantern, and a thin XP line to the next rank. The centre is the Daily Kata: a floating
moon (±4 px float and a breathing halo, both off under Reduce Motion), the serif title (the screen's one
serif element), and the one primary button, _Begin kata_. Below it is the weakest blade card, with the five
topic moons in a row underneath, because `progression.md` §2 calls that row "the clearest possible weakest
topic display". When a Checkpoint is ready, a quiet card appears; otherwise nothing, so the screen stays
calm.

**The Kata is built on tap, not on view.** `GET /daily` creates today's Kata. Home doesn't call it on load;
it reads `doneToday` from the progress view and only calls `/daily` when the user taps. Otherwise simply
opening the app would count as "started a Kata" and make the completion-rate benchmark (≥ 85%) look worse
than it is. Once done, the button becomes the ghost _See today's result_.

**The lantern is kind.** When the server reports `wentOut`, Home says "Your lantern went out. Light it
again today." (`progression.md` §6) and shows 0, never the stale number.

**Rank-up moment.** When the summary carries `rankUp`, a full-screen layer covers the summary: full moon,
the rank's kanji, "You are now Ronin", and _Continue_, which reveals the summary underneath. It pops with a
spring (fades only under Reduce Motion) and fires the success haptic. The summary also lists the bonuses
earned, the lantern line ("Lantern lit: 3 days · your longest yet"), and "You fixed a past mistake" for
revisits.

**Baseline offer.** Onboarding sets a one-time in-memory flag. The Dojo sees it and pushes the
_One quick check?_ screen over the tabs, with _Take the baseline_ and _Skip for now_. It's pushed over the
tabs (not the first screen of a new stack) so that after the baseline's summary, _Back to the dojo_ lands
on the Dojo. The flag isn't persisted: if the app is killed at that exact moment, the offer is lost.
That's acceptable for an optional step. The baseline summary says the starting difficulty is set; the
Checkpoint summary shows "Baseline 2/5 → Checkpoint 4/5".

**Explore** now shows each topic's real moon phase. If the progress call fails, topics still render as
new moons: the moons are extra information there, not the content.

**Freshness.** Progress is a React Query key refetched whenever the Dojo or Explore regains focus, and
invalidated when a summary loads, so XP, rank and the lantern are current after every session.

**Left out (parked for P6 polish):** the petals on the summary, a dedicated Checkpoint intro screen, and
any countdown to the next Checkpoint on Home.

**Files.** `app/src/screens/dojo/*`, `app/src/screens/game/{RankUpOverlay,SummaryExtras,SummaryScreen}.tsx`,
`app/src/screens/onboarding/{BaselineIntroScreen,LevelScreen}.tsx`, `app/src/screens/explore/ExploreScreen.tsx`,
`app/src/lib/{moon,useProgress}.ts`, `app/src/navigation/*`, `app/src/store/onboarding.ts`, `app/src/api/endpoints.ts`.
**Concepts.** Measuring intent (create on action, not on view); focus-based refetching; overlay vs route for
a one-off moment.
**Revisit if** testers miss the baseline because the flag was lost, or if Home feels empty before the first
Checkpoint.

### D-030 — P4 backend review: what was fixed and what was not

- **Date:** 2026-11-22 · **Step:** P4 — backend review · **Status:** Active · **Type:** technical

One review agent read the server and shared diff of the phase. It found no AuthZ gaps and no answer-key
leaks, and confirmed that the streak compare-and-set and the Daily unique index are correct. Its findings and
what we did:

**Fixed.**

1. _A retry could leave the summary's XP short._ If an answer was recorded but the follow-up write of its
   `xpEarned` failed, the retry was refused as "already answered" before any repair ran. The summary sums
   `xpEarned` per attempt, so it would show less XP than the ledger paid. Now an already-answered submit
   first re-runs the XP award (a no-op thanks to the ledger) and writes back the XP the ledger holds for that
   attempt, then returns the same 409.
2. _The rank-up moment replayed._ The stored summary keeps `rankUp`, and reopening a finished Kata returns
   it, so the full-screen moment would fire on every _See today's result_. Replays now leave out `rankUp`.
3. _A changed index wouldn't apply to an existing database._ Adding CHECKPOINT to the "one open session"
   index changed its partial filter under the same name. Mongoose's auto-index only creates indexes, so an
   existing Atlas database would keep the old one and log a conflict. `npm run seed -w server` now runs
   `syncIndexes` for every model first, which drops and recreates indexes whose options changed. **Run the
   seed once after deploying P4.**
4. _Missing index._ The revisit rule reads a user's 3rd-latest answer; added `{userId, createdAt: -1}` on
   answer attempts so that doesn't sort the user's whole history.
5. _Constants outside config._ The Kata scoring weights and the first-incident session types moved to
   `config/game.ts`, per the project rule.

**Not fixed, on purpose.**

- _Ledger row and `totalXP` increment aren't atomic._ True since P1 and accepted in D-015 (no
  transactions). A crash in that gap leaves `totalXP` short of the ledger. Parked in `TODOS.md` with a
  reconcile fix.
- _A crash after recording an answer loses its progress/revisit update._ Also accepted in D-015: it can
  lose one update but never double-count. Replaying would need an "applied" marker per attempt. Parked.
- _A fully answered Kata completed after midnight still pays its bonus and moves the streak._ Its answers
  were all given on its own day (answers after midnight are refused), so it was played on time. The streak
  uses the Kata's date, so this can't repair a broken streak; Home still shows the true current streak.
- _`doneToday` uses `lastDate >= today`._ After moving the timezone west, Home can say "done" on a
  "yesterday" the user already played. That is the same guard that stops timezone farming, and the user
  really did play a Kata in that 24 hours. Kept.
- _Checkpoint and baseline answers still update mastery, adaptive difficulty and the revisit queue._ They
  are real answers about the user's skill, and a missed Checkpoint question is worth revisiting. Only XP is
  withheld, because XP is what would make people rush a measurement.

**Files.** `server/src/modules/sessions/{sessions.service,sessions.xp,sessions.settle}.ts`,
`server/src/modules/daily/daily.selection.ts`, `server/src/config/game.ts`, `server/src/models/AnswerAttempt.ts`,
`server/src/db/syncIndexes.ts`, `server/src/seed/seed.ts`, `TODOS.md`.
**Concepts.** Index migrations; idempotent repair on retry; known-debt vs bug.

### D-031 — P4 accepted and merged

- **Date:** 2026-11-22 · **Step:** P4 — manual review · **Status:** Active · **Type:** process

Rajdeep reviewed P4 (Dojo home, Daily Kata, streaks, bonuses, rank-up, mastery moons, revisits, baseline
offer) and accepted it with no changes. The whole phase ran on Opus at Rajdeep's request, instead of
switching models per task. P4 is marked `shipped` in `prd.md` and merged into `main` with `--no-ff`, so the
phase stays visible as one unit in history. Reminder carried forward: run `npm run seed -w server` once
against each existing database so the changed session index is rebuilt (D-030).

---

### D-032 — P5 competition: how the Dojo Board, duels, achievements and history were built

- **Date:** 2026-11-22 · **Step:** P5 — build · **Status:** Active · **Type:** product + technical

**Context.** P5 turns Luna from a solo trainer into something two people can compete in. The rules were
already approved in `docs/product/competition.md`, `scoring.md` and `progression.md`. What follows is
what the build had to decide on top of them, including a few choices the rules didn't cover.

**Dojo Board.** The weekly ranking is computed on each request from the XP ledger (`xpevents`), grouped by
user for the current UTC week. It is sorted by weekly XP, then by who reached that total first (the
earliest "last award" time), then by user id so the order is stable across pages. Pagination is an
offset cursor inside the top 50, because the list is small and the order is fully determined; a keyset
cursor would add complexity for no gain here. The caller's own row comes from the same aggregation,
so it is always consistent with the visible rows. Last week's top 3 is a second, tiny aggregation.
_Rejected:_ a stored `weeklyXP` counter on the user. It is faster but needs a weekly reset and can drift
from the ledger; the per-request aggregation is the documented first bottleneck and is fine at capstone
scale (`TODOS.md`). _Why it matters for product:_ ranking by this week's XP, not total XP, means a new user
can top the board, which keeps the board from being a veterans' club.

**Achievements.** Each of the five is checked right after a session is marked completed, using counts the
server already stores (completed sessions, correct Bug Hunt answers, completed and perfect Daily Katas).
Because the counts are cumulative, a check that was skipped by a crash is caught up next time. A unique
index on `{userId, key}` means a badge is awarded once even if two completions race. Newly earned badges
ride only on the completion response that earned them, like the rank-up, so the toast shows once.
_Assumption (not confirmed):_ "Complete 5 Incident Rooms" counts both solo incidents and Daily Katas,
because every Kata ends with an incident. If Rajdeep wants solo incidents only, it is a one-line change.

**Session history.** `GET /users/me/sessions` uses a keyset cursor (`completedAt` + id) instead of an offset,
because new sessions are added at the top while the user scrolls; an offset would skip or repeat rows.

**Duels — API shape (deviates from the P0 plan).** The plan had `POST /duels/:code/join` and a separate
`GET /duels/:id/result`. The build uses `POST /duels/join` with the code in the body (validated by Zod like
any input, and easy to rate-limit), folds the result into `GET /duels/:id`, and adds `GET /duels` for the
three tabs and `POST /duels/:id/play`. The `play` step matters: creating or joining a duel no longer starts
the 60-second clock. A player's session is created only when they tap Begin, after a confirmation that
states the rules. Otherwise someone who joins at night and plays in the morning would time out on question 1.

**Duels — fairness and integrity.**

- _Same questions, same order._ The duel stores its 5 challenges and the shuffled option order once; both
  players' sessions are built from that copy.
- _Join race._ Joining is one conditional update (`status OPEN, no opponent, not the creator, not expired`), so
  when two people use one code at the same moment exactly one gets in. The other is told "This duel is
  already taken". A second tap by the person who did join just returns their duel.
- _Timer on the server's clock._ The app shows a 60 s countdown, but the server decides: an answer that
  arrives more than 60 s + 5 s grace after the previous one is a timeout (wrong, recorded as exactly 60 s),
  whatever the client sends. The grace absorbs network latency. To show the real time left after the app
  is reopened, the session view includes `stepElapsedMs`, measured by the server, so the phone's clock
  can't skew it.
- _No feedback sheet in duels._ The server's clock for the next question starts at the previous answer, so
  time spent reading an explanation would come out of the next 60 seconds. Duels show a short ✓/✗ stamp and
  move on by themselves; explanations are left to practice. This also fits "pressure belongs in duels".
- _Expiry without a background job._ Every read of a duel settles it if it is due. _Assumption beyond the
  spec:_ the spec says the creator wins if the opponent joined but didn't finish. The build generalises this
  to "whoever finished in time wins by default", in either direction, and if nobody finished the duel just
  expires. A default win pays **no** win bonus, so an idle second account can't farm the bonus.
- _Win-bonus cap._ The 10 XP bonus is capped at 3 per local day. Instead of counting and then paying (which
  two simultaneous wins could both pass), the bonus uses three ledger keys per day, `duelwin:<date>:1..3`. The
  ledger's unique index hands each slot out once, so the cap is enforced by the database. A claim flag on the
  duel makes the bonus once per duel. This replaced the planned key `duelwin:<duelId>`, which could not express
  a daily cap.
- _Open-duel limit._ Max 5 live duels per creator is a count followed by an insert, so two simultaneous creates
  could make a sixth. That only weakens a spam guard, so it is accepted rather than adding a counter.
- _Code guessing._ Codes have 32^6 (about a billion) values, and join is limited to 30 tries per 15 minutes per IP.

**Known limitation (accepted).** `GET /sessions/:id` returns all 5 duel questions at once (it is the same
endpoint every mode uses). A player who inspects the network traffic could read question 5 while the clock runs
on question 1. Hiding future questions would need a per-step endpoint; for friend duels this is not worth it now.

**UI.** Duel tab (start and share a code, join by code, Your turn / Waiting / Finished), Duel Result (avatars
slide in, then the score; per-question ✓/✗ and times; Rematch), Dojo Board (pinned own row, last week's medals,
reset countdown) with a "weekly rank" card on the Dojo home, and the real Profile (rank, XP, streaks, the five
achievements with locked ones dimmed, paginated history, log out). Sharing uses React Native's built-in `Share`
sheet, so no new dependency.

**Files touched.** Server: `modules/leaderboard/*`, `modules/achievements/*`, `modules/duels/*`,
`modules/sessions/{sessions.history,sessions.service,sessions.settle,sessions.evaluator,sessions.selection}.ts`,
`models/{Duel,UserAchievement,Session}.ts`, `config/game.ts`, `middleware/{validate,rateLimit}.ts`, `lib/time.ts`.
Shared: `competition.ts`, `sessions.ts`. App: `screens/{duel,board,profile}/*`, `screens/dojo/BoardPreview.tsx`,
`screens/game/{DuelCountdown,DuelVerdict,SessionScreen,SummaryScreen,SummaryExtras,useAnswerFlow}.tsx`.

**Concepts worth learning.** _Conditional updates as locks:_ `findOneAndUpdate` with the expected state in the
filter is a compare-and-set; only one caller can win. _Lazy expiry:_ instead of a scheduler, state is brought up
to date whenever it is read, which is simple but means every read path must call the settle step. _Using unique
indexes to enforce limits:_ turning "max 3 per day" into three unique keys moves a race-prone count into the
database. _Keyset vs offset pagination:_ keyset stays correct while rows are being added.

**Revisit if** the board gets slow (cached weekly counter), duels go public (hide future questions, stronger code
limits), or Rajdeep wants a different reading of "Incident Commander" or the forfeit rule.

---

### D-033 — P5 backend review: what was fixed

- **Date:** 2026-11-22 · **Step:** P5 — backend review · **Status:** Active · **Type:** technical

One review agent read the server and shared diff of the phase. It found no AuthZ gaps (duels and their sessions
404 for non-participants), no answer-key or email leaks, and confirmed the join race, the double-play guard, the
win-bonus cap and both cursors. It raised three findings, all fixed:

1. _High — a finish after the deadline could still count._ Expiry is applied when a duel is read, so a duel could
   still say `ACTIVE` after 48 hours. If the opponent answered in time but tapped "Finish" after the deadline,
   before anyone opened the duel, their score was written and they could win; if someone had opened it first,
   the creator would have won by default. The outcome depended on read timing. Now a score is only written
   while `expiresAt` is still in the future, so a late finish never counts. A regression test covers it.
2. _Medium — the expiry step could act on a stale copy._ The forfeit decision used the document the caller had
   read earlier. If the other player's score landed in between, the forfeit could overwrite a real result. The
   expiry updates are now guarded in the database on the other side's score still being empty; if the guard
   fails, the duel is re-read and settled as played.
3. _Medium — the winner's summary could miss the bonus._ When two settles ran at once, the one that lost the
   bonus claim could read the duel before the winner's amount was written and report 0, although the ledger paid 10. The payer now also sets `winBonusSettled`, and the winner's completion waits briefly (up to about 0.5 s)
   for it before building the summary.

Full API suite after the fixes: 55 tests, all passing.

---

### D-034 — P5 accepted and merged

- **Date:** 2026-11-22 · **Step:** P5 — manual review · **Status:** Active · **Type:** process

Rajdeep tested P5 (Duel tab, duel play and result, Dojo Board, Profile, achievements) and accepted it with no
changes. The assumptions in D-032 (forfeit in both directions with no bonus, Incident Commander counting Daily
Katas, no feedback sheet in duels) stand as built. P5 is marked `shipped` in `prd.md` and merged into `main`
with `--no-ff`. Reminder carried forward: run `npm run seed -w server` once against each existing database so
the new duel and history indexes are built. Next is P6: deploy, polish and demo prep.

---

### D-035 — P6 (part 1): consistency pass and README, deploy deferred

- **Date:** 2026-11-22 · **Step:** P6 — polish · **Status:** Active · **Type:** process + technical

**Context.** Rajdeep is away from the Mac, so P6 is split. This part covers what doesn't need a
deploy: a consistency pass over the codebase, small fixes, and the README. Deploy (P6 task 1), the
network-failure pass on a real Render instance, and the acceptance run with two accounts wait
until he's back. Nothing was deployed.

**What the consistency pass found and changed.**

- _Magic numbers left in code._ Rate limits moved into `config/security.ts` next to the auth
  constants. Selection weights, the duel topic-repeat penalty and the win-bonus wait moved into
  `config/game.ts`. The 60-second duel timer now lives once in `shared/` and is imported by both the
  app and the server, so the countdown on screen and the server's rule can't drift apart.
- _Duplicated code._ Two copies of `shuffle` became one in `server/src/lib/random.ts`. It uses
  `crypto.randomInt`, matching the duel-code generator.
- _A PRD gap._ F-24 asks the Profile to show per-topic answers, accuracy and moon-phase mastery. The
  P5 Profile didn't, so a Topics section was added.
- _Copy that was wrong in duels._ "Leave session? You can pick it up later" hid the fact that the
  duel clock keeps running on the server. Duels now say so.
- _Docs that described the plan, not the build._ In `architecture.md`, the folder tree (no
  `features/` folder, no controller layer), the rate limits (no per-user write limit exists), the
  list envelope, the cold-start timing and the test setup were all corrected to match the code.
- _Checked and fine._ No `process.env` outside the config modules, no unused files, no stray logs,
  and every pressable has an accessibility role and label.

**README.** Written as the project's front page for a reviewer or recruiter: the problem, the four
modes and the progression systems, the architecture with two diagrams, setup in four steps, the
config and API tables, and an "engineering notes" section on the integrity design (answer keys,
the XP ledger, idempotency, the duel join race, the server clock). Every claim was checked against
the code. Where a claim didn't hold (account lockout has no test; Expo web isn't installed), it was
removed rather than left in. It states openly that the API tests are local and gitignored, and
that deployment isn't live yet.

**Files touched.** `README.md`, `docs/architecture.md`, `server/src/config/{game,security}.ts`,
`server/src/lib/random.ts`, `server/src/middleware/rateLimit.ts`, the session and duel selection,
service and settle modules, `shared/src/competition.ts`, `app/src/screens/profile/ProfileScreen.tsx`,
`app/src/screens/game/{SessionHeader,SessionScreen,DuelVerdict}.tsx`, `app/src/lib/session.ts`.

**Still to do in P6:** deploy to Render and Atlas prod and seed it; the network-failure pass (airplane
mode, cold start, token expiry); the full acceptance checklist with two accounts; the demo script and
metrics script.

---

### D-036 — API deployed to Render, production database seeded

- **Date:** 2026-11-22 · **Step:** P6 — deploy · **Status:** Active · **Type:** infra

Rajdeep created the Render web service (`https://luna-kloi.onrender.com`) from `main` with the settings in
`architecture.md` §14: repo root as the root directory, `npm ci --include=dev && npm run build -w server`,
`npm run start -w server`, health check `/api/v1/health`. The production database `luna_prod` on Atlas was
seeded. Before the deploy, the production build was run locally with `NODE_ENV=production` to prove the
bundle starts and reaches the database.

**Verified on the live API:** health reports the database as connected; protected routes return 401
without a token; helmet's security headers (CSP, HSTS) are present; a practice session builds 5 items and
the response contains no answer keys. That check used one throwaway account, `smoke_p6`
(`smoke-p6@luna.test`), which has 0 XP and does not appear on the Dojo Board. Delete it from `luna_prod`
before the demo if a clean user list matters.

**App.** `app/.env` now points at the Render URL. The previous LAN value is kept in the gitignored
`app/.env.local-dev.bak`, so local development is one copy away.

**Why this order.** The API went live from `main` (P5) before the P6 branch was merged. The P6 changes are a
refactor, docs and two small UI fixes, so the live API behaves the same; they reach Render automatically when
P6 is merged.

---

### D-037 — Change of direction: Luna becomes a brain game for engineers

- **Date:** 2026-11-22 · **Step:** P7 — product direction · **Status:** Active · **Type:** product

**Context.** After using the deployed app, Rajdeep judged the UI "full AI slop": too much text, too much
empty space, no icons on the tab bar (they were hidden in `MainTabs.tsx`), an unstyled tap ripple, almost no
motion, and no feeling of a game. The Profile read like a report card (topic accuracy), and Explore led
straight into a quiz with no choice of how to play.

**Decision (Rajdeep, in chat).**

1. **Positioning: full shift to a game.** Luna is a gamified brain game that engineers play to pass time, like
   Elevate or Peak but for engineering. Players still learn from the explanations, but nothing should look or
   feel like studying. The Profile shows the player (rank, XP, streak, achievements, duel record), not topic
   accuracy. The PRD will be updated to match.
2. **Explore, in two steps.** Now (P7): picking a topic opens a choice of game modes (Trace, Bug Hunt,
   Engineer's Choice, Incident Room), each presented as a game with its own identity. Next (P8): new mini-games
   such as a 60-second blitz or a swipe true/false round, which need new content.
3. **Duel formats now.** Duels get several formats instead of one (for example Classic, Blitz and Sudden Death).
   This needs new server rules and UI.
4. **Design system first.** Before any screen is rebuilt, a design consultation locks a Japanese-dojo visual
   system (icons, illustration, motion, text density) with previews Rajdeep approves.

**Rejected.** A hybrid that keeps a skills view; keeping the learning focus; one improved duel with formats
parked; rebuilding screens without a design step. The last one was rejected because it is how the current
UI ended up text-heavy.

**What this changes.** New phases: P7 (game redesign, building) and P8 (new mini-games, todo). P6's remaining
tasks (demo and metrics scripts, acceptance run) move to after P7, since the demo should show the new design.

**Lesson worth keeping.** A game spec is not enough. The earlier phases checked behaviour ("does it work")
against a checklist but never checked feel ("does it look and play like a game"). From P7 on, every screen is
judged against the approved design previews, not only against a functional checklist.

---

### D-038 — Design system: Kiri-e Den

- **Date:** 2026-11-22 · **Step:** P7 — /design-consultation · **Status:** Active · **Type:** product + design

**Context.** After D-037 (Luna becomes a game), the visual system had to be redone before any screen was rebuilt.
Rajdeep's "one thing to remember": a tired engineer comes home after a long day and, instead of reels, opens
Luna. It feels like a real game, they are the samurai of code, and the Dojo is their den where the master has
come home to rest.

**How it was decided.** Competitive research was declined (the real UIs of Elevate, Peak or Duolingo live
inside their apps, not on their websites). I drafted a direction, and an independent agent proposed its own from
the same brief without seeing mine. Codex wasn't installed, so it was the only outside voice. Both landed on a
warm dark ground, Dela Gothic One, vermilion seals and a home screen that is a room. From the second proposal I
adopted the kiri-e (flat cut-paper) style and the ensō instead of progress bars. The AI mockup tool had no image
API key, so Rajdeep approved an HTML preview of the Dojo, Explore, Duel and Profile instead.

**Decision.** `DESIGN.md` (open spec format) is now the design source of truth, with the approved preview at
`docs/design/kirie-preview.html`. `docs/product/ui-design.md` is marked superseded. In short:

- **Look:** every screen is a stage of 3–4 flat cut-paper layers lit warm from inside. No cards on the main
  screens, no glows or gradients, one line of copy per element.
- **Dojo is a room:** the lantern is the streak, the hanging scroll is the rank with an ensō for XP, the ema
  plaque is the weekly rank, and the sealed scroll on the low table is the Daily Kata.
- **Palette:** persimmon brown (`#3B2418`) with tatami and lacquer woods. Washi text. **Amber** (`#F2A93B`) is the
  only action colour. **Vermilion** (`#D9442B`) is for seals only. Night blue appears only through windows.
- **Type:** Dela Gothic One for the game voice, Source Sans 3 for questions and UI, JetBrains Mono for code.
  Brush kanji are baked to SVG.
- **Motion:** six authored moments (coming home, unrolling the kata, the hanko strike, the lantern relight, the
  rank-up, the duel face-off), each with a Reduce Motion fallback.

**Alternatives rejected and why.**

- _Vermilion buttons:_ washi text on vermilion is only 3.5:1, below the readability bar. Amber with dark text is 8.4:1.
- _Zen Kaku Gothic New for body text, and loading a brush font:_ 12 MB and 8.6 MB. Too heavy for Expo Go when only
  about 20 brush glyphs are needed.
- _Generated woodblock-style art (my first draft):_ hard for one person to keep consistent and to edit. Flat SVG
  cut paper is producible, crisp at any size, and animatable.
- _The old navy and pale-gold system:_ it was the rejected UI.

**Concepts worth learning.** _Diegetic UI:_ information shown as objects inside the game world (a lantern instead
of a "streak: 4" label), the way games such as Dead Space show health on the character. _Use-scene-driven
theming:_ light or dark comes from where and when the app is used (at night, at home), not from the category.
_Contrast ratios:_ WCAG asks for 4.5:1 for body text; a brand colour can fail that for text and still be fine for
large shapes.

**Process notes.** Tool limits hit during the consultation, logged so the next attempt doesn't trip on them:

- The gstack self-upgrade (v1.99.3.0 → v1.102.2.0) and a local server for screenshots were both blocked by the
  permission classifier.
- The headless browser can't open files outside `/private/tmp` and the repo.
- The mockup tool needs an `OPENAI_API_KEY` or `GEMINI_API_KEY`.

**Next.** Plan the P7 rebuild against `DESIGN.md`: the tab bar, Dojo, Explore mode picker, Duel with formats
(server rules too), Profile, challenge, feedback and summary.

---

### D-039 — P7 engineering plan: rebuild on a scene and art kit, plus duel formats and mode rounds

- **Date:** 2026-11-23 · **Step:** P7 — planning · **Status:** Active · **Type:** technical + product

**Context.** P7 rebuilds the app to the approved Kiri-e Den system (D-038) and adds the server features the new
screens need. The full plan, with its eleven tasks, is in `docs/build-plan.md` under P7.

**Decisions made with Rajdeep.**

1. **Thin content: top up mode rounds from other topics.** Per topic, a mode has only 1–7 questions; Caching &
   Queues and Debugging & Production have one Trace question each. A topic + mode round therefore takes that
   topic first and fills to 5 with the same mode from other topics, each question labelled with its topic.
   _Rejected:_ short rounds (some would be a single question) and repeats (they feel like the game ran out).
   _Revisit_ when P8 grows the bank.
2. **Sudden Death:** up to 10 questions, 30 s each, and the run ends at your first miss. Score = correct answers
   before the miss; a tie goes to lower total time. _Rejected:_ endless runs (too long for a quick evening game)
   and a fixed 5 (too close to Classic). Blitz is 10 questions at 10 s, with a 2 s network grace instead of 5 s,
   because 5 s of grace would be half the timer.
3. **A checkpoint after the Dojo and one game round** (task 4), before the rest of the app is rebuilt, because
   the last UI was rejected only after all of it was built.

**Technical choices.**

- _Theme swap with temporary aliases:_ old token names point at the new values, so the app keeps compiling while
  screens move over one at a time. Deleting the aliases at the end makes `tsc` list anything missed.
- _Brush kanji baked to SVG paths_ by a dev-only script using `opentype.js`. This is a devDependency of the app
  workspace and is never bundled. It is the simplest way to turn font glyphs into path data, and it avoids
  shipping an 8.6 MB brush font for ~30 glyphs. The generated file is committed, so the build never needs the
  script.
- _Art as `react-native-svg` components on a shared 390-wide grid,_ with interactive objects as positioned
  pressables. This keeps the scenes accessible and scalable. _Rejected:_ PNG art, which is not editable or
  animatable and is blurry on scaling, and Lottie, a new dependency and tool chain for six moments that
  Reanimated already covers.
- _Sudden Death in the session model:_ an `endedEarly` flag lets a session complete with fewer answers. This is
  the only change to the completion rule, and it is limited to DUEL sessions in that format.
- _Profile stats from counts on existing collections,_ with no new writes or counters.

**New dependencies.** `@expo-google-fonts/dela-gothic-one` and `@expo-google-fonts/source-sans-3` (fonts, D-038).
`opentype.js` (dev only, the kanji bake). `@expo-google-fonts/shippori-mincho` and `@expo-google-fonts/inter` are
removed.

**Concepts worth learning.** _Strangler-style migration of a design system:_ aliases let old and new coexist until
the last caller moves. _Build-time code generation:_ turning a big asset (a font) into a small, typed data file
(only the glyphs you need) at development time instead of at runtime.

### D-040 — P7 checkpoint feedback: the Dojo entrance and the correct-answer "cut"

**Context.** At the P7 checkpoint (after task 4) Rajdeep approved the Dojo and the game round and asked for two
things: the room should come alive every time you return to it, and a correct answer should feel like a samurai
win, not a lesson. He also approved the rest of P7 without another checkpoint.

**Decision.**

1. _Dojo entrance (DESIGN.md motion 7)._ Each object enters in its own way: the rank scroll unrolls downward, the
   lantern drops on its cord and swings to rest, the ema sways on its peg, the mask rises onto its stand and the
   kata scroll settles. The entrances are staggered over about 900 ms. They replay whenever the Dojo tab gains
   focus or the app returns to the foreground, so the room greets you every time and not only on the first
   launch.
2. _The cut (motion 8)._ A correct answer no longer opens the feedback sheet. An ink slash crosses the screen,
   見事 ("migoto", splendid) is brushed in, a 正 seal strikes, a short line ("Clean cut.") appears and the XP
   counts up. Two buttons follow: Next, and "Why it works", which opens the usual shoji sheet with the
   explanation already unfolded. A wrong answer still opens the sheet straight away, because there the right
   answer is the useful thing to show.

**Alternatives rejected.** A confetti-style burst (generic, and not Japanese). Auto-advancing after the
celebration (the player loses the chance to read the explanation, and a timer feels like pressure in a "time
pass" game). Playing the entrance only once per launch (the feedback asked for it on every return).

**How it works.** `Entrance` (app/src/screens/dojo/Entrance.tsx) wraps one object and drives a Reanimated shared
value per kind. Its `playKey` comes from `useEntranceKey`, a counter bumped by `useFocusEffect` and by `AppState`
turning `active`. `transformOrigin: 'top'` makes the scroll unroll and the lantern and ema swing from where they
hang. `CorrectCelebration` reveals the slash and the brushed kanji by animating the width of a clipping view, the
same trick as the rank-up. SessionScreen holds one `explain` flag that swaps the celebration for the sheet and
resets on the next question. Three glyphs (見 事 斬) were added to the kanji bake. Reduce Motion shows everything
at once; haptics stay.

**Files.** `app/src/screens/dojo/Entrance.tsx`, `DojoScreen.tsx`, `app/src/screens/game/CorrectCelebration.tsx`,
`SessionScreen.tsx`, `FeedbackSheet.tsx` (`startOpen`), `app/scripts/bake-kanji.mjs`, `app/src/art/kanjiPaths.ts`,
`DESIGN.md` (motions 7 and 8).

**Concepts worth learning.** _Focus-driven animation:_ in a tab app, screens stay mounted, so "on mount" plays
only once. Tie replays to focus and app-state events instead.

**Revisit** if the entrance starts to feel slow on the tenth visit of a day. One option is a shorter variant after
the first play of the day.
