# Build Plan — Luna

> Last updated: 2026-11-22. Phase status lives in `docs/prd.md` §9. This file holds the task list
> per phase, the API surface, and how each phase is checked.

## How each phase runs

1. Rajdeep says **"start P<n>"**. Claude creates branch `phase/p<n>-<slug>` from an up-to-date
   `main`, sets the phase to `building` in `prd.md`, and lists the tasks.
2. Build, one commit per task (conventional commits). Before each commit: `npm run lint`,
   `npm run typecheck`, and for backend work the API tests in `.scratch/api-tests/` (gitignored).
3. **Check:**
   - Backend phases (P1, and the server part of P4 and P5): **one backend code review** of the
     branch diff. Fix critical and high findings.
   - Frontend phases: no automated UI reviewer on backend code. Claude gives Rajdeep a click-through
     checklist and Rajdeep tests on Expo Go.
4. Report (5 lines max) and **stop**. Rajdeep reviews and asks for changes if needed.
5. When Rajdeep says the phase is done: update `prd.md` status to `shipped`, add a decisions entry,
   merge the branch into `main` (`git merge --no-ff`), and push `main` and the branch. **No PR.**
6. Rajdeep `/clear`s and says "start P<n+1>". Claude never starts the next phase on its own.

## API surface (`/api/v1`)

| Method | Endpoint | Auth | Phase | Purpose |
|---|---|---|---|---|
| GET | `/health` | — | P1 | liveness + DB ping |
| POST | `/auth/register` | — | P1 | create account, return token + user |
| POST | `/auth/login` | — | P1 | return token + user |
| GET | `/users/me` | ✓ | P1 | current profile |
| PATCH | `/users/me` | ✓ | P1 | onboarding: username, avatarId, preferredTopicIds, experienceLevel, timezone |
| GET | `/topics` | ✓ | P1 | topic list |
| POST | `/sessions` | ✓ | P1 | start PRACTICE (`topicSlug`), INCIDENT (`challengeId?`) or BASELINE → challenges without answer keys. Resumes an open session of the same kind |
| GET | `/sessions/:id` | ✓ | P1 | resume a session (items, answered state) |
| POST | `/sessions/:id/answers` | ✓ | P1 | submit an answer (`challengeId`, `stageIndex?`, `answer`) → evaluation + next stage |
| POST | `/sessions/:id/hint` | ✓ | P1 | reveal the hint for the current challenge/stage (halves its XP) |
| POST | `/sessions/:id/complete` | ✓ | P1 | finish → summary (idempotent) |
| GET | `/daily` | ✓ | P4 | today's circuit (creates it once) + its session |
| GET | `/users/me/progress` | ✓ | P4 | XP, level, streaks, per-topic mastery, weakest topic, recommendation |
| GET | `/users/me/sessions` | ✓ | P5 | paginated session history |
| GET | `/users/me/achievements` | ✓ | P5 | earned and locked achievements |
| GET | `/leaderboard/weekly` | ✓ | P5 | `?cursor=&limit=` ranking + `me` row |
| POST | `/duels` | ✓ | P5 | create duel → code + creator session |
| POST | `/duels/:code/join` | ✓ | P5 | join → opponent session |
| GET | `/duels/:id` | ✓ | P5 | status (participants only) |
| GET | `/duels/:id/result` | ✓ | P5 | scores + winner once both are done |

Changes from the brainstorm: endpoints are versioned under `/api/v1`. `POST /sessions/:id/answer`
became `/answers`. `GET /challenges/daily` became `GET /daily`, because it returns a circuit plus a
session, not a challenge. `PATCH /users/me` was added for onboarding. See D-009.

---

## P0 — Docs and plan
- [x] PRD, architecture, build plan, decisions log, CLAUDE.md, TODOS.md, .gitignore.
- [x] Move `luna-idea.md` into `docs/` unchanged.
- [x] Product design spec in `docs/product/` (approved).

