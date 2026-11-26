# Benchmarks

"Benchmark" means three different things for Luna. Each gets its own section:
1. **Skill benchmarks:** how we measure that a *user* improved.
2. **Product benchmarks:** the targets that tell us the *product* works.
3. **Competitor benchmark:** how Luna compares with what already exists.

## 1. Skill benchmarks (user improvement)

| Benchmark | When | Contents | What it gives |
|---|---|---|---|
| **Baseline** | End of onboarding (skippable) | 5 beginner questions, one per topic, no XP | The starting difficulty per topic, and a "before" score |
| **Checkpoint** *(proposed, new scope)* | Offered on Home after every 7 active days | 5 **intermediate** questions, one per topic, chosen from ones the user **hasn't seen**, no XP | An "after" score: "Baseline 2/5 → Checkpoint 4/5" |
| **Revisit accuracy** | Ongoing | Accuracy on previously missed challenges | Shows whether explanations actually teach |

**Why Checkpoint:** the brainstorm's learning metric ("improvement between baseline and a later
assessment", §19) can't be measured without a second assessment. It's small to build, because it
reuses the Baseline session type with a different selection rule. **It's new scope, though, so it
needs your approval.** Without it, we can only report revisit accuracy.

The Checkpoint can't be gamed: it uses unseen questions, gives no XP, and can only be taken once
per 7-day window.

## 2. Product benchmarks (does Luna work?)

Targets for the usability test with 8–10 CS students (from the brainstorm §19, made measurable):

| Area | Metric | Target | Measured from |
|---|---|---|---|
| Activation | % who finish onboarding + first Daily Kata | **≥ 80%** (8/10) without help | users + sessions |
| Activation | Time from sign-up to first Kata finished | **≤ 10 min** median | timestamps |
| Engagement | Daily Kata median duration | **4–6 min** | sessions.totalTimeMs |
| Engagement | Kata completion rate (started → completed) | **≥ 85%** | sessions |
| Engagement | Active days in the test week | **≥ 4 of 7** median | xpevents by day |
| Learning | Users who can explain a missed answer after feedback | **≥ 8/10** | interview |
| Learning | Accuracy on revisits vs first attempt | revisit accuracy **> 60%** | answerattempts |
| Learning | Baseline → Checkpoint change *(if approved)* | **+1 or more** median | sessions |
| Findability | Can point to their weakest topic on Home in ≤ 10 s | **≥ 8/10** | test task |
| Competition | Duel completion rate (created → both finished) | **≥ 70%** | duels |
| Competition | Can create and finish a duel with 2 accounts unaided | **≥ 8/10** | test task |
| Tech | API p95 latency (warm) | **< 300 ms** | logs |
| Tech | Crash-free sessions | **100%** in the test | manual |

All of these can be computed with a few Mongo queries. No analytics SDK is needed in V1.
The queries are written in P7 as a `server/scripts/metrics.ts` report.

## 3. Competitor benchmark

| Product | What it does well | Gap Luna fills |
|---|---|---|
| **Duolingo** | Daily habit loop, streaks, leagues, 5-minute sessions | Not technical. Luna borrows the loop and applies it to engineering judgement |
| **Brilliant** | Interactive, explanation-first problem solving | Mostly math/science, paid, lesson-shaped. Luna is scenario- and incident-shaped |
| **Matiks** | Competitive mental-math duels | Speed arithmetic only. Luna duels test reasoning, with speed only as a tie-breaker |
| **Codewars / LeetCode** | Real coding problems, ranks | Long sessions that need a keyboard. Luna is phone-first and finished in 5 minutes |
| **Mimo** | Mobile coding lessons | Teaches syntax step by step. Luna tests applied judgement (debugging, trade-offs, incidents) |

**Luna's position:** the only one combining *Duolingo's daily loop* + *engineering judgement*
(not syntax) + *incident investigation*. Incident Room is the feature no competitor has.

## 4. Question levels (the bar every question is written to)

Source: `docs/v2/plan.md` §3 (V2). `difficulty` in the bank is 1 / 2 / 3 and maps to these three levels. Every
content phase writes and re-levels questions against this table.

| Level | Who it is for | What a question at this level tests | What it must not be |
|---|---|---|---|
| **1 Beginner** | 1st–2nd year CS student who has written small programs | One concept, applied directly: read short code (≤ 8 lines), recognise the classic mistake, pick the obviously right tool once you know the concept | Trivia, a definition quiz, or a trick that hinges on syntax |
| **2 Intermediate** | Intern / junior engineer who has shipped a small web app | Two concepts interacting (e.g. await inside a loop + error handling; an index + a sort order); a realistic code path (8–15 lines); a trade-off with one clear winner under stated constraints | A question a beginner gets right by pattern-matching keywords |
| **3 Advanced** | Mid-level engineer, a senior-interview question | Edge cases and production subtleties: ordering guarantees, isolation anomalies, cache stampedes, backpressure, idempotency under retries, partial failure; trade-offs where two options are plausible and the scenario's constraint decides | Obscure API trivia or a question whose answer is "it depends" without the scenario saying on what |

Rules for every question (the content audit enforces the rules that code can check; see below):

- **Distractors are real misconceptions**, each one something a player at that level actually believes. No joke options.
- **No length tell:** the correct option is not systematically the longest. Correct-answer positions are spread across a–d.
- **Explanations teach:** why the answer is right, and (Engineer's Choice) why each other option is worse, in plain English.
- **Code is correct except for the intended bug or behaviour**, and runs as described on current Node / Postgres / Redis.
- **Bug Hunt has exactly one buggy line**, and the answer key is that line number.
- Each question has a unique slug and a distinct scenario. No near-duplicates (same snippet with renamed variables).

**Content targets** (`CONTENT_TARGETS` in `server/src/config/game.ts`): per topic, 6 questions per type × level for
Trace, Bug Hunt and Engineer's Choice (54 singles), plus 4 incidents (1 beginner, 2 intermediate, 1 advanced).

**Checked by code:** `npm run audit:content -w server` (`server/src/seed/audit.ts`).

- *Errors (exit 1):* schema failure, duplicate slug, duplicate prompt + snippet, Bug Hunt answer key outside the
  snippet or on a blank line, an Engineer's Choice wrong option without an `optionFeedback` entry (the
  correct option is covered by `explanation`).
- *Warnings:* answer-key position skew (any of a–d above 40 % of a topic's 4-option questions), correct option strictly
  the longest in more than 50 % of a topic's questions, a cell under target. `--strict` turns "under target" into an
  error (used from P12 on, when the bank is complete).

## Decide
- [ ] Add the **Checkpoint** assessment to V1 scope? (recommended, small)
- [ ] Are the product targets OK for your capstone report?
