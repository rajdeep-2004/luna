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
| GET | `/duels` | ✓ | P5 | the Duel screen's tabs: `yourTurn`, `waiting`, `finished` (last 20) |
| POST | `/duels` | ✓ | P5 | create duel → code (max 5 live per creator) |
| POST | `/duels/join` | ✓ | P5 | `{ code }` → join atomically (rate-limited per IP) |
| GET | `/duels/:id` | ✓ | P5 | status, and the result with per-question ✓/✗ once ended (participants only) |
| POST | `/duels/:id/play` | ✓ | P5 | start or resume my DUEL session on the shared set |

Changes from the brainstorm: endpoints are versioned under `/api/v1`. `POST /sessions/:id/answer`
became `/answers`. `GET /challenges/daily` became `GET /daily`, because it returns a circuit plus a
session, not a challenge. `PATCH /users/me` was added for onboarding. See D-009. P5 changed the
duel endpoints (code in the body, a separate `play` step, the result folded into `GET /duels/:id`,
and a list endpoint); see D-032.

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

> P6 status: tasks 1 (deploy) and the README are done. Tasks 2–4 move to after P7, so the demo shows the new
> design (D-037).

## P7 — Game redesign  *(backend review for the server part; checkpoint after task 4; manual test against `docs/design/kirie-preview.html`)*

**Goal.** Rebuild the app to `DESIGN.md` (Kiri-e Den) so Luna feels like a game, and add the two server features
the redesign needs: duel formats and topic + mode rounds. Every screen is judged against the approved preview,
not only against a functional checklist (D-037, D-038). Decisions for this plan: D-039.

### Engineering approach
- **Theme swap without breaking the build.** `app/src/theme` gets the new tokens (`ground`, `tatami`, `wood`,
  `text`, `shoji`, `muted`, `primary`, `seal`, `night`…) and roles (`display`, `title`, `number`, `question`, `body`,
  `button`, `label`, `mono`). The 28 files that use the old names keep compiling through temporary aliases
  (`moon → primary`, `ember → seal`…), which are deleted in the last task, so `tsc` lists every straggler.
- **Fonts.** Add `@expo-google-fonts/dela-gothic-one` and `@expo-google-fonts/source-sans-3`; remove
  `shippori-mincho` and `inter`. JetBrains Mono stays. Net bundle change is about +2.7 MB, −1.5 MB.
- **Brush kanji as data, not a font.** A dev-only script (`app/scripts/bake-kanji.mjs`, using `opentype.js` as a
  devDependency) reads the Yuji Boku TTF and writes `app/src/art/kanji.ts`: one SVG path per glyph for the ~30
  glyphs we use (the 19 rank characters, 正 誤 勝 今日 道 刀 雷 一 月 and the grade stamps). The generated file is
  committed; the script is re-run only when a glyph is added. The app never ships the 8.6 MB font.
- **Art kit as components.** `app/src/art/` holds every cut-paper drawing as a `react-native-svg` component that
  takes props (state, size, colour), built on one shared 390-wide grid so scenes scale with screen width:
  `DojoScene` (wall, shoji, moon, floor), `Lantern(streak)`, `RankScroll(kanji, progress)`, `EmaPlaque(rank)`,
  `KataScroll(state)`, `MaskStand`, eight `YokaiMask`s redrawn in kiri-e style, `TabIcon(name, active)`,
  `ModeArt(mode)`, `TopicBanner(slug)`, `BladeKanji(format)`, `Crest(key, earned)`, `HankoStamp(glyph, tone)`,
  `Enso(progress)`. Animations use Reanimated shared values on SVG props via `createAnimatedComponent`.
- **Interaction kit.** `PressableSink` (a 2 pt sink plus a selection haptic, `android_ripple` disabled) is the base
  for every tappable. `Button` becomes the amber wooden block with its 4 pt offset. A custom `tabBar` replaces React
  Navigation's default bar. One `useReduceMotion` gate covers every animation.
- **Scenes are layout.** A scene component draws the art, and the interactive objects are absolutely positioned
  `PressableSink`s on the same 390 grid, each with an accessibility label (for example "Streak: 4 days. Lantern."),
  so the room stays usable with a screen reader.
- **No new state libraries.** TanStack Query and Zustand as today. Server contracts change only where listed below.

### Server changes (`shared/` contract first, then server, then API tests)
1. **Topic + mode rounds.** `StartSessionRequest` PRACTICE gains an optional `mode` (`TRACE` | `BUG_HUNT` |
   `ENGINEER_CHOICE`); INCIDENT gains an optional `topicSlug` (the "boss" of that topic; falls back to any
   incident). `pickPractice` with a mode takes that topic's challenges of that mode first (unseen first, at the
   player's difficulty), then **tops up to 5 from the same mode in other topics** (D-039). Each item says which
   topic it came from. The open-session unique index gains `mode` so two different mode rounds can be open at once.