## P1 — Backend core: foundation, auth, content, challenge engine  *(backend review)*
Lean backend (D-015): correct where it matters, without the extra hardening.
1. Root npm workspaces (`app`, `server`, `shared`), ESLint + Prettier + tsconfig base, root `lint` and `typecheck` scripts.
2. `shared/`: Zod schemas + types for the auth, topics, sessions and answers contracts, plus the envelope.
3. `server/` skeleton: config (Zod env), pino, helmet, cors, JSON limit, error envelope + `AppError`, 404, `/health`.
4. Mongo connection + models: User, Topic, Challenge (incl. incident stages), Session, AnswerAttempt, XpEvent, UserTopicProgress.
5. Auth: register, login (bcrypt + JWT), `requireAuth`, rate limit on `/auth/*`, `GET/PATCH /users/me`.
6. Question bank: 5 topics, 50 single challenges + 8 incidents (`docs/product/game-modes.md` §5), with an idempotent seed.
7. Session engine: start PRACTICE / INCIDENT / BASELINE, submit answer (server evaluation, public projection without answer keys,
   unique attempt index, first-correct XP ledger), complete (idempotent summary).
8. `.scratch/api-tests/` smoke tests: auth happy path + duplicate, answer key never in responses, double submit → 409, XP not awarded twice.

## P2 — App foundation, design system, auth and onboarding UI  *(manual test)*
1. Expo app (TypeScript) in `app/`, wired to `shared/`. Fonts (Shippori Mincho, Inter, JetBrains Mono), theme tokens from `docs/product/ui-design.md`.
2. Core components: Screen, Button, TextField, Card, ProgressLine, MoonPhase, YokaiAvatar (8 masks), Lantern, EmptyState, ErrorState, WakingServer.
3. API client (timeout, GET retry, envelope parsing, cold-start detection) + TanStack Query + auth store (Zustand + SecureStore).
4. React Navigation: RootNavigator → AuthStack / OnboardingStack / MainTabs (Dojo, Explore, Duel, Profile).
5. Screens: Welcome, Register, Login, onboarding (username, avatar, topics, level), placeholder tabs.

## P3 — Game UI  *(manual test)*
1. Explore: 5 topic moons → Topic Practice. Solo Incident Room entry.
2. Challenge screen shell (progress line, leave, resume via `GET /sessions/:id`), OptionRow, CodeBlock/CodeLine.
3. Modes: Trace, Bug Hunt, Engineer's Choice, Incident Room (stages, evidence reveal, Incident Report).
4. Feedback sheet (stamp, XP count-up, explanation, misconception), haptics, Reduce Motion support.
5. Session summary (grade moon, per-topic rows, revisits). Error, empty and offline states.

## P4 — Progression  *(backend review for the server part, manual test for the UI)*
1. Server: level calculation, bonuses (Kata, perfect, first incident, streak milestones), streak manager (timezone).
2. Server: mastery phases, adaptive difficulty, revisit queue, weakest topic, `GET /users/me/progress`.
3. Server: Daily Kata (`GET /daily`, unique per user per day, composition, fallbacks), baseline effect, Checkpoint session.
4. UI: Dojo home (moon, Begin kata, weakest blade), rank-up moment, lantern, baseline step in onboarding, Checkpoint card.
5. Smoke tests: streak (same day, next day, gap), daily kata created once, XP bonus once.

## P5 — Competition and profile  *(backend review for the server part, manual test for the UI)*
1. Server: Dojo Board (weekly aggregation, pagination, `me` row, last week's top 3), achievements, session history.
2. Server: Duels (create + code, atomic join, not your own, expiry/forfeit, result, win bonus cap).
3. UI: Dojo Board, Duel tab (create/share, join by code, list tabs, waiting), Duel Result (clash animation), Profile.
4. Smoke tests: duel join race (only one opponent), non-participant → 404, tie-break by time.

## P6 — Polish, deploy and demo prep  *(manual test)*
1. Deploy the API to Render + Atlas prod. Seed prod. Check `/health`.
2. Motion and polish pass against `ui-design.md` §6, accessibility labels, small-screen check.
3. Network failure pass: airplane mode, Render cold start, token expiry → login.
4. Full acceptance checklist (PRD criteria 1–12) with two accounts. `README.md` with setup + demo script. Metrics script.
