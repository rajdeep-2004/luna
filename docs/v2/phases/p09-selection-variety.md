# P9 — Selection variety, level rubric, content audit

Branch: `phase/p9-selection-variety`. Backend phase. Plan: `docs/v2/plan.md` §3–§5.

## Tasks

1. **Level rubric in the product docs.** Copy the §3 benchmark table and the question rules into
   `docs/product/benchmarks.md` (new section "Question levels") so content phases have one reference.
2. **Content audit tool** `server/src/seed/audit.ts` + script `audit:content` in `server/package.json` (run with tsx).
   It loads `seed/content` through the existing Zod schema and reports, per topic × type × difficulty, the count versus
   target (6 singles per cell, 4 incidents per topic with 1/2/1 levels; targets in `server/src/config/game.ts` as
   `CONTENT_TARGETS`). Errors (exit 1): duplicate slugs, duplicate prompt+snippet, invalid Bug Hunt line, an Engineer's
   Choice option without `optionFeedback`. Warnings: answer-key position skew (any of a–d > 40 % of a topic's 4-option
   questions), correct option the strictly longest in > 50 % of a topic's questions, cell under target. A `--strict` flag
   turns "cell under target" into an error (used from P12 on). It is a dev tool only: never imported by the server.
3. **Weighted random sampling.** Add `server/src/lib/sampling.ts`: `weightedPick(items, weightFn, rng)` and
   `sampleWithoutReplacement`, with an injectable `rng: () => number` (default backed by `crypto.randomInt`). Weight =
   `exp(-score / SELECTION.temperature)`. Put `SELECTION` (temperature, recent-window) in `config/game.ts`.
4. **Use it everywhere a set is picked:** `daily.selection.ts` (each slot sampled instead of "best score"),
   `sessions.selection.ts` (`rank` → sampled order for practice/mode rounds, incidents, checkpoint, baseline) and
   `duels.selection.ts`. Keep the existing hard rules: revisits first, unseen before seen, topic spread, difficulty nearness.
5. **"Seen" includes recently served.** A challenge served in one of the player's sessions in the last
   `SELECTION.recentDays` days but not answered (abandoned session) counts as seen for ranking, so quitting and restarting
   a round does not replay the same questions. Bounded query, uses an existing index or adds one.
6. **Daily Kata stays stable per day** (already stored per user + date): verify reopen returns the same set; concurrent
   first opens still build one set (existing unique index).

## Tests (in `.scratch/api-tests/`)

- Two users with identical profiles and history: Daily Kata sets differ (seed a bank large enough; run with a fixed RNG
  pair, and also a statistical test over 20 users: mean pairwise overlap < 2 of 5).
- Practice rounds for two identical users differ; two consecutive practice rounds for one user prefer unseen questions.
- Reopening today's kata returns the same ids. Abandoned-then-restarted practice avoids the just-served questions.
- `weightedPick` unit tests: respects weights statistically, never picks weight-0, empty input → null.
- Audit tool: a fixture with a duplicate slug exits 1.
