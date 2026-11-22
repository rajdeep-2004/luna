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

## Decide
- [ ] Add the **Checkpoint** assessment to V1 scope? (recommended, small)
- [ ] Are the product targets OK for your capstone report?
