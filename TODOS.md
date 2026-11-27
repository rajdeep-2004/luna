# TODOS

Backlog, deferred ideas and known debt. Scope changes go here first; nothing here is built without approval.

## Deferred (P2, from docs/luna-idea.md)
- AI tutor and AI question generation with human review.
- More tracks: DSA, DevOps, AI/ML, networking, system design.
- Drag-and-drop architecture games.
- Clubs, friends lists, social challenges.
- Push notifications for streak reminders.

## Release (needs Rajdeep's Expo account)
- **Build the 2.0.0 APK** (P15). Versions are already 2.0.0 (`app.json` version, Android `versionCode` 2). From `app/`: `npx eas-cli@latest login`, then `npx eas-cli@latest build -p android --profile apk`. Install it over 1.0 and run the P14 click-through checklist (`docs/v2/progress.md`) on two phones. Then update the APK link in the README.

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
- P13 review (medium): the socket JWT is checked only in the handshake; a socket opened before the token expires keeps working. Re-verify on each event or disconnect at `exp` (D-052).
- P13 review (medium): the duel win bonus is claimed before it is paid; a crash between them loses that bonus (same trade-off as D-015). A per-duel ledger key (`duelwin:<duelId>`) plus the daily-slot check would make it retry-safe.
- P13 review (medium): live duels assume one API instance (`seats` map and timers are process-local; boot recovery marks every seat offline). Before scaling out: Socket.IO Redis adapter + a per-duel lease (D-052, architecture §12).
- P13 review (low): `finalizeDuel` checks `finalizedAt` with a read; two concurrent calls both run (safe today because every step is idempotent). Claim it with a conditional update if a non-idempotent step is ever added.
- P13 review (low): boot recovery ticks every open duel before `listen`; boot time grows with open duels. Tick in the background if that becomes slow.
- P13 review (low): `migrateV1Duels` scans for `phase: {$exists: false}` on every boot (no index). Drop the call once production has been migrated.
- P13 review (low): if a duel's challenge is deactivated mid-match, the question/reveal event is skipped silently while the phase still advances. Log at error, or cancel the duel.
- P13/P15 review (low): `POST /duels` and `POST /duels/:id/cancel` have no route limiter beyond the global 300/min one, and `pickDuelChallenges` loads the full active pool (up to `SELECTION.poolMax`, no projection) on every create. Add a per-user create limiter and project only the fields the picker uses. (The per-socket limit is now per user, with a socket cap: P15.)
- P15: the per-user socket bucket and socket count live in process memory, like `seats`; they move to Redis with the rest of the live state when the API scales out.
- P15: a user who joins two lobbies at the exact same moment can get 409 on both (each join sees the other and gives its seat back). Safe, and a retry works; make it deterministic only if users hit it.
- P14: after an app restart mid-question the answer shows as locked but the option I picked isn't highlighted (`DuelAnswerReceipt` has no `answer`). Add it to the receipt in the snapshot.
- P14: a player who kills the app mid-match gets back through the Duel tab's "Live" list; consider auto-opening a live duel on launch.

## Product backlog (from docs/product/)
- **P8: new Explore mini-games** (Rajdeep, D-037): fast formats beyond the four quiz modes, such as a 60-second blitz or a swipe true/false round. Needs new content and engine work.
- **Visual and micro-interaction polish pass after V1** (Rajdeep: "looks boring"). Session, feedback and summary screens are functional but plain. Fits the P6 polish task: livelier copy, richer motion, petals, rank-up banner, tab icons.
- **Grow the question bank.** V1's 50 + 8 items run out of new content after ~12 days of daily play (game-modes.md §5). Done in V2 (P10–P12): all five topics are at 54 singles + 4 incidents (290 items). Next growth would be more incidents or new formats (P16).
- **Seed the production bank after P10–P12** (D-049, D-050, D-051): the P10, P11 and P12 sessions did not run `npm run seed` because `server/.env` points at the Atlas cluster the deployed API uses. Run it once (it is idempotent) when you are ready for players to see the new questions.
- **Re-key V1 options for balance** (D-049): V1 questions kept their option order so stored answers stay valid; their correct answers are mostly "b". The new questions balance each topic, but if a topic's audit ever shows skew again, consider re-keying with a migration of stored answers.
- **P12 review, level nits (D-051)**: the reviewer suggested `prod-unhandled-rejection-crash` (L1 → 2), `prod-shutdown-order` (L3 → 2) and `prod-swallowed-error` (L2 → 1). Moving them would push cells off 6/6, so they stay; swap each with a new question at the other level if players find them mis-levelled.
- Streak freeze (progression.md §6).
- Daily leaderboard and promotion/relegation leagues, once there are about 30+ active users per group (competition.md).
- Public duel matchmaking.
