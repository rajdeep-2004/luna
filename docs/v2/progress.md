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
