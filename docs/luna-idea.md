# StackSprint
## Product Requirements Document — V1

**Product category:** Gamified technical learning / brain training  
**Platform:** React Native mobile application  
**Version:** 1.0 — MVP  
**Status:** Proposed  
**Primary audience:** Computer science students and early-career developers  
**Primary experience:** Short, interactive engineering challenges

---

## 1. Executive Summary

StackSprint is a mobile-first gamified learning application that helps computer science students strengthen their technical intuition through short, interactive and competitive challenges.

Instead of consuming long-form tutorials or courses, users open the app and solve small technical problems involving programming, backend engineering, databases, debugging and computer science fundamentals.

The experience combines four elements:

1. **Practice:** Small technical challenges that can be completed in a few minutes.
2. **Progression:** XP, streaks, levels, topic mastery and achievements.
3. **Competition:** Daily leaderboards and asynchronous challenges with friends.
4. **Learning:** Immediate explanations, feedback and personalized practice based on previous mistakes.

The product is designed around the principle that technical problem-solving should be something people enjoy practising every day.

### Product positioning

**StackSprint — Train your engineering brain.**

### Core value proposition

Spend five minutes solving technical challenges, improve your engineering intuition, and compete with other developers.

---

## 2. Problem Statement

Computer science students spend significant time consuming technical content through YouTube, online courses, documentation, coding platforms and university lectures.

However, there is an opportunity to improve how they practise and retain technical concepts.

Three problems are worth investigating:

**1. Fragmented technical knowledge**

Students learn concepts across different subjects and technologies but often struggle to connect them in practical situations.

For example, a student might understand Redis theoretically but struggle to identify when caching is appropriate in a real backend scenario.

**2. Lack of engaging micro-practice**

Traditional coding platforms generally require users to sit down and solve longer problems. There is room for a lightweight experience where students can practise technical reasoning during short breaks.

**3. Limited feedback on engineering judgement**

Knowing definitions is different from being able to diagnose a problem, understand trade-offs or select an appropriate technical solution.

StackSprint aims to address these problems through short, scenario-driven technical challenges.

---

## 3. Product Vision

Make technical practice as accessible and enjoyable as playing a casual mobile game.

### Product principles

- Practice should be more prominent than passive content consumption.
- Every challenge should test a specific technical skill.
- Every answer should provide meaningful feedback.
- Progress should reflect actual practice, not merely time spent in the app.
- Competition should motivate users without making beginners feel excluded.
- The product should be easy to use in five-minute sessions.

---

## 4. Target Audience

### Primary persona: CS student

**Demographics:** 18–24 years old.

**Profile:**
- Pursuing computer science, engineering or a related degree.
- Has basic programming knowledge.
- Has studied technologies such as JavaScript, Python, databases, networking or backend development.
- Enjoys puzzles, games, quizzes and competitive environments.
- Wants to improve technical knowledge but may not consistently practise.

**Pain points:**
- Forgets concepts after studying them.
- Finds conventional learning platforms time-consuming.
- Wants to improve technical problem-solving.
- Does not always know what to practise next.
- Enjoys competition but lacks a suitable technical game.

### Secondary persona: Early-career developer

A junior developer who wants to refresh technical fundamentals, practise engineering decisions and challenge friends.

V1 will primarily optimise for the CS student persona.

---

## 5. Jobs to Be Done

**Primary JTBD**

"When I have a few minutes free, I want to solve interesting technical challenges so that I can sharpen my engineering knowledge without committing to a lengthy course or coding session."

**Secondary JTBDs**

- When I get an answer wrong, I want to understand why so that I don't repeat the same mistake.
- When I improve at a topic, I want to see my progress.
- When my friends use the app, I want to challenge them and compare our abilities.
- When I open the app daily, I want to see a fresh challenge worth solving.

---

## 6. Unique Selling Proposition

StackSprint is not another coding tutorial app or a conventional MCQ quiz application.

Its differentiator is **gamified engineering reasoning**.

Users don't just answer questions about programming. They participate in scenarios that simulate how developers think and solve problems.

### Three product differentiators

**A. Engineering Incident Mode**

Users investigate fictional technical incidents using logs, metrics, code snippets and progressive clues.

**B. Multiple technical game mechanics**

