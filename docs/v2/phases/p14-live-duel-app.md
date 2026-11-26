# P14 — Live duel app

Branch: `phase/p14-live-duel-app`. Frontend phase. Read `DESIGN.md`, `docs/design/kirie-preview.html` (feel), and the
P13 contract in `shared/`. Luna is a game: the duel must feel like a face-off, not a form.

## Tasks

1. **Socket client** `app/src/api/socket.ts`: `socket.io-client` with WebSocket transport, JWT in `auth`, URL from
   `config/env.ts`, auto-reconnect with backoff, one shared connection. A Zustand store `liveDuel` holds the latest server
   snapshot; every server event replaces state from the snapshot (the server is the source of truth, no local game logic).
2. **Clock offset:** on connect, estimate server-time offset (ping/pong with server timestamp, take the min-RTT sample) and
   render countdowns from `deadlineAt - offset`. The countdown never decides anything; the server advances.
3. **Create flow:** pick format → LOBBY screen with the big code, share button, "waiting for your rival" art, cancel.
   Leaving the screen cancels the lobby (confirm dialog).
4. **Join flow:** enter code → join → both land on the face-off (READY) → 3-2-1 countdown → play.
5. **Live play screen:** reuses the challenge renderers (Trace, Bug Hunt, Engineer's Choice). Shows question i/N, the
   synced timer ring, the opponent's status ("thinking" / "answered" — never their choice), my answer locked after submit
   with pending state until the ack (double-tap safe). REVEAL shows both results, the correct answer and a one-line
   explanation for `revealMs`, then the next question arrives from the server.
6. **States:** reconnecting banner (with the grace countdown), opponent-disconnected banner, superseded (open on another
   device), server waking (Render cold start), lobby expired/cancelled, forfeit/abandoned results.
7. **Result screen:** winner seal, per-question ✓/✗ for both, times, win bonus. Duel history list from `GET /duels`.
8. Remove the async duel UI ("your turn", 48 h deadlines, play-later).
9. Accessibility: timer has an accessible label updated sparingly; buttons labelled; Reduce Motion respected.

## Check

- `npm run lint`, `npm run typecheck`. Full API suite still passes.
- Write a click-through checklist for Rajdeep (two devices or Expo Go + simulator) into `docs/v2/progress.md` under P14:
  create, share, join, simultaneous answers, one answers then waits, nobody answers (timer), kill one app mid-question and
  reopen within 20 s, kill for > 20 s (forfeit), Sudden Death ending, cancel lobby, expired code.
