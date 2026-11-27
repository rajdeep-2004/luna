# Product Requirements — Luna

> Status: approved — Last updated: 2026-11-27 (V2, P15: F-04, F-10, F-16 and F-18 describe the V2 build from Rajdeep's V2 brief, D-047; earlier: F-03, F-04, F-12, F-18, F-21, F-24 reworded to the game redesign, approved by Rajdeep)
> Source: `docs/luna-idea.md` (the original brainstorm, kept unchanged). Scope confirmed in chat on
> 2026-11-22: **P0 + P1** from the brainstorm (see `decisions.md` D-001).

> **Positioning (P7, D-037):** Luna is played as a game, not studied: a "samurai of code" dojo that a tired
> engineer opens in the evening instead of scrolling. The scope below is unchanged. The presentation is now
> game-first (Kiri-e Den, `DESIGN.md`), with topic + mode rounds and three duel formats.

Luna is a mobile app that helps computer science students build engineering intuition
through short, game-like technical challenges: predicting code output, finding bugs, choosing
between engineering trade-offs, and investigating simulated production incidents.

## 1. Problem

CS students learn concepts like the event loop, SQL indexes or caching across many courses and
videos, but rarely practise _applying_ them. Existing platforms either teach passively (videos,
courses) or demand long sessions (LeetCode-style problems). Nothing lets a student spend five
minutes practising engineering judgement, such as "which line is the bug?" or "what do I
investigate first when latency spikes?", and get immediate, explained feedback. As a result,
concepts fade, and students can't tell which topics they are weak in.

## 2. Users

| User / actor                       | What they need                                                           | How often                  |
| ---------------------------------- | ------------------------------------------------------------------------ | -------------------------- |
| CS student (primary, 18–24)        | Short, fun practice that sharpens technical reasoning and shows progress | Daily, 4–6 minute sessions |
| Early-career developer (secondary) | Refresh fundamentals, challenge friends                                  | A few times a week         |

V1 optimises for the CS student.

## 3. Goals

- A new user can register, onboard and finish their first Daily Kata without help (8/10 testers).
- Every answer teaches: users can explain why an answer was right or wrong after seeing feedback.
- Users can find their weakest topic from the home screen.
- Two users can create, join and finish a Friend Duel using an invite code.
- XP, streaks and progress are always computed on the server and persist across devices.

## 4. Non-goals

> V2 (D-047): "real-time multiplayer" is no longer a non-goal. Rajdeep's V2 brief asked for live duels, built in P13–P14 (F-18).

- A coding IDE, code compilation or code execution.
- Full courses or long-form lessons.
- AI tutoring or AI-generated questions.
- Forums, user-generated questions, payments, teacher/admin dashboards.
- Push notifications.
- Avatar image uploads (users pick from preset avatars).

## 5. Features

> The exact game rules (XP numbers, levels, mastery, timers, duel rules, content counts) live in
> `docs/product/`, approved on 2026-11-22. Where this table and `docs/product/` differ, `docs/product/` wins.

### Must have — P0

| ID   | Feature                                     | Acceptance criteria                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | Register / login                            | Email + password signup and login. Username unique. Token stored in SecureStore. Logout clears it. Wrong credentials show a clear error. Login is rate-limited.                                                                                                                                                                                                                                                                                     |
| F-02 | Onboarding                                  | Pick username, preset avatar, preferred topics and experience level. Optional 5-question baseline assessment sets the starting difficulty per topic.                                                                                                                                                                                                                                                                                                |
| F-03 | Home: the Dojo                              | The home screen is a room whose objects are the controls (D-037, D-040): the rank scroll (rank kanji, level, an ensō for XP to the next rank), the lantern (streak), the sealed kata scroll on the table (the Daily Kata, primary CTA), the ema plaque (weekly rank), a letter when the Checkpoint is ready, and the player's mask. No dashboard cards or topic statistics.                                                                         |
| F-04 | Explore                                     | Five topics as banners. A topic offers three mode rounds (Trace, Bug Hunt, Engineer's Choice: 5 questions of that kind, topped up from other topics when thin) and its boss Incident Room (D-041). Any topic can be played; no forced path. V2 (D-048): every round is drawn by weighted random sampling (unseen first, then nearest difficulty), so two players with the same profile get different questions and a replay is not the same set.    |
| F-05 | Challenge engine                            | One reusable game screen renders all challenge types from structured data. **The answer key never reaches the client before an answer is submitted.**                                                                                                                                                                                                                                                                                               |
| F-06 | Trace the Stack                             | Multiple choice: predict the output of code, a query or an HTTP exchange.                                                                                                                                                                                                                                                                                                                                                                           |
| F-07 | Bug Hunt                                    | Tap the line that contains the bug. Optional hint.                                                                                                                                                                                                                                                                                                                                                                                                  |
| F-08 | Engineer's Choice                           | Scenario + options. Feedback explains why the alternatives are worse.                                                                                                                                                                                                                                                                                                                                                                               |
| F-09 | Incident Room                               | A 3-stage investigation (alert, investigation, resolution). Each answer reveals new evidence. Ends with an incident report (stages correct, score, time, root cause, XP).                                                                                                                                                                                                                                                                           |
| F-10 | Daily Kata (the brainstorm's Daily Circuit) | 5 challenges (7 answers) per user per local day: 1 Trace, 1 Bug Hunt, 2 Engineer's Choice, 1 Incident, with up to 2 revisits. Same set if reopened the same day. Completing it extends the streak. V2 (D-048): each slot is sampled per player from about 30 candidates at their level, so two players rarely share a slot and almost never the whole set.                                                                                          |
| F-11 | Answer feedback                             | Correct/incorrect, correct answer, explanation, main misconception, XP earned, Next button.                                                                                                                                                                                                                                                                                                                                                         |
| F-12 | Session summary                             | Grade seal, correct / total, time, XP (counted up), the streak lantern relit when it grew, bonuses, fixed mistakes, rank-up and new crests. Weak topics from the round appear as "Train again" buttons.                                                                                                                                                                                                                                             |
| F-13 | XP and levels                               | 10/15/20 XP per correct answer, first-correct only. A hint halves the XP. 2 review XP inside the Daily Kata. Capped bonuses (`product/scoring.md`). 10 samurai ranks, Deshi → Shogun (`product/progression.md`).                                                                                                                                                                                                                                    |
| F-14 | Streaks                                     | +1 when a Daily Kata is completed on a new calendar day in the user's timezone. A missed day resets it to 1. Current and longest streak stored. Milestone bonuses at 3, 7 and 30 days.                                                                                                                                                                                                                                                              |
| F-15 | Persistent progress                         | All attempts, XP, streaks and topic progress are stored server-side and survive reinstall and new devices.                                                                                                                                                                                                                                                                                                                                          |
| F-16 | Question bank                               | V2 (P10–P12, D-049–D-051): 290 hand-written challenges loaded by a seed script: 5 topics × 3 kinds (Trace, Bug Hunt, Engineer's Choice) × 3 levels × 6 questions = 270 singles, plus 4 Incident Rooms per topic (levels 1/2/2/3). Every question is written to the level rubric (`docs/product/benchmarks.md` §4) and `npm run audit:content -w server -- --strict` must pass (counts per cell, answer-position spread, no length tell). V1 had 58. |

### Should have — P1 (in V1 scope)

| ID   | Feature                         | Acceptance criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-17 | Dojo Board (weekly leaderboard) | Ranks users by XP earned this week (resets Monday 00:00 UTC). Shows rank, username, avatar, weekly XP and rank title. Last week's top 3 get a badge. Paginated. Always shows the current user's own rank.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| F-18 | Friend Duel                     | V2: live duels (P13–P14, D-052, D-053). User A picks a format (Classic 5 × 60 s, Blitz 10 × 10 s, Sudden Death up to 10 × 30 s; singles only, no hints) and gets a 6-character code; the lobby stays open 10 minutes. User B joins with the code and both play the same questions at the same moment: 3-2-1, each question until both answer or its timer ends, then a 3 s reveal of both results and the key. One open lobby and one live match per user. Live Sudden Death ends at the first question where exactly one player is wrong. Winner: more correct, then lower total server-measured time, else a draw. A player who drops keeps their seat for 20 s, then forfeits. Win bonus 10 XP (max 3 per day). A user can't join their own duel. |
| F-19 | Session history                 | Paginated list of past sessions on the profile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| F-20 | Achievements                    | First Commit, Bug Hunter, Daily Grinder, Incident Commander, Perfect Run. Each is awarded once and shown on the profile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| F-21 | Weak-topic recommendations      | The API computes the weakest topic (lowest accuracy with enough attempts). It weights the Daily Kata selection, and the summary offers the round's weak topics as "Train again". It is not shown as a statistic (D-037).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| F-22 | Adaptive difficulty             | Per topic: 4–5 correct of the last 5 attempts moves difficulty up, 2 or fewer moves it down, otherwise it stays the same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| F-23 | Mistake revisiting              | Missed challenges come back in later sessions after at least 3 other questions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| F-24 | Topic statistics                | Per-topic answers, accuracy and mastery phase are tracked and served by `GET /users/me/progress`, and they drive selection and adaptivity. The Profile shows the player instead (rank, streak, duel record, katas, weekly place, crests, recent runs), with no per-topic report card (D-037).                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| F-25 | Checkpoint assessment           | After every 7 active days, Home offers 5 unseen intermediate questions (1 per topic, no XP). The result is compared with the baseline. Approved new scope (D-013).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### Later / maybe (P2, not in V1)

- AI tutor, AI question generation with review, new tracks (DSA, DevOps,
  system design), drag-and-drop architecture games, clubs and friends lists, push notifications.

## 6. Core user flows

### Flow 1: First Daily Kata

1. User registers → onboarding (username, avatar, topics, level) → optional baseline assessment.
2. Home dashboard → taps **Start Daily Kata**.
3. Plays 5 challenges. After each answer, the feedback screen explains it.
4. Session summary → XP, streak and topic mastery update → back to home.

### Flow 2: Incident Room

1. User opens an incident (from the Daily Kata or Explore).
2. Stage 1 alert with metrics → picks what to investigate → feedback plus new evidence.
3. Stage 2 → Stage 3 the same way → incident report.

### Flow 3: Friend Duel (live, V2)

1. User A picks a format and taps **Challenge a friend** → server creates the duel and returns a code → A waits in the lobby and shares the code.
2. User B enters the code → both phones show the face-off, then 3 · 2 · 1.
3. Both play the same question at the same moment; after both answer (or the timer ends), both see the reveal, then the next question arrives by itself.
4. After the last question (or the Sudden Death decider) both see the result page with the winner, per-question results and times.

## 7. Constraints

- Deadline: university capstone (application development).
- Scale: demo and usability testing, about 10–50 users. Design stays stateless so it can scale later.
- Platform: Android and iOS through Expo Go. Backend on Render (free tier), DB on MongoDB Atlas (free M0).
- Budget: free tiers only. Render's free tier sleeps when idle, so the first request after a
  sleep can take about 50 seconds. The app must show a "waking server" state, not hang.
- Privacy: store only email, username, password hash and gameplay data. Hash passwords with bcrypt.

## 8. Success metrics

Prototype evaluation targets, not claims:

- **Activation:** % of registered users who finish onboarding and their first Daily Kata.
- **Engagement:** Daily Kata completion rate, challenges per session, active days per user.
- **Learning:** accuracy by topic, accuracy on revisited (previously missed) questions.
- **Competition:** duels created, duel completion rate.
- **Usability test (8–10 CS students):** at least 8/10 finish the first circuit unaided, can find their
  weakest topic, and can finish a duel with two accounts.

## 9. Phases

Built one at a time, each on its own branch (`phase/p<n>-<slug>`), merged into `main` when done.
Details and task lists are in `docs/build-plan.md`.
Status: `todo` | `building` | `shipped`.

| ID  | Phase                                                                               | Features                                             | Status   |
| --- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- | -------- |
| P0  | Docs, plan and product design                                                       | —                                                    | shipped  |
| P1  | Backend core: foundation, auth, content, challenge engine                           | F-01 (API), F-05, F-09 (API), F-11 (API), F-15, F-16 | shipped  |
| P2  | App foundation, design system, auth and onboarding UI                               | F-01 (UI), F-02 (without baseline)                   | shipped  |
| P3  | Game UI: 4 modes, feedback, summary, explore                                        | F-04, F-06–F-09, F-11, F-12                          | shipped  |
| P4  | Progression: XP, levels, streaks, Daily Kata, adaptivity, checkpoint                | F-02 baseline, F-03, F-10, F-13, F-14, F-21–F-25     | shipped  |
| P5  | Competition and profile: Dojo Board, duels, achievements                            | F-17–F-20                                            | shipped  |
| P6  | Polish, deploy and demo prep                                                        | Acceptance criteria 1–12                             | building |
| P7  | Game redesign: design system, game-first screens, Explore mode picker, duel formats | D-037–D-043                                          | shipped  |
| P8  | V2 plan: phases, runbook, phase runner (`docs/v2/`)                                 | D-047                                                | shipped  |
| P9  | V2: level rubric, content audit, per-player randomised selection                    | F-04, F-10, F-16                                     | shipped  |
| P10 | V2 bank: JavaScript async + HTTP & APIs                                             | F-16                                                 | shipped  |
| P11 | V2 bank: Databases + Caching & queues                                               | F-16                                                 | shipped  |
| P12 | V2 bank: Debugging production + full-bank audit                                     | F-16                                                 | shipped  |
| P13 | V2: live duel backend (Socket.IO, synced questions)                                 | F-18                                                 | shipped  |
| P14 | V2: live duel app                                                                   | F-18                                                 | shipped  |
| P15 | V2 hardening, docs, 2.0.0                                                           | all                                                  | shipped  |
| P16 | New mini-games for Explore (e.g. blitz, swipe rounds)                               | D-037                                                | todo     |

## 10. Open questions

| #   | Question                          | Owner   | Resolved?                                    |
| --- | --------------------------------- | ------- | -------------------------------------------- |
| 1   | Final app name                    | Rajdeep | Yes: **Luna** (D-012)                        |
| 2   | Level names, game design, scoring | Rajdeep | Approved 2026-11-22 (`docs/product/`, D-013) |