2. **Duel formats** in `config/game.ts`:
   - `CLASSIC`: 5 questions, 60 s each, the current slots.
   - `BLITZ`: 10 single challenges, 10 s each, 2 s network grace.
   - `SUDDEN_DEATH`: up to 10 questions, 30 s each, and the run ends at the first miss. Score = correct before
     the miss, then lower total time (D-039).

   `Duel.format` and `POST /duels { format }` (default `CLASSIC`). The selection and timer read the format.
   For Sudden Death, a wrong answer or timeout marks the session `endedEarly`, and `sessionReadyToComplete`
   becomes true. `completeSession` accepts fewer answers than the total only when `endedEarly` is set.
   `compareResults` is unchanged (it already compares correct answers, then time). The win bonus and its cap
   are the same for every format.
3. **Player stats for the Profile.** `GET /users/me/progress` gains
   `stats: { katasCompleted, duelsWon, duelsLost, duelsDrawn }`, from counts on existing collections. These are
   bounded indexed counts, with no new writes. Topic mastery stays in the API (the Daily Kata selection uses it)
   but leaves the Profile.
4. **API smoke tests** (`.scratch/api-tests/`): a mode round tops up from other topics and never repeats inside a
   round; a boss incident is picked per topic; each duel format has the right size and timer; Sudden Death ends on
   the first miss and can be completed early, but a normal session still can't be; the stats counts are right.

### Tasks (one commit each; lint, typecheck and the full API suite before every commit)
1. **Foundation:** theme tokens with aliases, the two new fonts, the kanji bake script and `kanji.ts`,
   `PressableSink`, the new `Button`, `useReduceMotion`, the custom tab bar with the four cut-paper icons.
   No more grey ripple anywhere.
2. **Art kit, part 1:** `DojoScene`, `Lantern`, `RankScroll` + `Enso`, `EmaPlaque`, `KataScroll`, `MaskStand`, the
   eight `YokaiMask`s redrawn in kiri-e style, `HankoStamp`.
3. **Dojo:** the room as the home screen. The objects are the controls (the kata scroll begins or reviews today's
   kata, the ema opens the Board, the lantern and scroll open Profile), the moon arc shows time to the reset, and
   a Checkpoint arrives as a letter. "Coming home" and "lantern relight" animations. Loading is a breathing
   lantern; the error state sits inside the room.
4. **Game screens:** the challenge header (position as brush marks, the duel countdown as a burning incense
   stick), the hanko strike on every answer, a feedback sheet with the explanation collapsed, a summary with the
   grade stamp, XP count-up and lantern relight, and the rank-up moment (a katana draw, then the brushed kanji).
   **→ CHECKPOINT: stop and report.** Rajdeep judges the Dojo and one game round on the phone against the
   preview before anything else is rebuilt.
5. **Server: mode rounds + boss incident** (server changes 1, with tests).
6. **Explore:** topic banners, then the mode list with `ModeArt` and the boss stage, wired to task 5.
7. **Server: duel formats + Sudden Death + player stats** (server changes 2–3, with tests).
8. **Duel:** the face-off header, the three blades, six-cell code entry, the lists, Duel Result with the clash
   animation and ✓/✗ per question; Blitz and Sudden Death in the challenge screen.
9. **Profile + Dojo Board:** the warrior sheet (banner mask, rank kanji in the ensō, four trophies, crests, recent
   runs stamped) and Board rows with medals and the pinned own row.
10. **Auth and onboarding restyle:** Welcome as the shoji opening, mask picking on a rack, and "Waking the dojo…"
    for cold starts.
11. **Cleanup:** remove the token aliases and dead components (`MoonPhase` uses, the old `Card` on main screens),
    update `architecture.md` (§4 layout, the duel and session sections) and the PRD wording to the game
    positioning, and log the final decisions entry.

### Check
- **Backend:** one backend code review of the server diff (tasks 5 and 7) before the merge.
- **Frontend:** a click-through checklist after task 4 and at the end. Each screen is compared with
  `docs/design/kirie-preview.html` for feel (density, motion, no cards, no grey ripple), as well as for function.
- **Accessibility:** every scene object has a label; check Dynamic Type at 1.3x; run every animation once with
  Reduce Motion on.

### Risks
- **SVG performance on older Android:** scenes are static paths with a few animated props. Keep each scene under
  ~150 paths and animate transforms and opacity, not path data (only the brushed rank-up kanji animates
  `strokeDashoffset`).
- **Small phones (SE-size, 667 pt tall):** the room is drawn on a 390 × 714 grid. Below ~700 pt the floor band
  shrinks first and the kata button stays above the fold. Check on the smallest device in task 3.
- **Scope:** this is the largest phase so far. The checkpoint after task 4 is the guard. If the feel is wrong
  there, only foundation work is lost.