Different types of challenges test different aspects of engineering knowledge.

**C. Weakness-based practice**

The system identifies topics where the user struggles and brings related challenges back into future practice sessions.

Together, these features create a distinctive experience beyond XP, streaks and leaderboards.

---

# 7. Product Scope — V1

V1 will focus on one initial learning domain:

## Web and Backend Engineering Fundamentals

The initial skill tree will contain five topics.

| Topic | Concepts covered |
|---|---|
| JavaScript & Async | Event loop, promises, async/await, execution flow |
| HTTP & APIs | Methods, status codes, REST, authentication |
| Databases | SQL, joins, indexes, transactions |
| Caching & Queues | Redis, TTL, cache invalidation, background jobs |
| Debugging & Production | Logs, errors, latency, bottlenecks, deployment basics |

Each topic will contain challenges across three difficulty levels:

- Beginner
- Intermediate
- Advanced

**Initial content target:** 50–60 curated challenges.

The content will be manually authored and stored in the database. AI-generated questions are not required for V1.

---

# 8. Core Gameplay

V1 will have four challenge formats.

## Game Mode 1: Trace the Stack

**Purpose:** Test the user's ability to understand code execution and technical behaviour.

The user receives a snippet of code, a query or an HTTP interaction and must predict the output or resulting behaviour.

Example:

```javascript
console.log("Start");

setTimeout(() => {
  console.log("Timeout");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise");
});

console.log("End");
```

Question:

What will be the correct output order?

Options:

A. Start → Timeout → Promise → End  
B. Start → End → Promise → Timeout  
C. Start → Promise → Timeout → End  
D. Start → End → Timeout → Promise

The user selects an answer and receives immediate feedback.

**Gameplay mechanics:**
- Multiple-choice answer.
- Optional countdown timer.
- Difficulty-based XP.
- Explanation of the execution order.

## Game Mode 2: Bug Hunt

**Purpose:** Develop debugging intuition.

The user receives a code snippet or a technical scenario with an existing bug.

Example:

```javascript
app.get("/users", async (req, res) => {
  const users = User.find();
  res.json(users);
});
```

Question:

Which line contains the problem?

The user taps the suspicious line.

Correct answer: The database operation is not awaited, so the response receives a Promise rather than the resolved result.

**Gameplay mechanics:**
- Select the incorrect line or component.
- Immediate visual feedback.
- Correct line identification.
- Explanation of the bug.
- Optional hint for difficult questions.

## Game Mode 3: Engineer's Choice

**Purpose:** Develop technical decision-making.

Users receive a real-world engineering situation and must choose the most appropriate solution.

Example:

You are building an API that receives frequent read requests for the same product data.

The database is experiencing unnecessary repeated reads.

What would you consider introducing?

A. Increase the database connection pool indefinitely.

B. Introduce a caching layer with an appropriate TTL.

C. Move all application data to local storage.

D. Replace HTTP with WebSocket.

After selecting an answer, the app explains the trade-offs and why the alternative choices are unsuitable.

**Gameplay mechanics:**
- Scenario-based questions.
- Multiple answer options.
- Immediate reasoning and explanation.
- Difficulty levels.

## Game Mode 4: Incident Room

**Purpose:** This is the signature gameplay mechanic of StackSprint.

Users become the engineer responsible for investigating a production incident.

Instead of receiving one question, users investigate a scenario through multiple stages.

### Example scenario: Production is slowing down

<incident>

**STAGE 1 — ALERT**

Your API's latency has increased significantly.

- Average latency: 2.4 seconds
- Database CPU: 92%
- Application CPU: 35%
- Incoming traffic: Normal

**Question:** What should you investigate first?

A. Database query performance  
B. Frontend rendering  
C. Application server CPU  
D. DNS configuration

After selecting an answer, the user receives new evidence.

**STAGE 2 — INVESTIGATION**

You discover that a frequently accessed database query is performing a full table scan.

What would be your next investigation?

A. Check the query execution plan and indexing  
B. Restart the application server  
C. Increase frontend cache duration  
D. Change the API endpoint URL

**STAGE 3 — RESOLUTION**

The execution plan reveals that the query filters on a column without an appropriate index.

What is the most relevant corrective action?

