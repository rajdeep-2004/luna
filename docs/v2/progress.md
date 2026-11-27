# V2 progress

One block per phase, written by the phase itself (`docs/v2/runbook.md` §5).

## P8 — V2 plan — DONE (2026-11-26)
- Built: `docs/v2/plan.md`, runbook, phase files P9–P15, `scripts/v2/run-phases.sh`.
- Tests: 66 passed (baseline, no code change), lint + typecheck clean.
- Review: docs and script only; script smoke-tested with `--dry-run` and `--list`.
- Follow-ups: none.

## P9 — Selection variety, level rubric, content audit — DONE (2026-11-26)
- Built: level rubric in `docs/product/benchmarks.md` §4; `npm run audit:content -w server` (errors, warnings, `--strict`, `--content`); `server/src/lib/sampling.ts` (crypto-backed, injectable RNG); Daily Kata, practice/mode rounds, incidents, checkpoint, baseline and duels now sampled, keeping unseen-first and difficulty tiers; recently served (7 days) counts as seen. D-048.
- Tests: 89 passed (23 new: audit, sampling, selection variety), lint + typecheck clean. Audit of V1 bank: 0 errors, 64 warnings (answer skew, length tell, cells under target — for P10–P12).
- Review: cavecrew reviewer, 0 critical / 0 high / 1 medium / 7 low. Fixed the medium (audit crashed on malformed entries) and 2 lows; rest in `TODOS.md`.
- Follow-ups: content phases fix answer-position skew and the length tell; audit goes `--strict` from P12.

## P10 — Question bank: JavaScript async + HTTP & APIs — DONE (2026-11-26)
- Built: js-async and http-apis at target (54 singles: 6 Trace / 6 Bug Hunt / 6 Choice per level, plus 4 incidents at levels 1/2/2/3 each), split into `content/<topic>/{trace,bugHunt,choice,incidents}.ts`; V1 slugs kept, 2 re-levelled, a joke distractor replaced. D-049.
- Tests: 99 passed (5 new per finished topic in `bank.test.ts`: seeded counts, no answer key in rounds, P9 variety on the real bank), lint + typecheck clean. Audit: 0 errors, no warnings for either topic (answer positions ≤ 31 % per letter, length tell 35 % / 44 %).
- Review: cavecrew content reviewer, 2 high + 4 medium. All fixed (`req 'close'` → `res 'close'` in two answers, open-redirect advice, poison-safe promise chain, atomic Redis TTL, an ambiguous Bug Hunt prompt).
- Follow-ups: `npm run seed` not run, because `server/.env` points at the live Atlas cluster (in `TODOS.md`); P11/P12 add their topics to `FINISHED_TOPICS`.

## P11 — Question bank: Databases + Caching & queues — DONE (2026-11-27)
- Built: databases and caching-queues at target (54 singles: 6 Trace / 6 Bug Hunt / 6 Choice per level, plus 4 incidents at levels 1/2/2/3 each), split into `content/<topic>/{trace,bugHunt,choice,incidents}.ts`; V1 slugs kept, `cache-bad-candidate` re-levelled 2 → 1, `db-compound-index-order` rewritten for level 3, V1 incident options re-ordered (deviation from D-049, reasoned in D-050). Fixed a real bug: the candidate-pool query was hard-capped at 200, which silently dropped debugging-prod from checkpoint/baseline once the bank grew; now `SELECTION.poolMax = 1000` in config. D-050.
- Tests: 110 passed (bank tests for all four finished topics + a pool-bound test), lint + typecheck clean. Audit: 0 errors, no warnings for either topic (positions ≤ 29 % per letter; length tell 50 % databases, 31 % caching-queues).
- Review: cavecrew reviewer, 1 high + 12 medium + 1 question, code fix clean. All fixed (a second defensible distractor, node-redis `{ EX }` syntax in 3 snippets, ambiguous Bug Hunt lines, two overstated explanations, a level mismatch).
- Follow-ups: `npm run seed` not run (`server/.env` is the live Atlas cluster, in `TODOS.md`); databases length tell sits at the 50 % limit; the old `cachingQueues.ts` deletion landed in commit `a0790fd` (that one commit does not build alone; not rewritten); P12 adds debugging-prod to `FINISHED_TOPICS`.

