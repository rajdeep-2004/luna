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
- P9 review (low): `seenIds` reads `AnswerAttempt.distinct('challengeId')` over the user's whole history on every pick (index-covered); move to a per-user seen set if it shows in profiling.
- P9 review (low): the recently-served read is capped at 50 sessions in 7 days; a heavier player can replay older served questions. Raise the cap if that becomes real.
- P9 review (low): `tieredOrder` / `sampleWithoutReplacement` are O(n²) per pool; fine at ~300 challenges, switch to a per-tier Fisher–Yates if the bank grows by 10×.
- P9 review (low): a NaN difficulty would empty `bestTier` silently; the seed schema prevents it today.
- P9 review (low): `audit.ts` sits under `server/src` (typechecked, not bundled by tsup). Move to `server/scripts/` if a plain `tsc` build is ever added.
- No API test covers the per-account login lockout (5 failures → 15 min). Add one to `.scratch/api-tests/auth.test.ts`.
- Refresh tokens instead of a single 7-day JWT (D-008).
- Cached `weeklyXP` counter if the leaderboard aggregation gets slow (architecture §12).
- CI (lint + typecheck + API tests) if the project gets more contributors (D-006).
- Move `.scratch/api-tests` into the repo if the course requires visible tests (D-002).
- XP ledger insert and `users.totalXP` `$inc` are two writes (D-015). A crash between them leaves `totalXP` short of the ledger forever. Fix with a nightly reconcile (`totalXP = sum(ledger)`) or a transaction if Atlas tier allows (D-030).
- A crash after an answer is recorded but before its topic-progress/revisit write loses that one update (D-015, D-030). Replaying needs a per-attempt "applied" marker.

## Product backlog (from docs/product/)
- **P8: new Explore mini-games** (Rajdeep, D-037): fast formats beyond the four quiz modes, such as a 60-second blitz or a swipe true/false round. Needs new content and engine work.
- **Visual and micro-interaction polish pass after V1** (Rajdeep: "looks boring"). Session, feedback and summary screens are functional but plain. Fits the P6 polish task: livelier copy, richer motion, petals, rank-up banner, tab icons.
- **Grow the question bank.** V1's 50 + 8 items run out of new content after ~12 days of daily play (game-modes.md §5). In progress in V2: js-async and http-apis (P10), databases and caching-queues (P11) are complete (54 + 4 each); debugging-prod (P12) remains.
- **Seed the production bank after P10/P11** (D-049, D-050): the P10 and P11 sessions did not run `npm run seed` because `server/.env` points at the Atlas cluster the deployed API uses. Run it once (it is idempotent) when you are ready for players to see the new questions.
- **Re-key V1 options for balance** (D-049): V1 questions kept their option order so stored answers stay valid; their correct answers are mostly "b". The new questions balance each topic, but if a topic's audit ever shows skew again, consider re-keying with a migration of stored answers.
- Streak freeze (progression.md §6).
- Daily leaderboard and promotion/relegation leagues, once there are about 30+ active users per group (competition.md).
- Public duel matchmaking.