A. Add an appropriate index after evaluating the query workload  
B. Increase the frontend timeout  
C. Add another application server  
D. Disable database transactions

The user receives a final incident report.

**Result:**
- Correct decisions.
- Investigation score.
- Time taken.
- Explanation of the root cause.
- XP earned.

Incident Room should have multiple scenarios, not just this one.

### Why this mode matters

It gives the product a stronger identity.

Most conventional quiz formats test whether users remember information. Incident Room tests whether they can use technical information to make decisions.

---

# 9. Core User Journey

The primary product loop:

```text
Open App
    |
    v
Home Dashboard
    |
    v
Daily Circuit
    |
    v
Five Technical Challenges
    |
    v
Immediate Feedback
    |
    v
Session Summary
    |
    v
XP + Streak + Mastery Update
    |
    v
Leaderboard / Friend Challenge
    |
    v
Return Tomorrow
```

### Daily Circuit

The main engagement feature.

Every day, the user receives a curated set of five challenges.

A typical circuit contains:
- One code-tracing question.
- One debugging question.
- Two engineering decision questions.
- One short scenario or incident challenge.

**Target session duration:** 4–6 minutes.

The daily circuit is the primary action on the home screen.

Completing it extends the user's streak.

---

# 10. Functional Requirements and Screens

## Screen 1: Authentication and Onboarding

Features:
- User registration.
- Login.
- Username selection.
- Profile avatar selection.
- Selection of preferred technical topics.
- Self-reported experience level.
- Optional five-question baseline assessment.

The baseline assessment gives the app an initial estimate of the user's knowledge.

## Screen 2: Home Dashboard

This is the main landing screen.

It should display:

- Greeting and avatar.
- Current XP and level.
- Daily streak.
- Daily Circuit card.
- Topic progression.
- Recommended practice.
- Weakest topic.
- Weekly ranking preview.

Primary CTA: **Start Daily Circuit**.

Secondary actions:
- Continue learning.
- Explore challenges.
- Challenge a friend.

## Screen 3: Explore / Skill Tree

Display the five learning topics as separate cards or a progression map.

Each topic card should display:

- Topic name.
- Difficulty level.
- Number of challenges completed.
- Progress status.
- Lock/unlock status, if progression gating is enabled.

Users should be able to select any beginner topic.

Do not force a long linear course progression.

## Screen 4: Game Interface

A reusable challenge screen should render all four game formats.

Common elements:
- Challenge title.
- Difficulty indicator.
- Timer.
- Progress indicator.
- Question or scenario.
- Answer interaction.
- Hint button, where available.

Each game format should use its own interaction component.

## Screen 5: Answer Feedback

Immediately after an answer:

- Show correct or incorrect status.
- Reveal the correct answer.
- Explain why it is correct.
- Explain the main misconception.
- Display XP earned.
- Provide a Next Challenge button.

This screen is essential. The product should teach, not merely score.

## Screen 6: Session Summary

Display:
- Total questions.
- Correct answers.
- Accuracy.
- Time taken.
- XP earned.
- Current streak.
- Topic performance.
- Weak areas to revisit.

CTA: Continue Practising.

## Screen 7: Leaderboard

Display a weekly leaderboard.

Each entry contains:
- Rank.
- Username.
- Avatar.
- Weekly XP.
- League or tier.

Users should be able to compare their ranking with other registered users.

The leaderboard resets at the start of a new week.

## Screen 8: Friend Duel

Implement an asynchronous challenge.

Flow:

1. User A creates a five-question challenge.
2. App generates a unique invitation code.
3. User A shares the code with User B.
4. User B joins the challenge.
5. Both users complete the same questions.
6. Both scores are compared.
7. Winner is declared.

**Important:** V1 does not need real-time multiplayer or WebSockets. Both users can play independently and compare results after completion.

Scoring should prioritise accuracy, with total completion time used as a tie-breaker.

## Screen 9: Profile and Progress

Display:
- Username and avatar.
- Total XP.
- Current level.
- Current and longest streak.
- Challenges completed.
- Overall accuracy.
- Topic-wise performance.
- Achievements.
- Recent activity.

---

# 11. Gamification and Retention System

Gamification is part of the core product experience.

### A. XP

Suggested initial reward structure:

| Activity | XP |
|---|---:|
| Correct beginner answer | 10 |
| Correct intermediate answer | 15 |
| Correct advanced answer | 20 |
| Complete Daily Circuit | 15 bonus |
| Complete first Incident Room | 25 bonus |

Award first-completion XP to prevent users from farming points by repeatedly answering the same questions.

### B. Levels

Users accumulate XP and progress through levels.

Example:

- Level 1: Rookie
- Level 2: Explorer
- Level 3: Debugger
- Level 4: Builder
- Level 5: Engineer

These names are provisional.

### C. Streak

A streak increases when the user completes at least one Daily Circuit in a calendar day.

The home screen should prominently display the streak.

### D. Achievements

Example achievements:

| Achievement | Condition |
|---|---|
| First Commit | Complete your first challenge |
| Bug Hunter | Solve 10 debugging challenges |
| Daily Grinder | Complete 7 daily circuits |
| Incident Commander | Complete 5 Incident Rooms |
| Perfect Run | Complete a circuit without an incorrect answer |

### E. Topic Mastery

Track performance separately for each topic.

Use labels such as:

- New
- Practising
- Developing
- Strong

Avoid telling users they know 87% of backend engineering.

Progress should be based on actual attempts, accuracy and repeated performance. Do not display a Strong label until the user has completed a minimum number of relevant challenges.

---

# 12. Personalisation and Adaptive Difficulty

V1 should include a simple rule-based recommendation engine.

Machine learning is unnecessary.

### Rule 1: Weak topic detection

Track incorrect answers by topic.

If a user repeatedly struggles with SQL, recommend additional SQL challenges.

### Rule 2: Difficulty adjustment

Use recent performance to determine the next difficulty.

- Four or five correct answers in the last five attempts: increase difficulty.
- Two or fewer correct answers: recommend an easier challenge.
- Otherwise: maintain the current difficulty.

### Rule 3: Mistake revisiting

Previously incorrect challenges should reappear in future practice sessions, after a few intervening questions.

This introduces a simple spaced-repetition mechanism.

### Rule 4: Daily Circuit personalisation

Mix:
- New challenges.
- Challenges at the user's current level.
- Previously missed concepts.

The Daily Circuit should not repeatedly give the user only questions they already know.

---

# 13. Challenge Content Architecture

The app should have a reusable challenge engine rather than hardcoding individual questions into screens.

Every challenge should have a structured representation.

Suggested schema:

```typescript
type Challenge = {
  id: string;
  title: string;
  topic: string;
  subtopic: string;
  type:
    | "TRACE"
    | "BUG_HUNT"
    | "ENGINEER_CHOICE"
    | "INCIDENT";

  difficulty: 1 | 2 | 3;
  prompt: string;

  codeSnippet?: string;

  options?: {
    id: string;
    text: string;
  }[];

  correctAnswerId?: string;
  explanation: string;
  hint?: string;

  xpReward: number;
  estimatedTime: number;
};
```

Incident Room should use a separate structured collection of progressive steps and clues.

The answer key must remain server-side. The mobile app should not receive the correct answer before submitting a response.

This makes the system reusable, extensible and easier to maintain.

---

# 14. Technical Architecture

### Mobile application

- React Native
- Expo
- TypeScript
- React Navigation
- Zustand for lightweight client-side state
- TanStack Query for API data fetching
- Expo SecureStore for authentication token storage

### Backend

- Node.js
- Express.js
- TypeScript
- MongoDB Atlas
- Mongoose
- JWT authentication
- bcrypt password hashing

### Architecture

```text
React Native App
       |
       v
API Client
       |
       v
Express Backend
       |
       +--------------------+
       |                    |
       v                    v
Authentication       Challenge Engine
       |                    |
       v                    v
     Users             Question Bank
                            |
                            v
                      Answer Evaluator
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
           XP System    Progress       Streak
              |          Tracker       Manager
              |             |             |
              +-------------+-------------+
                            |
                            v
                      MongoDB Atlas
                            |
                 +----------+----------+
                 |                     |
                 v                     v
             Leaderboard          Friend Duels
```

### Important architectural decisions

1. All challenge content should be stored centrally in MongoDB.
2. The backend should evaluate submitted answers.
3. The backend should calculate XP and update streaks.
4. User progress should persist across sessions and devices.
5. Leaderboard results should come from actual user records.
6. Friend Duels should work asynchronously through REST APIs.