## P12 — Question bank: Debugging production + full-bank audit — DONE (2026-11-27)
- Built: debugging-prod at target (54 singles: 6 Trace / 6 Bug Hunt / 6 Choice per level, plus 4 incidents at levels 1/2/2/3) in `content/debuggingProd/{trace,bugHunt,choice,incidents}.ts`; the shared `incidents.ts` and old `debuggingProd.ts` removed. V1 slugs kept; `prod-unbounded-map` and `prod-canary` re-levelled 3 → 2, joke distractors replaced, V1 options re-ordered. Full bank: 270 singles + 20 incidents. D-051.
- Tests: 116 passed (debugging-prod added to `bank.test.ts`; `audit.test.ts` now asserts the real bank passes `--strict` with 290 items and no warnings, and checks the under-target error with a fixture), lint + typecheck clean. Audit `--strict` across all five topics: 0 errors, 0 warnings (debugging-prod positions a 11 / b 12 / c 13 / d 12; length tell 38 %).
- Review: cavecrew content reviewer, 1 high + 3 medium + 8 low. Fixed the high (health check that restarts pods no longer pings the DB, matching the liveness Bug Hunt), all mediums and 6 lows; 3 level-move suggestions in `TODOS.md` (they would break 6/6 cells).
- Follow-ups: `npm run seed` not run (`server/.env` is the live Atlas cluster, in `TODOS.md`).

## P13 — Live duel backend — DONE (2026-11-27)
- Built: Socket.IO live duels (WebSocket only, JWT in the handshake, per-socket token bucket, Zod-validated events with acks); shared contract (`shared/src/liveDuel.ts`: phases, events, payloads, `LIVE_DUEL` timings); server-owned state machine on the Duel document with a pure engine (`live/engine.ts`) and conditional-update store, one timer per duel, `duelanswers` with a unique `(duelId, userId, index)` index, Sudden Death and live winner rules, progress/XP through the shared `recordAttempt`/`finishSession`, presence (20 s reconnect grace, forfeit, abandon, two devices), lobby TTL/absence cancel, boot recovery and V1 migration, graceful shutdown, transition logs. Thin REST: create/join/cancel/get/history; `/duels/:id/play` removed. App duel screens adapted to compile against the new contract (live match UI is P14). D-052.
- Tests: 136 passed (new: `duels.test.ts` REST + migration, `engine.test.ts` pure rules, `live.test.ts` and `live-fixes.test.ts` with socket.io-client against a real `listen(0)` server; V1 async duel tests in `duels.test.ts`/`formats.test.ts` removed with the behaviour), lint + typecheck clean.
- Review: cavecrew backend reviewer, 0 critical / 4 high / 6 medium / 6 low. Fixed 3 highs (stuck duel after a failed tick, attempts lost between reveal steps, XP skipped on attempt retry) and kept the 60 s creator-absence rule as planned (documented); fixed 4 mediums (late insert, key in ended snapshot, one live duel per joiner, stale presence write). Rest in `TODOS.md`.
- Follow-ups: tasks 1–11 landed in one code commit (the contract, model and REST changes don't compile apart) plus a review-fix commit; P14 must keep the socket connected on the lobby screen and remove the V1 DUEL session UI bits; JWT re-check after handshake and multi-instance scaling are in `TODOS.md`.

## P14 — Live duel app — DONE (2026-11-27)
- Built: one Socket.IO client (WebSocket, JWT in `auth`, backoff reconnect) and a `liveDuel` Zustand store folding server events through pure reducers; clock offset from `duel:ping` (min-RTT of 3); `LiveDuelScreen` with lobby (big code, Share, Cancel), face-off + 3-2-1, synced play (Trace/Bug Hunt/Choice renderers, i/N, timer ring, rival "thinking/answered", Strike locked until the ack), reveal (both results, the key, one line of why), then the result page (seal, per-question 正/誤 and times, win bonus); banners for reconnecting / rival offline (grace countdowns), waking server, superseded panel, expired/cancelled lobby; leave confirms (cancel/forfeit) on ✕, Back and swipe; foreground resume reconnects at once; paged duel history; V1 async duel UI removed. D-053.
- Tests: 149 passed across 18 files (new `live-store.test.ts`: real store vs real server; `live-app.test.ts` from the first P14 run), lint + typecheck clean. One run of the full suite timed out once in `live.test.ts` Sudden Death while a second vitest ran alongside it; the file passed twice on its own and again in the full run on `main`.
- Review: careful self-review (frontend phase, no UI reviewer per CLAUDE.md). Found and fixed: the creator never said ready again after a joiner left and the lobby reopened (match stuck on the face-off); a backgrounded phone could keep a dead socket longer than the 20 s grace; a double navigate when the leave ack and the "ended" push both arrived; vermilion behind text in the reconnect strip and timer.
- Follow-ups (`TODOS.md`): show my picked option after an app restart (receipt has no answer); auto-open a live duel on launch; P15 drops the unused V1 duel fields from `shared`.

### P14 click-through checklist (two phones, or Expo Go + a simulator, two accounts)
1. **Create:** Duel tab → pick Blitz → "Challenge a friend". You land on the lobby: your mask, a dashed rival, the 6-letter code big, "Closes in 9:59" counting down.
2. **Share:** tap "Share the code" → the share sheet opens with the code; close it → still on the lobby (no "cancelled").
3. **Join:** phone B → Duel tab → type the code. Both phones land on the face-off with both masks, then 3 · 2 · 1, then question 1 at the same moment.
4. **Simultaneous answers:** both pick and Strike quickly. Strike shows a spinner then "Locked in…"; tapping again does nothing. Both see the reveal (正/誤 for each, times, one line of why, the right option marked) for about 3 s, then question 2 arrives by itself.
5. **One answers, then waits:** A strikes, B doesn't. A sees "Locked in. @B is thinking…", B sees "@A · answered" (never A's choice). When B strikes, the reveal comes at once.
6. **Nobody answers:** let the timer run out. The ring empties (vermilion under 5 s), "Time's up…", then the reveal shows both "time".
7. **Kill one app mid-question, reopen within 20 s:** force-quit B. A sees "@B lost connection. They have N s to come back." Reopen B → Duel tab → Live → tap the duel → back in at the current question; A's banner goes away.
8. **Background then return:** on B, go to the home screen for ~10 s and come back. A short "Reconnecting…" strip, then the duel continues.
9. **Kill for more than 20 s:** force-quit B and wait. A's duel ends: result page "You win by default", no win bonus. B reopens → Finished list shows "You lost by default".
10. **Forfeit on purpose:** mid-match tap ✕ → "Forfeit the duel?" → Forfeit → result page; the rival sees "You win by default". "Stay" keeps you in.
11. **Sudden Death ending:** play Sudden Death; at the first question where exactly one of you is wrong, the reveal is followed by the result page with the seal. If both miss, play continues.
12. **Cancel lobby:** create a duel → "Cancel duel" (or Android back / ✕) → "Cancel the duel?" → Cancel duel → back on the Duel tab; joining that code from B shows an error message.
13. **Expired code:** create a lobby and leave it open for 10 minutes → the lobby shows "The invite expired". Joining that code from B shows an error, not a duel.
14. **Two devices, one account:** open the same live duel on a second phone signed in as A → the first shows "Open on another device" with "Play on this phone".
15. **Waking server:** after the Render API has slept, open a duel → "Waking the dojo…" with the lantern until it connects.
16. **Result and history:** finished duels show the seal, score, a 正/誤 and time per question for both, total time, and "+10 XP win bonus" for the winner. Finished list has "Older duels" when there are more than one page.
17. **Accessibility:** with VoiceOver/TalkBack, the timer reads "10 seconds or less left" only at the marks; with Reduce Motion on, the 3-2-1 swaps without the pop.

