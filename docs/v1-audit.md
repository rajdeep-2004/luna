# V1 audit — 2026-11-23

An end-to-end check of V1 against the brainstorm's acceptance criteria (`luna-idea.md` §20) and the PRD
features (`prd.md` §5), after P7 was merged into `main`.

**How it was checked**

- Static checks: `npm run typecheck` and `npm run lint` are clean in all three workspaces.
- Build: `npx expo export --platform android` builds the app bundle.
- API: **66/66** smoke tests pass over real HTTP against an in-memory MongoDB (`.scratch/api-tests/`).
- Production: `GET https://luna-kloi.onrender.com/api/v1/health` returns `200 {"status":"ok","db":true}`.
- Content: 58 hand-written items (13 Trace, 13 Bug Hunt, 24 Engineer's Choice, 8 Incident Rooms) across
  5 topics.

**What was not checked here**

- The app on a real phone: that is Rajdeep's click-through, listed at the end.
- Writes to production: no test account was created there, so the production data stays clean.

## Acceptance criteria (luna-idea.md §20)

| #   | Criterion                                       | Status                           | Evidence                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Register and authenticate                       | ✅                               | `auth.test`: register, login, duplicate checks, identical errors for a wrong password and an unknown email, lockout after 5 failures (`review-fixes.test`); JWT in SecureStore; a 401 signs the user out (`app/src/api/client.ts`)                                                                                        |
| 2   | Select topics and take an initial assessment    | ✅                               | Onboarding: mask, topics, level; optional baseline (`auth.test` "completes onboarding", `daily.test` baseline effect, `review-fixes.test` one baseline under a race)                                                                                                                                                      |
| 3   | Access the five topics                          | ✅                               | `sessions.test` "lists topics in order"; Explore banners; mode rounds (`modes.test`)                                                                                                                                                                                                                                      |
| 4   | All four challenge formats work                 | ✅                               | Trace, Bug Hunt (numeric line compare), Engineer's Choice and a 3-stage Incident (`sessions.test`, `review-fixes.test`)                                                                                                                                                                                                   |
| 5   | Every answer is evaluated and explained         | ✅                               | `AnswerResult` carries the verdict, explanation, misconception and option feedback; no answer key before answering (`sessions.test`)                                                                                                                                                                                      |
| 6   | A five-question daily circuit can be completed  | ✅                               | Daily Kata: one per day under concurrent opens, bonuses paid once, the result on reopen (`daily.test`)                                                                                                                                                                                                                    |
| 7   | XP and streaks update and persist               | ✅                               | The XP ledger pays once; streak start, extend, reset, milestones and time zones (`progression.test`, `daily.test`)                                                                                                                                                                                                        |
| 8   | Topic progress updates after each attempt       | ✅                               | Atomic per-topic update, mastery phases, adaptive difficulty (`mastery.test`)                                                                                                                                                                                                                                             |
| 9   | Missed questions come back                      | ✅                               | Revisit queue: a miss returns after 3 answers and is removed when fixed (`mastery.test`); "fixed a past mistake" on the summary                                                                                                                                                                                           |
| 10  | Weekly leaderboard from stored activity         | ✅                               | Ranking, tie-break, pagination, pinned own row, last week's top 3 (`board.test`)                                                                                                                                                                                                                                          |
| 11  | Two users in the same async duel                | ✅                               | Join race, shared set and order, timer, tie-break, expiry and forfeit, bonus cap (`duels.test`); three formats (`formats.test`)                                                                                                                                                                                           |
| 12  | Session state and graceful API/network failures | ⚠️ code done, phone pass pending | Code: the server holds the session position, so resume is exact; the client times out at 15 s, retries GETs with backoff, shows "Waking the dojo…" after 4 s, has error states with retry on every screen and signs out on a 401. **Still to do: the manual airplane-mode / cold-start / expired-token pass on a phone.** |

## PRD features: deliberate changes from P7

P7 (D-037) repositioned Luna as a game and, at Rajdeep's request, took topic knowledge out of the UI
("profile should show level/XP/streak in a gamified way, no topic knowledge"). The server still computes all
of it, so these are presentation changes, not lost functionality:

| Feature                         | PRD text                                                      | Now                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| F-03 Home                       | Greeting, topic progress, weakest topic, recommended practice | The Dojo room: rank scroll, lantern streak, kata scroll, ema weekly rank, Checkpoint letter. No weakest-topic card. |
| F-04 Explore                    | Topic cards with a mastery label                              | Topic banners with three modes and a boss; no mastery label                                                         |
| F-12 Summary                    | Per-topic performance                                         | Grade seal, XP and streak; weak topics become "Train again" buttons; the per-topic table is gone                    |
| F-21 Weak-topic recommendations | Shown on Home                                                 | Computed by the API (`weakestTopic`) and used by the Daily Kata selection; surfaced as "Train again" after a round  |
| F-24 Topic statistics           | Per-topic accuracy and moons on the Profile                   | Removed from the Profile (warrior sheet instead); still in `GET /users/me/progress`                                 |

**Resolved 2026-11-23:** Rajdeep approved rewording these PRD rows (and F-18 for the duel formats) to match what
is built.

## Open items before V1 is called done

1. **Production seed** after the P7 deploy: `npm run seed -w server` with the production `MONGODB_URI`
   (D-041). This replaces the open-practice unique index.
2. **Network-failure pass on a phone** (criterion 12): airplane mode mid-round, a cold start after
   15 minutes idle, and an expired or deleted token.
3. **Acceptance click-through with two accounts** against production, following the demo script in the
   README.
4. **Metrics script** (PRD §8: activation, Kata completion, duels created and completed).
5. Mark P6 shipped.

## Risks noticed

- **Thin mode pools.** There are 13 Trace and 13 Bug Hunt items in total, so a Trace round in one topic
  holds about 2–3 of its own and is topped up from other topics. This works as designed (D-041), but a
  bigger question bank is still the first post-V1 priority.
- **Blitz with Engineer's Choice.** 10 s is tight for long option text; one slot in three is Engineer's
  Choice (D-043, revisit after play).
- **Free-tier cold start.** The first request after idling takes about 30 s; the app says so instead of
  failing.
