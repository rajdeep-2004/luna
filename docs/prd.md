# Product Requirements — Luna

> Status: approved — Last updated: 2026-11-22
> Source: `docs/luna-idea.md` (the original brainstorm, kept unchanged). Scope confirmed in chat on
> 2026-11-22: **P0 + P1** from the brainstorm (see `decisions.md` D-001).

Luna is a mobile app that helps computer science students build engineering intuition
through short, game-like technical challenges: predicting code output, finding bugs, choosing
between engineering trade-offs, and investigating simulated production incidents.

## 1. Problem

CS students learn concepts like the event loop, SQL indexes or caching across many courses and
videos, but rarely practise *applying* them. Existing platforms either teach passively (videos,
courses) or demand long sessions (LeetCode-style problems). Nothing lets a student spend five
minutes practising engineering judgement, such as "which line is the bug?" or "what do I
investigate first when latency spikes?", and get immediate, explained feedback. As a result,
concepts fade, and students can't tell which topics they are weak in.

## 2. Users

| User / actor | What they need | How often |
|---|---|---|
| CS student (primary, 18–24) | Short, fun practice that sharpens technical reasoning and shows progress | Daily, 4–6 minute sessions |
| Early-career developer (secondary) | Refresh fundamentals, challenge friends | A few times a week |

V1 optimises for the CS student.

## 3. Goals

- A new user can register, onboard and finish their first Daily Kata without help (8/10 testers).
- Every answer teaches: users can explain why an answer was right or wrong after seeing feedback.
- Users can find their weakest topic from the home screen.
- Two users can create, join and finish a Friend Duel using an invite code.
- XP, streaks and progress are always computed on the server and persist across devices.

## 4. Non-goals (V1)

- A coding IDE, code compilation or code execution.
- Full courses or long-form lessons.
- AI tutoring or AI-generated questions.
- Real-time multiplayer or WebSockets (duels are asynchronous).
- Forums, user-generated questions, payments, teacher/admin dashboards.
- Push notifications.
- Avatar image uploads (users pick from preset avatars).

## 5. Features

> The exact game rules (XP numbers, levels, mastery, timers, duel rules, content counts) live in
> `docs/product/`, approved on 2026-11-22. Where this table and `docs/product/` differ, `docs/product/` wins.

### Must have — P0

