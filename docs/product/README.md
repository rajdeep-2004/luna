# Luna — Product Design

> Status: **approved** by Rajdeep — 2026-11-22.
> Once approved, `docs/prd.md` and `docs/architecture.md` are updated to match, and these files
> become the source of truth for *how the game works*. Engineering docs describe *how it's built*.

This folder holds the product decisions that the engineering docs depend on: who the players are,
how each game works, how long things take, how scoring and levels work, and how competition and
benchmarking work. Writing them down before any code means the build doesn't have to be redone
when a rule changes.

## The theme: a night dojo

**Luna** (the moon) + **the dojo** (where samurai train). The player is a student training their
engineering blade at night. Two systems carry the theme:
- **Levels** are samurai ranks, from *Deshi* (apprentice) to *Shogun*. They measure how much you
  have trained (XP).
- **Topic mastery** is shown as **moon phases**, from 🌑 new moon to 🌕 full moon. It measures how
  well you know each topic (accuracy).

The two never mix. Rank means effort. The moon means skill.

The theme lives in names, icons and copy. The challenges themselves stay plain, precise English,
because a learner must never have to decode the theme to understand a technical question.

## Files

| File | Answers |
|---|---|
| [users.md](users.md) | Who plays, which user types we design for, what each one needs |
| [game-modes.md](game-modes.md) | The 4 challenge types, session types, durations, timers, hints, content counts |
| [scoring.md](scoring.md) | XP per answer, bonuses, anti-farming rules, accuracy, incident grades, duel scores |
| [progression.md](progression.md) | Levels and the XP curve, moon-phase mastery, streaks, achievements, adaptive difficulty |
| [competition.md](competition.md) | Weekly leaderboard, tiers, Friend Duels and their rules |
| [benchmarks.md](benchmarks.md) | Skill benchmarking (baseline and checkpoint), product targets, competitor benchmark |

## Decisions Rajdeep needs to make

Each file ends with its own "Decide" list. These are the important ones:

1. **Level names:** samurai ranks (`progression.md` §1). Approve them, or swap some.
2. **10 levels instead of 5,** with the XP curve in `progression.md` §1.
3. **Themed feature names:** Daily Circuit → **Daily Kata**, and others (table below).
4. **The timer** is a countdown only in duels. Practice and the Daily Kata are untimed (`game-modes.md` §4).
5. **Review XP:** repeat answers earn a small amount of XP, only inside the Daily Kata (`scoring.md` §2).
6. **Duels** are 5 single challenges with no Incident Room (`competition.md` §2).
7. **Checkpoint assessment** is a re-test after 7 active days. **This is new scope** (`benchmarks.md` §1).

## Naming proposal

| Thing | Brainstorm name | Proposed Luna name | Why |
|---|---|---|---|
| App | StackSprint | **Luna** | Decided |
| Daily Circuit | Daily Circuit | **Daily Kata** | A *kata* is the set of moves a martial artist practises every day, which is exactly what this is |
| Trace the Stack | — | Trace the Stack (keep) | Mode names stay in plain English so new users know what to expect |
| Bug Hunt | — | Bug Hunt (keep) | Same |
| Engineer's Choice | — | Engineer's Choice (keep) | Same |
| Incident Room | — | Incident Room (keep) | Same. It's the signature mode, so it should be instantly clear |
| Friend Duel | — | **Duel** | Short, and it already fits the theme |
| Weekly leaderboard | — | **Dojo Board** | A weekly ranking of the dojo |
| Levels | Rookie → Engineer | Samurai ranks | See `progression.md` |
| Topic mastery | New → Strong | Moon phases 🌑🌒🌓🌕 | See `progression.md` |
| Avatars | "preset" | Yokai masks: 🦊 Kitsune, 🦝 Tanuki, 👹 Oni, 👺 Tengu, 🐱 Neko, 🐉 Ryu, 🐰 Usagi, 🐢 Kappa | *Usagi*, the moon rabbit, ties back to Luna |
| Tagline | Train your engineering brain | **"Sharpen your engineering blade."** | Matches the theme |
