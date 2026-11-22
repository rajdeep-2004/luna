# Luna

A mobile app for CS students to train engineering intuition through short game-like challenges
(Trace the Stack, Bug Hunt, Engineer's Choice, Incident Room). Details in `docs/prd.md`. Game rules (levels, scoring, modes, competition): `docs/product/`.

Delivery setup: `docs/architecture.md` §0. Engineering standards: `~/.claude/CLAUDE.md`.
Phase tasks: `docs/build-plan.md`. Original brainstorm: `docs/luna-idea.md` (do not edit).

## Stack
- App: Expo + React Native + TypeScript, **React Navigation** (not Expo Router), TanStack Query, Zustand, expo-secure-store
- Backend: Node.js + Express 5 + TypeScript, Zod, pino
- Database: MongoDB Atlas + Mongoose
- Shared: `shared/` Zod schemas + types for the API contract
- Testing: Vitest + Supertest + mongodb-memory-server, in gitignored `.scratch/api-tests/`
- Infra: Render (API) + Atlas M0 + Expo Go. No Docker, no CI
- Package manager: npm workspaces

## Commands (once P1/P2 exist)
```bash
npm install                         # install all workspaces
npm run dev -w server               # API on :8080
npm run start -w app                # Expo dev server
npm run seed -w server              # load the question bank
npm run lint && npm run typecheck   # run before every commit
cd .scratch/api-tests && npx vitest run   # local API tests (not in git)
```

## Project-specific rules (override ~/.claude/CLAUDE.md)
- Work in **phases**, not milestones: branch `phase/p<n>-<slug>`. When a phase is done, merge it
  into `main` and push. **No pull requests, no /ship.**
- No TDD requirement. Backend API tests go **only** in `.scratch/api-tests/` (gitignored), never in the pushed repo.
- Backend phases: one backend code review before the merge. No UI reviewer on backend code. Keep review agents minimal.
- Frontend: give Rajdeep a click-through checklist. No automated UI reviewers or browser scripts.
- Never send `answerKey` to the client. All game logic (evaluation, XP, streaks) is server-side.
- Only `server/src/config` reads `process.env`. Game constants live in `server/src/config/game.ts`.