| ID | Feature | Acceptance criteria |
|---|---|---|
| F-01 | Register / login | Email + password signup and login. Username unique. Token stored in SecureStore. Logout clears it. Wrong credentials show a clear error. Login is rate-limited. |
| F-02 | Onboarding | Pick username, preset avatar, preferred topics and experience level. Optional 5-question baseline assessment sets the starting difficulty per topic. |
| F-03 | Home dashboard | Shows greeting, avatar, XP, level, streak, Daily Kata card (primary CTA), topic progress, weakest topic, recommended practice and weekly rank preview. |
| F-04 | Explore / skill tree | Five topic cards with completed count and mastery label. Any topic can be practised (no forced linear path). |
| F-05 | Challenge engine | One reusable game screen renders all challenge types from structured data. **The answer key never reaches the client before an answer is submitted.** |
| F-06 | Trace the Stack | Multiple choice: predict the output of code, a query or an HTTP exchange. |
| F-07 | Bug Hunt | Tap the line that contains the bug. Optional hint. |
| F-08 | Engineer's Choice | Scenario + options. Feedback explains why the alternatives are worse. |
| F-09 | Incident Room | A 3-stage investigation (alert, investigation, resolution). Each answer reveals new evidence. Ends with an incident report (stages correct, score, time, root cause, XP). |
| F-10 | Daily Kata (the brainstorm's Daily Circuit) | 5 challenges (7 answers) per user per local day: 1 Trace, 1 Bug Hunt, 2 Engineer's Choice, 1 Incident, with up to 2 revisits. Same set if reopened the same day. Completing it extends the streak. |
| F-11 | Answer feedback | Correct/incorrect, correct answer, explanation, main misconception, XP earned, Next button. |
| F-12 | Session summary | Questions, correct, accuracy, time, XP, streak, per-topic performance, weak areas. |
| F-13 | XP and levels | 10/15/20 XP per correct answer, first-correct only. A hint halves the XP. 2 review XP inside the Daily Kata. Capped bonuses (`product/scoring.md`). 10 samurai ranks, Deshi → Shogun (`product/progression.md`). |
| F-14 | Streaks | +1 when a Daily Kata is completed on a new calendar day in the user's timezone. A missed day resets it to 1. Current and longest streak stored. Milestone bonuses at 3, 7 and 30 days. |
| F-15 | Persistent progress | All attempts, XP, streaks and topic progress are stored server-side and survive reinstall and new devices. |
| F-16 | Question bank | 50–60 hand-written challenges across 5 topics × 3 difficulties, plus at least 4 Incident Room scenarios, loaded by a seed script. |

### Should have — P1 (in V1 scope)

| ID | Feature | Acceptance criteria |
|---|---|---|
| F-17 | Dojo Board (weekly leaderboard) | Ranks users by XP earned this week (resets Monday 00:00 UTC). Shows rank, username, avatar, weekly XP and rank title. Last week's top 3 get a badge. Paginated. Always shows the current user's own rank. |
| F-18 | Friend Duel | User A creates a duel (5 single challenges, no incident, 60 s per question, no hints) and gets a 6-character code. Max 5 open duels per user. Win bonus 10 XP (max 3 per day). User B joins with the code. Both play the same questions independently. Winner: more correct answers, then lower total time. Duels expire after 48 hours. A user can't join their own duel. |
| F-19 | Session history | Paginated list of past sessions on the profile. |
| F-20 | Achievements | First Commit, Bug Hunter, Daily Grinder, Incident Commander, Perfect Run. Each is awarded once and shown on the profile. |
| F-21 | Weak-topic recommendations | Home shows the weakest topic (lowest accuracy with enough attempts) and recommends practising it. |
| F-22 | Adaptive difficulty | Per topic: 4–5 correct of the last 5 attempts moves difficulty up, 2 or fewer moves it down, otherwise it stays the same. |
| F-23 | Mistake revisiting | Missed challenges come back in later sessions after at least 3 other questions. |
| F-24 | Topic statistics | Profile shows per-topic answers, accuracy and moon-phase mastery 🌑🌒🌓🌕 (`product/progression.md` §2). |
| F-25 | Checkpoint assessment | After every 7 active days, Home offers 5 unseen intermediate questions (1 per topic, no XP). The result is compared with the baseline. Approved new scope (D-013). |

### Later / maybe (P2, not in V1)
- Real-time duels, AI tutor, AI question generation with review, new tracks (DSA, DevOps,
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

### Flow 3: Friend Duel
1. User A taps **Challenge a friend** → server creates the duel and returns a code → A shares it.
2. A plays the 5 questions.
3. User B enters the code → plays the same 5 questions.
4. Both see the result screen with the winner. Each side shows "waiting for opponent" until both finish.

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

| ID | Phase | Features | Status |
|---|---|---|---|
| P0 | Docs, plan and product design | — | shipped |
| P1 | Backend core: foundation, auth, content, challenge engine | F-01 (API), F-05, F-09 (API), F-11 (API), F-15, F-16 | shipped |
| P2 | App foundation, design system, auth and onboarding UI | F-01 (UI), F-02 (without baseline) | shipped |
| P3 | Game UI: 4 modes, feedback, summary, explore | F-04, F-06–F-09, F-11, F-12 | todo |
| P4 | Progression: XP, levels, streaks, Daily Kata, adaptivity, checkpoint | F-02 baseline, F-03, F-10, F-13, F-14, F-21–F-25 | todo |
| P5 | Competition and profile: Dojo Board, duels, achievements | F-17–F-20 | todo |
| P6 | Polish, deploy and demo prep | Acceptance criteria 1–12 | todo |

## 10. Open questions

| # | Question | Owner | Resolved? |
|---|---|---|---|
| 1 | Final app name | Rajdeep | Yes: **Luna** (D-012) |
| 2 | Level names, game design, scoring | Rajdeep | Approved 2026-11-22 (`docs/product/`, D-013) |
