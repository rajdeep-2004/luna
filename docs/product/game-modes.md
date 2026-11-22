# Game Modes, Sessions and Durations

## 1. The four challenge types

Each challenge tests one skill. In every type, the server holds the answer and the app only
learns it after the user submits.

| Mode | Skill tested | Interaction | Answer format | Target time |
|---|---|---|---|---|
| **Trace the Stack** | Predicting how code, a query or an HTTP exchange behaves | Read the snippet, pick 1 of 4 options | option id | ~40 s |
| **Bug Hunt** | Spotting the defect | Tap the line that contains the bug (snippets are 4–12 lines) | line number | ~50 s |
| **Engineer's Choice** | Weighing trade-offs | Read the scenario, pick 1 of 4 options | option id | ~40 s |
| **Incident Room** | Investigating step by step | 3 stages (Alert → Investigation → Resolution), 1 of 4 options at each stage. New evidence appears after every stage | option id per stage | ~45 s per stage, ~2.5 min total |

### Mode rules

- **Options:** always exactly 4, shuffled once per challenge when the session is created, so the
  correct answer isn't always "B". The order is stored in the session, so a resumed session shows
  the same order.
- **Bug Hunt:** exactly one correct line. If a bug spans two lines, the challenge author picks the
  line where the fix goes. A wrong tap shows a red mark on the tapped line and a green mark on the
  correct one.
- **Incident Room:**
  - A wrong answer at a stage does **not** end the incident. The user sees the correct reasoning
    and moves on with the new evidence. A real engineer who checks the wrong thing first still
    solves the incident; they just lose time.
  - Each stage is scored separately (see `scoring.md`).
  - The final **Incident Report** shows: stages correct (0–3), the grade, time taken, the root
    cause in two sentences, and XP.
- **Feedback** after every answer (and after every incident stage): right or wrong, the correct
  answer, a 2–4 sentence explanation, the most common misconception (1 sentence), and XP earned.
  For Engineer's Choice, there is also one line on why each wrong option is worse.

## 2. Session types

A session is a group of challenges played in one sitting.

| Session | Started from | Contents | Target duration | Repeatable? |
|---|---|---|---|---|
| **Daily Kata** | Home (main button) | 5 challenges: 1 Trace, 1 Bug Hunt, 2 Engineer's Choice, 1 Incident Room | 4–6 min | Once per calendar day. Reopening the same day resumes or shows the result |
| **Topic Practice** | Explore → a topic | 5 challenges from that topic, any type except Incident, at the user's difficulty for that topic | 3–4 min | Unlimited |
| **Incident Room** (solo) | Explore → Incident Room card | 1 incident | ~2.5 min | Unlimited |
| **Baseline** | End of onboarding (skippable) | 5 beginner challenges, one per topic, no Incident | ~2 min | Once |
| **Checkpoint** *(proposed, see benchmarks.md)* | Home card after 7 active days | 5 intermediate challenges, one per topic | ~3 min | Every 7 active days |
| **Duel** | Duel screen | 5 single challenges (no Incident), same set for both players | ~4 min | Unlimited (see competition.md) |

**Daily Kata time check:** 40 s + 50 s + 2 × 40 s + 150 s ≈ 5.3 min. That's inside the brainstorm's
4–6 minute target.

**Leaving mid-session:** a session stays open. Coming back resumes at the first unanswered challenge.
An unfinished Daily Kata expires at the end of the user's local day. Its answers still count for
mastery, but the Kata bonus and the streak are not awarded.

## 3. Hints

- Available only on **intermediate and advanced** challenges, and only if the author wrote one.
- One hint per challenge, or one per incident stage.
- **A hint halves the XP for that answer** (rounded down). The UI says so before the hint is
  revealed: "Using a hint halves the XP for this question."
- There are no hints in Duels, which keeps them fair.

## 4. Timer

| Session | Timer | On expiry |
|---|---|---|
| Daily Kata, Practice, Incident, Baseline, Checkpoint | **No countdown.** A small elapsed clock is shown | — |
| Duel | **60 s countdown** per challenge | Counts as a wrong answer. Moves on automatically |

**Why:** the brainstorm warns against excluding beginners. Countdowns punish slow readers more
than wrong thinkers. Learning sessions are untimed, but still measured (time shows on the summary).
Pressure belongs in Duels, where the player opted in to compete.

Time is always measured **on the server** (from when the challenge was served to when the answer
arrived), never taken from the client.

## 5. Content plan (question bank V1)

**50 single challenges + 8 Incident Room scenarios = 58 items.** That's inside the brainstorm's 50–60.

### Per topic (single challenges)

| Topic | Trace | Bug Hunt | Choice | Total | Beginner / Intermediate / Advanced |
|---|---:|---:|---:|---:|---|
| JavaScript & Async | 5 | 3 | 2 | 10 | 4 / 4 / 2 |
| HTTP & APIs | 3 | 2 | 5 | 10 | 4 / 4 / 2 |
| Databases | 3 | 3 | 4 | 10 | 4 / 4 / 2 |
| Caching & Queues | 1 | 2 | 7 | 10 | 4 / 4 / 2 |
| Debugging & Production | 1 | 3 | 6 | 10 | 4 / 4 / 2 |
| **Total** | **13** | **13** | **24** | **50** | 20 / 20 / 10 |

The type mix per topic follows what that topic naturally tests. Caching is about trade-offs, so it
gets more Engineer's Choice. JavaScript is about execution order, so it gets more Trace. The overall
ratio of about 1 : 1 : 2 matches the Daily Kata's mix.

### Incident Room scenarios (8)

| # | Working title | Primary topic | Difficulty |
|---|---|---|---|
| 1 | Production is slowing down (missing index) | Databases | 1 |
| 2 | The checkout that charged twice (non-idempotent retry) | HTTP & APIs | 2 |
| 3 | Stale prices after a sale (cache invalidation) | Caching & Queues | 2 |
| 4 | The queue that never drains (poison message) | Caching & Queues | 3 |
| 5 | 502s after deploy (bad env var / health check) | Debugging & Production | 1 |
| 6 | Memory climbs every hour (event-listener leak) | JavaScript & Async | 3 |
| 7 | Login works locally, fails in prod (CORS / cookie flags) | Debugging & Production | 2 |
| 8 | Deadlock at month-end (transaction ordering) | Databases | 3 |

### Content lifetime (honest limit)

Someone playing every day sees **4 new single challenges and 1 new incident per Kata**. New content
runs out after about **12 days** (single challenges) and **8 days** (incidents). After that, the
Daily Kata fills with revisits and the least-recently-seen challenges. That's fine for a capstone
demo and a 1–2 week usability test, but it's the main product limit of V1. Growing the bank is the
first item in `TODOS.md`.

### Content quality rules (every challenge)

1. Tests exactly one concept, which is tagged as the `subtopic`.
2. Exactly one defensible correct answer, and no trick wording.
3. Wrong options are *plausible misconceptions*, not jokes. (The brainstorm's "Replace HTTP with
   WebSocket" is borderline, so it gets rewritten.)
4. Code snippets are at most 12 lines and need no horizontal scrolling on a 360 px wide phone, where possible.
5. Explanations teach the *why* in 2–4 sentences, plus 1 sentence on the common misconception.

## Decide
- [ ] Is it OK that only Duels have a countdown (60 s)?
- [ ] Do Duels exclude Incident Room?
- [ ] Is the content plan of 50 + 8 OK, with the type mix per topic above?
- [ ] Is a hint costing half the XP OK?
