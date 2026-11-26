# P12 — Question bank: Debugging production (`debugging-prod`), plus the full-bank audit

Branch: `phase/p12-bank-debug`. Content phase. Plan: `docs/v2/plan.md` §3–§4. Rubric: `docs/product/benchmarks.md` "Question levels".

## Tasks (one commit per topic, plus one for incidents)

1. Read the topic's existing file in `server/src/seed/content/` (debuggingProd.ts) and the incidents in `incidents.ts`.
   Keep V1 questions that meet the benchmark; fix or re-level weak ones (keep their slugs so player history stays valid).
2. Fill every cell to target: **6 Trace, 6 Bug Hunt, 6 Engineer's Choice at each of difficulty 1, 2 and 3** (54 singles
   per topic). Split a topic file into `content/<topic>/{trace,bugHunt,choice}.ts` if it passes ~400 lines, and update
   `content/index.ts`.
3. **4 incidents per topic** (difficulty 1, 2, 2, 3), each with 3 stages that build on each other and a root cause.
4. Cover the topic's subtopics broadly (list them in the decisions entry). Each level must test what its benchmark row says:
   beginners one concept, intermediates two interacting concepts, advanced production edge cases.
5. Quality pass before committing each file: re-read every question as a player of that level. Check the answer is
   unambiguously right on current Node/Postgres/Redis, each distractor is a real misconception, explanations say why the
   others are wrong, answer positions are spread (author with `opts()` and vary which id is correct), and the correct
   option is not the longest by habit.
6. Run `npm run audit:content -w server` (no errors; this phase's topics have no under-target cells) and
   `npm run seed -w server` against the local/test DB if a `.env` exists, otherwise rely on the seed-schema test.

## Tests

- The existing seed/content tests pass. Add one test that the seeded bank has ≥ 54 singles and 4 incidents per finished topic.
- Re-run the P9 variety tests on the new bank.

## Extra for P12

- Run `npm run audit:content -w server -- --strict` across **all five topics**: 270 singles + 20 incidents, no errors,
  no under-target cells. Fix any skew warnings across the bank.
