# P15 — V2 hardening and release docs

Branch: `phase/p15-v2-hardening`.

## Tasks

1. Full regression: lint, typecheck, full API suite, `audit:content --strict`, `npm run build -w server`.
2. Backend review of everything V2 changed (`git diff <commit before P9>...HEAD -- server shared`); fix critical/high.
3. Docs describe what is built: `prd.md` (V2 features: F-16 bank size, F-10/F-04 variety, F-18 live duels; non-goal
   "real-time multiplayer" removed per Rajdeep's V2 brief; phase table), `architecture.md` (live duel flow, socket layer,
   recovery, scaling), `docs/product/competition.md` and `game-modes.md` (live duel rules), README (V2 section, test count).
4. `VERSION`/package versions → 2.0.0 where the repo keeps versions; `app.json` version 2.0.0. No EAS build (needs
   Rajdeep's account) — add the build command to `TODOS.md`.
5. Final decisions entry summarising V2: what shipped, what was cut, what to revisit.
6. **Content quality pass (whole bank).** Re-read every difficulty-3 question and flag any that a beginner could
   answer by eliminating obviously bad options (e.g. `http-breaking-change`: three of its options are plainly
   harmful). Rewrite those distractors into plausible senior-level mistakes, or re-level the question to 1–2 and
   write a replacement at level 3. Keep slugs. Re-run `audit:content --strict`.