---

# 15. Database Collections

Suggested MongoDB collections:

### Users

- `_id`
- `username`
- `email`
- `passwordHash`
- `avatar`
- `totalXP`
- `level`
- `currentStreak`
- `longestStreak`
- `lastDailyCompletedAt`
- `timezone`
- `createdAt`

### Topics

- `_id`
- `name`
- `description`
- `icon`
- `order`

### Challenges

- `_id`
- `title`
- `topicId`
- `type`
- `difficulty`
- `prompt`
- `options`
- `answerKey`
- `explanation`
- `xpReward`
- `isActive`

### Sessions

- `_id`
- `userId`
- `sessionType`
- `challengeIds`
- `correctCount`
- `totalQuestions`
- `totalTime`
- `totalXP`
- `completedAt`

### AnswerAttempts

- `_id`
- `userId`
- `challengeId`
- `selectedAnswer`
- `isCorrect`
- `timeTaken`
- `createdAt`

### UserTopicProgress

- `_id`
- `userId`
- `topicId`
- `attempts`
- `correctAnswers`
- `lastPractisedAt`
- `difficultyLevel`

### Duels

- `_id`
- `challengeCode`
- `creatorId`
- `opponentId`
- `challengeIds`
- `creatorScore`
- `opponentScore`
- `status`
- `winnerId`
- `expiresAt`

A separate collection for daily challenges can be introduced to ensure that all users receive the same challenge set on a given day.

---

