# P13 — Live duel backend

Branch: `phase/p13-live-duel-server`. Backend phase. Design: `docs/v2/plan.md` §6 (read it fully).
This is the riskiest phase: concurrency, timers, reconnects. Think through every race before coding each task.

## Tasks

1. **Contract in `shared/`:** live duel states (`LOBBY, READY, COUNTDOWN, QUESTION, REVEAL, COMPLETED, CANCELLED,
   ABANDONED`), Zod schemas for every client→server event payload and every server→client event, and the snapshot type.
   Event names in one const map. Timings (`countdownMs`, `revealMs`, `lobbyTtlMs`, `reconnectGraceMs`, `networkGraceMs`)
   in `DUEL_FORMAT_RULES` / a `LIVE_DUEL` const, read by both sides.
2. **Model changes** (`models/Duel.ts`): `phase`, `currentIndex`, `questionStartedAt`, `deadlineAt`, `phaseEndsAt`,
   per-player `connected`/`lastSeenAt`/`readyAt`, `lobbyExpiresAt`, `endReason` gains `CANCELLED|ABANDONED`. Remove the
   48 h `expiresAt` requirement (keep field optional for V1 rows). New `DuelAnswer` collection: `{duelId, userId, index,
   optionId|lineNumber, isCorrect, responseMs, receivedAt}` with a **unique index (duelId, userId, index)**. Indexes for
   recovery (`phase` + `deadlineAt`) and "my open lobby" (creatorId + phase).
3. **Migration:** an idempotent step (run from `syncIndexes`/boot and documented) that marks V1 `OPEN`/`ACTIVE` duels
   `EXPIRED`.
4. **REST, thin:** `POST /duels` creates a LOBBY (max **one** open lobby per user → 409), `POST /duels/join` joins by code
   (rate-limited, can't join own, only while LOBBY and not expired, atomic `opponentId: null` guard so two joiners can't
   both win), `POST /duels/:id/cancel` (creator, LOBBY/READY only), `GET /duels/:id` snapshot, `GET /duels` history
   (paginated). Remove `/duels/:id/play` and the async session path. No answer keys in any response.
5. **Socket.IO server** (`modules/duels/live/`): attach to the HTTP server in `index.ts`; JWT verified in the handshake
   (same secret/verify as `requireAuth`), CORS from config, WebSocket transport. Events: `duel:join-room` (participants
   only), `duel:ready`, `duel:answer {duelId, index, answer}` with ack, `duel:leave`. Per-socket rate limit (token bucket
   in config). Payloads validated with the shared Zod schemas; bad payloads get an error ack, never crash the handler.
6. **Engine** (`live/engine.ts`, pure functions + a small timer scheduler): transitions are **conditional updates** on
   `(phase, currentIndex)` so a deadline timer and the "both answered" path cannot double-advance. Answer acceptance:
   current index, phase QUESTION, `now ≤ deadlineAt + networkGraceMs`, first answer only (unique index; a duplicate returns
   the stored result). `responseMs` measured on the server and clamped to the question timer. Evaluation reuses
   `sessions.evaluator`. On REVEAL emit both players' results + the correct answer + explanation for that question only.
7. **Sudden Death** ends at the first question where exactly one player is wrong; both wrong → continue; after the last
   question → normal winner rules. **Winner:** correct count, then lower total `responseMs`, else draw.
8. **Progress + XP:** each answered question writes the player's normal attempt/progress records through the existing
   services so mastery, seen-sets and achievements still update (read how V1 duel sessions did it and keep the same XP
   rules). Win bonus via existing `settleDuel` logic (paid once, daily cap).
9. **Presence:** disconnect marks the seat disconnected; a reconnect within `reconnectGraceMs` resumes with a full snapshot
   (`duel:state`); past the grace → opponent wins by FORFEIT; both gone → ABANDONED (no win bonus). Lobby: creator gone >
   60 s or `lobbyTtlMs` passed → CANCELLED. Multiple sockets per user (two devices) are handled (last one wins, earlier one
   gets `duel:superseded`).
10. **Recovery on boot:** load duels in COUNTDOWN/QUESTION/REVEAL, re-arm timers from stored `deadlineAt`/`phaseEndsAt`;
    if a deadline passed while down, advance as a timeout. Graceful shutdown clears timers and closes sockets.
11. **Logging:** structured pino logs for every transition (duelId, from→to, reason) and for rejected answers.
12. Update `architecture.md` (flows, failure handling, scaling note: Redis adapter + per-duel lease) and decisions.

## Tests (`.scratch/api-tests/`, use `socket.io-client` against a real `listen(0)` server + fake timers where useful)

- Create/join/cancel; one lobby per user; join own → 400/409; two concurrent joiners → exactly one succeeds; expired lobby.
- Full Classic duel happy path: both answer → advance immediately; nobody answers → advance at deadline; both clients get
  the same index at the same step.
- Late answer (after deadline + grace) rejected; wrong index rejected; duplicate answer idempotent; answer for a duel you're
  not in rejected; bad payload → error ack.
- Race: last answer arriving at the same moment as the deadline → advances exactly once (assert index sequence).
- No `answerKey` in any event before REVEAL (scan payloads).
- Sudden Death: exactly-one-wrong ends it; both wrong continues.
- Disconnect + reconnect within grace resumes with snapshot; beyond grace → forfeit; both gone → ABANDONED.
- Recovery: persist a QUESTION-phase duel with a passed deadline, run recovery → it advances.
- Win bonus paid once even if settle runs twice concurrently; daily cap respected.
- Unauthenticated socket rejected; JWT for a non-participant can't join the room.
