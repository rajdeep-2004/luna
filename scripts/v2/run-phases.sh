#!/usr/bin/env bash
# Runs the V2 phases one after another, each in a FRESH headless Claude Code session.
#
# Why a script: /clear and /compact are interactive slash commands; a session cannot run them on
# itself. Starting a new `claude -p` process per phase gives the same effect as /clear (the phase
# starts with an empty context and reads only what it needs from the repo). Inside a phase, Claude
# Code compacts automatically when the context fills, which is what /compact does by hand.
#
# Each phase follows docs/v2/runbook.md and records DONE/BLOCKED in docs/v2/progress.md. The script
# stops at the first phase that does not end DONE on origin/main.
#
# Usage:
#   scripts/v2/run-phases.sh --list                 # show phases and their status
#   scripts/v2/run-phases.sh --dry-run              # print what would run, run nothing
#   scripts/v2/run-phases.sh [--from P10] [--only P11] [--model opus] [--mode auto]
#
# --mode is passed to `claude --permission-mode` (default: auto). Unattended runs may stall on a
# permission prompt in stricter modes; use bypassPermissions only if you accept that risk.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PHASE_DIR="$ROOT/docs/v2/phases"
PROGRESS="$ROOT/docs/v2/progress.md"
LOG_DIR="$ROOT/.scratch/phase-logs"
MODEL="opus"
MODE="auto"
FROM=""
ONLY=""
DRY_RUN=0
LIST=0
PHASE_TIMEOUT="${PHASE_TIMEOUT:-14400}" # seconds per phase (4 h)

usage() { sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from) FROM="${2:?--from needs a phase id like P10}"; shift 2 ;;
    --only) ONLY="${2:?--only needs a phase id like P10}"; shift 2 ;;
    --model) MODEL="${2:?}"; shift 2 ;;
    --mode) MODE="${2:?}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --list) LIST=1; shift ;;
    -h|--help) usage 0 ;;
    *) echo "unknown argument: $1" >&2; usage 1 ;;
  esac
done

# "p13-live-duel-server.md" -> "P13"
phase_id() { local n; n="$(basename "$1" | sed -E 's/^p0*([0-9]+)-.*/\1/')"; echo "P$n"; }
phase_num() { echo "${1#P}"; }

status_of() {
  local id="$1"
  if grep -Eq "^## $id .*— DONE" "$PROGRESS" 2>/dev/null; then echo DONE
  elif grep -Eq "^## $id .*— BLOCKED" "$PROGRESS" 2>/dev/null; then echo BLOCKED
  else echo todo; fi
}

# An interrupted session (usage limit, timeout) can leave uncommitted work. Commit it to the phase
# branch it was on, never to main, so the next run resumes from it (runbook §2).
save_wip() {
  local id="$1" branch
  cd "$ROOT"
  [[ -z "$(git status --porcelain)" ]] && return 0
  branch="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$branch" == main ]]; then
    echo "$id left uncommitted changes on main; stashing them (git stash list)" >&2
    git stash push -u -q -m "run-phases: $id leftovers"
    return 0
  fi
  git add -A && git commit -q -m "wip: $id interrupted, saved by run-phases.sh" && git push -q origin "$branch" || true
  echo "$id: saved uncommitted work to $branch"
}

PHASES=()
while IFS= read -r f; do PHASES+=("$f"); done < <(ls "$PHASE_DIR"/p*.md | sort -V)

if [[ $LIST -eq 1 ]]; then
  for f in "${PHASES[@]}"; do printf '%-4s %-8s %s\n' "$(phase_id "$f")" "$(status_of "$(phase_id "$f")")" "$(basename "$f")"; done
  exit 0
fi

command -v claude >/dev/null || { echo "claude CLI not found on PATH" >&2; exit 1; }
TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
mkdir -p "$LOG_DIR"

for f in "${PHASES[@]}"; do
  id="$(phase_id "$f")"
  [[ -n "$ONLY" && "$id" != "$ONLY" ]] && continue
  [[ -n "$FROM" && "$(phase_num "$id")" -lt "$(phase_num "$FROM")" ]] && continue
  st="$(status_of "$id")"
  if [[ "$st" == DONE ]]; then echo "$id already DONE, skipping"; continue; fi
  if [[ "$st" == BLOCKED ]]; then echo "$id is BLOCKED (see $PROGRESS). Fix it, remove the BLOCKED block, rerun." >&2; exit 2; fi

  rel="${f#"$ROOT"/}"
  prompt="You are running Luna V2 phase $id unattended in a fresh session. Read docs/v2/runbook.md and follow it exactly for the phase file $rel. Do every task, test, review, record the result in docs/v2/progress.md, merge into main and push as the runbook says. Do not start any other phase. Do not ask questions: decide, log the decision in docs/decisions.md, and continue. If truly blocked, record BLOCKED and stop."
  cmd=(claude -p "$prompt" --model "$MODEL" --permission-mode "$MODE")

  if [[ $DRY_RUN -eq 1 ]]; then
    echo "would run $id ($st): claude -p \"<runbook prompt for $rel>\" --model $MODEL --permission-mode $MODE"; continue
  fi

  log="$LOG_DIR/$id-$(date +%Y%m%d-%H%M%S).log"
  echo "▶ $id — fresh session, log: $log"
  (cd "$ROOT" && git checkout main -q && git pull --ff-only -q)
  if [[ -n "$TIMEOUT_BIN" ]]; then
    (cd "$ROOT" && "$TIMEOUT_BIN" "$PHASE_TIMEOUT" "${cmd[@]}" </dev/null >"$log" 2>&1) || echo "$id: claude exited non-zero (see log)"
  else
    (cd "$ROOT" && "${cmd[@]}" </dev/null >"$log" 2>&1) || echo "$id: claude exited non-zero (see log)"
  fi

  save_wip "$id"
  (cd "$ROOT" && git checkout main -q && git pull --ff-only -q)
  if [[ "$(status_of "$id")" != DONE ]]; then
    echo "✗ $id did not finish DONE on main. Stopping. Log: $log" >&2; exit 3
  fi
  echo "✓ $id DONE"
done
echo "All requested phases finished."