# 16. Backend API Requirements

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/users/me` | Get current profile |
| GET | `/api/topics` | Fetch topics |
| GET | `/api/challenges/daily` | Get daily challenge |
| POST | `/api/sessions` | Start practice session |
| POST | `/api/sessions/:id/answer` | Submit answer |
| POST | `/api/sessions/:id/complete` | Complete session |
| GET | `/api/users/me/progress` | Get learning statistics |
| GET | `/api/leaderboard/weekly` | Get weekly rankings |
| POST | `/api/duels` | Create duel |
| POST | `/api/duels/:code/join` | Join duel |
| GET | `/api/duels/:id` | Get duel status |
| GET | `/api/duels/:id/result` | Compare results |

All authenticated endpoints should validate the user's identity and permissions.

---

# 17. MVP Prioritisation

The project should be built in three priority levels.

### P0 — Mandatory MVP

- Authentication and onboarding.
- Home dashboard.
- Topic and skill progression.
- Reusable challenge engine.
- Trace the Stack.
- Bug Hunt.
- Engineer's Choice.
- Incident Room.
- Daily Circuit.
- Answer feedback and explanations.
- XP, levels and streaks.
- Persistent user progress.
- Initial curated question bank.

### P1 — Complete V1 experience

- Weekly leaderboard.
- Friend Duel using invitation codes.
- Session history.
- Achievements.
- Weak-topic recommendations.
- Rule-based adaptive difficulty.
- Topic-wise statistics.

### P2 — Future enhancements

- Real-time multiplayer duels.
- AI-powered technical tutor.
- AI challenge generation with human review.
- Additional learning tracks: DSA, DevOps, AI/ML, networking and system design.
- Architecture-building drag-and-drop games.
- Clubs, friends and social challenges.
- Push-notification campaigns.

---

# 18. Explicit Non-Goals

To avoid scope creep, the following will not be part of V1:

- Full coding IDE.
- Online code compilation and execution.
- Comprehensive programming courses.
- All programming languages.
- Advanced AI tutoring.
- Real-time multiplayer matchmaking.
- Community discussion forums.
- User-generated questions.
- Payment gateway or subscription system.
- Teacher or university administration dashboard.

These features may be considered in subsequent versions.

---

# 19. Product Success Metrics

These are targets for prototype evaluation, not claims of actual performance.

### Activation

Percentage of registered users who complete onboarding and their first Daily Circuit.

### Engagement

- Daily Circuit completion rate.
- Average challenges completed per session.
- Average session duration.
- Number of active practice days per user.

### Learning

- Accuracy by topic.
- Performance on previously missed questions.
- Repeat-attempt accuracy.
- Improvement between baseline assessment and a later assessment.

### Competition

- Number of duels created.
- Duel completion rate.
- Weekly leaderboard participation.

### Suggested usability testing targets

Test the prototype with 8–10 CS students.

- At least 8/10 should complete their first Daily Circuit without assistance.
- Users should understand why an answer was correct or incorrect.
- Users should be able to locate their weak topics from the dashboard.
- Users should be able to create and complete a friend challenge using two accounts.

---

# 20. Acceptance Criteria

V1 is considered functionally complete when:

1. A user can register and authenticate successfully.
2. The user can select topics and complete an initial assessment.
3. The user can access the five initial learning topics.
4. All four challenge formats function correctly.
5. Each answer is evaluated and receives an explanation.
6. A five-question Daily Circuit can be completed.
7. XP and streaks update correctly and persist in the database.
8. Topic-wise progress updates after each attempt.
9. Previously incorrect questions can be recommended again.
10. Weekly leaderboard rankings are generated from stored user activity.
11. Two different users can participate in the same asynchronous duel.
12. The app maintains session state and handles API/network failures gracefully.

---

# 21. Suggested Development Sequence

### Phase 1 — Foundation
- Set up the Expo React Native project.
- Establish navigation and UI architecture.
- Implement authentication.
- Set up Express and MongoDB.
- Create user and challenge models.

### Phase 2 — Game Engine
- Build the reusable challenge renderer.
- Implement the first three game formats.
- Develop the answer evaluation API.
- Implement feedback and session summaries.

### Phase 3 — Signature Gameplay
- Implement Incident Room.
- Create the five-question Daily Circuit.
- Build the challenge selection logic.
- Add difficulty and topic tagging.

### Phase 4 — Gamification
- Implement XP and levels.
- Develop streak management.
- Implement topic progress and mistake revisiting.
- Build achievements and profile statistics.

### Phase 5 — Competition
- Develop weekly leaderboard.
- Implement asynchronous Friend Duel.
- Add duel comparison and results.

### Phase 6 — Polish and Testing
- Improve animations and transitions.
- Test on Android and iOS simulators or devices.
- Test authentication and data persistence.
- Test scoring and streak edge cases.
- Test two-user gameplay.
- Prepare the capstone demonstration.

---

# 22. Capstone Demonstration Scenario

The final demonstration should communicate the product's complete technical and user experience.

**Scenario: Two students competing on StackSprint.**

1. Register two separate user accounts.
2. Complete onboarding and baseline assessment.
3. Open the home dashboard and explore topic progress.
4. Start the Daily Circuit.
5. Play Trace the Stack and Bug Hunt.
6. Enter Incident Room and investigate a production failure.
7. Review answer explanations and the final performance summary.
8. Show XP, streak and updated topic performance.
9. Create a Friend Duel from the first account.
10. Join it from the second account using the invitation code.
11. Complete the same challenge set.
12. Display the final result and weekly leaderboard.

This demonstrates that StackSprint is more than a frontend quiz application. It includes a reusable gameplay engine, user authentication, persistent data, server-side evaluation, progression logic, recommendation logic and multi-user competition.

---

# 23. Final Product Definition

**StackSprint is a mobile-first gamified technical reasoning platform that turns software engineering concepts into short, interactive and competitive challenges.**

It helps computer science students practise code execution, debugging and engineering decision-making through daily challenges, progressive skill development and competitive gameplay.

Its defining experience is Incident Room, where users investigate simulated engineering failures rather than simply memorising technical definitions.

**The V1 objective is not to teach all of computer science. It is to make practising engineering intuition a daily habit.**

---

## Research References

1. [Duolingo — 2025 Annual Report / SEC Filing](https://www.sec.gov/Archives/edgar/data/1562088/000162828026012494/duol-20251231.htm)
2. [Matiks — Google Play](https://play.google.com/store/apps/details?id=com.matiks.app)
3. [Brilliant — Product Features](https://brilliant.org/help/features/)
4. [CodeCombat — What is CodeCombat?](https://codecombat.zendesk.com/hc/en-us/articles/4410481859095-What-is-CodeCombat)
5. [Codewars — Official Website](https://www.codewars.com/)
6. [Mimo — Google Play](https://play.google.com/store/apps/details?id=com.getmimo)