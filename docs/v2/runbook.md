# V2 phase runbook (read this first, every phase)

Each V2 phase runs in a **fresh context** (a new `claude -p` session from `scripts/v2/run-phases.sh`, or a fresh
sub-agent). The session knows nothing except what is in the repo. Follow these steps exactly.

## 1. Read (in parts, only what you need)

1. `CLAUDE.md` (project rules: phases, no PRs, tests only in `.scratch/api-tests/`, no `answerKey` to the client).
2. `docs/v2/plan.md` and your phase file `docs/v2/phases/p<n>-*.md`.
3. `docs/architecture.md` sections relevant to the phase, and the last 3 entries of `docs/decisions.md`.
4. `DESIGN.md` before any UI work.

## 2. Branch

```bash
git checkout main && git pull --ff-only
git checkout -b phase/p<n>-<slug>   # name from the phase file
```

If the branch already exists (an earlier run was interrupted), check it out, merge `main` into it, read
`git log main..HEAD` to see what is done, and continue from there instead of starting over.

Set the phase to `building` in `docs/prd.md` §9.

## 3. Build

- One commit per task, conventional commits (`feat(duels): ...`). Push the branch after each commit.
- Before every commit: `npm run lint`, `npm run typecheck`, and the affected tests in `.scratch/api-tests/`.
  Full suite before the last commit: `cd .scratch/api-tests && npx vitest run`.
- Tests go **only** in `.scratch/api-tests/` (gitignored). Add tests for every new behaviour and edge case listed in the
  phase file.
- Follow the engineering standards in `~/.claude/CLAUDE.md` (layers, config in `server/src/config`, Zod at boundaries,
  idempotency, atomic updates, no magic numbers).
- Log each real decision in `docs/decisions.md` (next free `D-0xx` number, full prose, for a learner).
- Never commit secrets. Check `git status` before committing.

## 4. Definition of done (all must hold before merging)

1. Every task in the phase file is done, or explicitly moved to `TODOS.md` with a reason.
2. `npm run lint` and `npm run typecheck` pass for all workspaces.
3. The full `.scratch/api-tests` suite passes (old tests too, updated only when the phase intentionally changed behaviour).
4. Backend phases: one backend code review of `git diff main...HEAD` (a `caveman:cavecrew-reviewer` agent, or a careful
   self-review if agents are unavailable). Fix every critical and high finding; note the rest in `TODOS.md`.
5. Content phases: `npm run audit:content -w server` passes with no errors.
6. Docs updated: `prd.md` §9 status `shipped`, `architecture.md` where the build changed, a `decisions.md` entry for the phase.

## 5. Report (on the branch, before merging)

Append one block to `docs/v2/progress.md` and commit it on the branch as `docs(v2): P<n> progress`:

```
## P<n> — <name> — DONE | BLOCKED (YYYY-MM-DD)
- Built: ...
- Tests: <count> passed, lint + typecheck clean
- Review: <verdict, what was fixed>
- Follow-ups: ...
```

If blocked, write BLOCKED with the reason, push the branch, do **not** merge, and stop.

## 6. Merge and push (no PR)

```bash
git checkout main && git pull --ff-only
git merge --no-ff phase/p<n>-<slug> -m "Merge phase/p<n>-<slug>: <one line>"
npm run lint && npm run typecheck && (cd .scratch/api-tests && npx vitest run)   # re-check on main
git push origin main && git push origin phase/p<n>-<slug>
```

If any check fails on `main`, fix it on the branch, merge again, re-check. Never force-push.
