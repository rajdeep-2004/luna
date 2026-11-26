# Luna V2 — Plan

> Written 2026-11-26 from Rajdeep's V2 brief (decisions.md D-047). Phase status lives in `docs/prd.md` §9.
> Each phase has its own task file in `docs/v2/phases/`. Every phase follows `docs/v2/runbook.md`.

## 1. The outcome Rajdeep asked for

1. **A much larger, better question bank** with questions written separately for beginner, intermediate
   and advanced players, each held to that level's benchmark (§3).
2. **No two players get the same questions.** Two friends who start a Daily Kata (or the same practice round)
   on the same day get different sets. Reopening your own Daily Kata the same day still returns your set.
3. **Live duels.** No async duels and no 48-hour play window. A player challenges a friend, the friend joins
   at that moment, and both play the same question at the same time. Each question has a timer. When both
   have answered, or when the timer reaches zero, both move to the next question together.
4. Built in phases, each one tested and merged into `main` without a PR, with a fresh context per phase.

## 2. Phases

| Phase | Branch | What it delivers |
|---|---|---|
| P8 | `phase/p8-v2-plan` | This plan, the runbook, the phase files and the phase-runner script |
| P9 | `phase/p9-selection-variety` | Level rubric, content audit tool, per-player randomised selection for Daily Kata, practice, incidents and duels |
| P10 | `phase/p10-bank-js-http` | Question bank: JavaScript async + HTTP & APIs (54 singles + 4 incidents per topic) |
| P11 | `phase/p11-bank-db-cache` | Question bank: Databases + Caching & queues |
| P12 | `phase/p12-bank-debug` | Question bank: Debugging production, and the full-bank audit |
| P13 | `phase/p13-live-duel-server` | Live duel backend: Socket.IO, server-authoritative state machine, timers, reconnects, recovery |
| P14 | `phase/p14-live-duel-app` | Live duel app: lobby, synced play screen, reveal, result, reconnect states |
| P15 | `phase/p15-v2-hardening` | Full regression, docs synced to the build, README, version 2.0.0 |

The old P8 ("new mini-games for Explore") moves to P16 and stays `todo`; it is not part of this run.

## 3. Level benchmarks (the bar every question is written to)

`difficulty` in the bank stays 1 / 2 / 3 and maps to the three levels shown to players.

| Level | Who it is for | What a question at this level tests | What it must not be |
|---|---|---|---|
| **1 Beginner** | 1st–2nd year CS student who has written small programs | One concept, applied directly: read short code (≤ 8 lines), recognise the classic mistake, pick the obviously right tool once you know the concept | Trivia, a definition quiz, or a trick that hinges on syntax |
| **2 Intermediate** | Intern / junior engineer who has shipped a small web app | Two concepts interacting (e.g. await inside a loop + error handling; an index + a sort order); a realistic code path (8–15 lines); a trade-off with one clear winner under stated constraints | A question a beginner gets right by pattern-matching keywords |
| **3 Advanced** | Mid-level engineer, a senior-interview question | Edge cases and production subtleties: ordering guarantees, isolation anomalies, cache stampedes, backpressure, idempotency under retries, partial failure; trade-offs where two options are plausible and the scenario's constraint decides | Obscure API trivia or a question whose answer is "it depends" without the scenario saying on what |

Rules for every question (enforced by the content audit in P9 where a rule can be checked by code):

