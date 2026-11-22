# TODOS

Backlog, deferred ideas and known debt. Scope changes go here first; nothing here is built without approval.

## Deferred (P2, from docs/luna-idea.md)
- Real-time duels (WebSockets).
- AI tutor and AI question generation with human review.
- More tracks: DSA, DevOps, AI/ML, networking, system design.
- Drag-and-drop architecture games.
- Clubs, friends lists, social challenges.
- Push notifications for streak reminders.

## Known debt / revisit
- Refresh tokens instead of a single 7-day JWT (D-008).
- Cached `weeklyXP` counter if the leaderboard aggregation gets slow (architecture §12).
- CI (lint + typecheck + API tests) if the project gets more contributors (D-006).
- Move `.scratch/api-tests` into the repo if the course requires visible tests (D-002).

## Product backlog (from docs/product/)
- **Grow the question bank.** V1's 50 + 8 items run out of new content after ~12 days of daily play (game-modes.md §5). This is the first post-V1 priority.
- Streak freeze (progression.md §6).
- Daily leaderboard and promotion/relegation leagues, once there are about 30+ active users per group (competition.md).
- Public duel matchmaking.