## P15 — V2 hardening and release docs — DONE (2026-11-27)
- Built: full regression (lint, typecheck, API suite, `audit:content --strict`, `npm run build -w server`: all clean before and after). Content pass over all 95 level-3 items: 17 Engineer's Choice questions and 4 incidents rewritten so no answer falls out by striking obviously harmful options (e.g. `http-breaking-change`); new distractors are plausible senior mistakes with matching feedback; slugs, keys and positions kept, audit 0/0. Review fixes: per-user socket token bucket + max 5 sockets per user + 16 KB frame cap; the "one live match per user" join re-checks after the join and gives the seat back on a clash; runtime pacing constants moved to `DUEL.runtime`; unused V1 `stepElapsedMs`/`endedEarly` removed. Versions 2.0.0 (all packages, `app.json`, Android `versionCode` 2). Docs synced: `prd.md` (F-04/F-10/F-16/F-18, non-goal removed, flow 3, phase table), `architecture.md`, `product/competition.md` and `game-modes.md` (live duel rules), README (V2 section, live duels, 290 questions, 152 tests, API table). D-054, D-055 (V2 summary).
- Tests: 152 passed across 19 files (3 new in `p15-review.test.ts`: two-lobby join race, which fails without the fix; socket cap; shared bucket), lint + typecheck clean, audit `--strict` 0 errors / 0 warnings, server build OK.
- Review: cavecrew backend reviewer over `896d904...HEAD -- server shared`: 0 critical / 0 high / 2 medium / 3 low; no answer-key leak, authZ and idempotency hold. Fixed both mediums and 2 lows; the remaining low (no per-user limiter and no projection on `POST /duels`) is in `TODOS.md`.
- Follow-ups (`TODOS.md`): build the 2.0.0 APK with EAS (`npx eas-cli@latest build -p android --profile apk`, needs Rajdeep's Expo account); seed the V2 bank on Atlas; multi-instance live duels.