- **Distractors are real misconceptions**, each one something a player at that level actually believes. No joke options.
- **No length tell:** the correct option is not systematically the longest. Correct-answer positions are spread across a–d.
- **Explanations teach:** why the answer is right, and (Engineer's Choice) why each other option is worse, in plain English.
- **Code is correct except for the intended bug or behaviour**, and runs as described on current Node / Postgres / Redis.
- **Bug Hunt has exactly one buggy line**, and the answer key is that line number.
- Each question has a unique slug and a distinct scenario. No near-duplicates (same snippet with renamed variables).

## 4. Content targets

Per topic (5 topics): 3 single types (Trace, Bug Hunt, Engineer's Choice) × 3 levels × **6 questions** = 54 singles,
plus **4 incidents** (1 beginner, 2 intermediate, 1 advanced). Total: **270 singles + 20 incidents = 290** (V1 had 58).
Existing V1 questions are kept where they meet the benchmark (re-levelled if needed) and count toward the target.

Why 6 per cell: a Daily Kata slot for one player draws from about 30 candidates (6 per topic × 5 topics at the player's
level), so two players with the same profile share a given slot with probability ≈ 1/30, and share the whole set almost never.

## 5. Selection variety (P9)

Today's selection scores candidates and takes the best one with a small jitter, so two players with the same profile and
history get nearly the same set. V2 replaces "take the best" with **weighted random sampling** among eligible candidates:

- Hard filters first: active, right type, not already in this set, not seen recently when unseen ones exist.
- Weight = `exp(-score / temperature)` from the existing score (difficulty distance, preferred/weak topic, topic spread).
  Lower temperature → stricter; the value lives in `server/src/config/game.ts`.
- The random source is `crypto.randomInt`-based, and selection takes an injectable RNG so tests can be deterministic.
- The Daily Kata stays stored per user and day, so reopening returns the same set (unchanged guarantee).
- Duels pick once per duel; both players share that set, and two different duels differ.

## 6. Live duels (P13 + P14)

**Transport:** Socket.IO (server `socket.io`, app `socket.io-client`, WebSocket transport only). Works in Expo Go and on
Render. Rejected: HTTP polling (latency and wasted requests; "both move together" needs pushes); raw `ws` (we would
rebuild reconnects, acks and rooms by hand).

**State machine (server-authoritative, persisted on the Duel document):**

```
LOBBY ──opponent joins──▶ READY ──both connected──▶ COUNTDOWN (3 s) ──▶ QUESTION i ──both answered or deadline──▶ REVEAL i (3 s)
  │                                                                                                     │
  │ creator cancels / lobby TTL (10 min) / creator gone 60 s                                            ├─ more questions ─▶ QUESTION i+1
  ▼                                                                                                     └─ last / sudden-death decided ─▶ COMPLETED
CANCELLED                       a player gone > reconnect grace ─▶ COMPLETED (FORFEIT)      both gone ─▶ ABANDONED
```

Key rules:

- **No play window.** The only timeouts are the invite (lobby TTL) and each question's timer. There is no 48 h expiry.
- **The server owns time.** Each question stores `questionStartedAt` and `deadlineAt`. The client shows a countdown from
  the server's `deadlineAt` corrected by a measured clock offset. Answers are accepted only for the current question index
  and only until `deadlineAt + networkGraceMs` (small, e.g. 750 ms). Response time is measured on the server.
- **Idempotent answers.** One answer per (duel, player, question index), enforced by a unique index; a repeat submit returns
  the stored result. Socket events carry an ack so the client knows its answer landed.
- **Advance exactly once.** Moving to the next question is a conditional update (`currentIndex = i AND phase = QUESTION`),
  so a deadline timer and a "both answered" event racing each other cannot skip or double-advance.
- **Answer key never leaves the server** until the REVEAL of that question.
- **Disconnects.** A player who drops keeps their seat for `reconnectGraceMs` (20 s); missed questions count as timeouts.
  On reconnect the server sends a full snapshot. Past the grace the opponent wins by forfeit; both gone → ABANDONED, no XP.
- **Server restarts.** State is in Mongo, so on boot a recovery step reloads in-flight duels and re-arms their timers
  (or ends them when the deadline passed long ago).
- **Formats** keep their per-question timers: Classic 5 × 60 s, Blitz 10 × 10 s, Sudden Death up to 10 × 30 s. In live
  Sudden Death the duel ends at the first question where exactly one player is wrong; if both miss, play continues.
- **Winner:** more correct answers; tie → lower total server-measured response time; still tied → draw. Win bonus rules
  (10 XP, max 3 per day, paid once) are unchanged.
- **Limits:** one open lobby per user; socket events are rate-limited per connection; the JWT is checked in the handshake,
  and only the two participants can join a duel's room.
- **Scaling note:** one Render instance owns all timers. To run several instances: the Socket.IO Redis adapter plus a lease
  field on each duel so exactly one instance drives its timers (logged in `architecture.md`, not built).
- **Old async duels:** a one-off migration in the seed/boot path marks V1 `OPEN`/`ACTIVE` duels as `EXPIRED`; finished
  ones stay in history.
