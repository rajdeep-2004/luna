# Competition

V1 has **two** kinds of competition. Both are asynchronous, so nobody needs to be online at the
same time.

| Type | Against | Window | Motivation |
|---|---|---|---|
| **Dojo Board** (weekly leaderboard) | Everyone registered | One week | Steady effort: "climb this week" |
| **Duel** | One friend, by invite code | Up to 48 hours | Direct rivalry: "I beat you" |

**Cut from V1:** the daily leaderboard (the brainstorm mentions it once), leagues with
promotion and relegation, and public matchmaking. Why: a capstone has 10–50 users. Duolingo-style
leagues need about 30 active people per group to feel alive, so with 15 users they would just feel
empty. These ideas are parked in `TODOS.md`.

## 1. Dojo Board (weekly)

- **Ranks by XP earned this week**, not total XP. A new user can beat a veteran this week, which
  keeps the board from being exclusive (a brainstorm principle).
- **Week:** Monday 00:00 → Sunday 23:59 **UTC**, the same for everyone. Countdown on screen:
  "Resets in 2d 4h".
- **Who appears:** anyone with at least 1 XP this week.
- **Row:** rank · yokai avatar · username · rank title (e.g. *Ronin*) · weekly XP.
- **Ties:** the user who reached that XP first ranks higher.
- **List:** top 50, paginated, plus your own row pinned at the bottom if you're not in view.
- **Tier shown = the user's level rank** (Deshi → Shogun). This replaces the brainstorm's
  "league or tier" without needing a league system.
- **Last week's top 3** get a small 🥇🥈🥉 badge next to their name for the following week.
  It's cheap to build and gives the reset a moment.
- Empty state (Monday morning): "The dojo is quiet. Be the first on the board this week."

## 2. Duels

### Flow
1. **Create:** A taps *Start a Duel* → the server picks 5 single challenges (no Incident) → A gets a
   **6-character code** (e.g. `KX7P2M`, no 0/O/1/I) and a share button.
2. **A plays** immediately (or later, within 48 hours).
3. **Join:** B enters the code → plays the same 5 challenges, in the same option order.
4. **Result:** when both have finished, both see the result. Whoever finishes first sees "Waiting for
   @friend..." until the other one finishes.

### Rules
| Rule | Value |
|---|---|
| Questions | 5 single challenges: 1 Trace, 1 Bug Hunt, 3 Engineer's Choice |
| Difficulty | The creator's average topic difficulty, rounded. Both players get the same set |
| Topics | Mixed, from all 5 topics |
| Timer | 60 s countdown per challenge. Timeout = wrong |
| Hints | None |
| Score | Correct answers (0–5). Tie → lower total time. Exact tie → draw |
| Expiry | 48 h after creation. If nobody joined: *Expired*. If the opponent joined but didn't finish: the creator wins by default |
| Open duels per user | Max 5 at once (prevents spam) |
| Self-join | Not allowed |
| Re-join | One opponent only. A second person using the code is told "This duel is already taken" |
| XP | Normal first-correct XP for each answer + 10 for a win (max 3 per day) |
| Visibility | Only the two participants can see a duel |

### Result screen
Both avatars face each other, with scores (`4 – 3`), per-question ✓/✗ for both players, total
times, and the winner's banner: "**@rajdeep** wins the duel ⚔️". Buttons: *Rematch* (creates a new
duel and shares the new code) and *Back home*.

### Duel list (on the Duel screen)
Tabs: **Your turn** (joined but not played) · **Waiting** (you finished, they haven't) ·
**Finished** (the last 20).

## Decide
- [ ] Is leaving the daily leaderboard and leagues out of V1 OK?
- [ ] Do the duel rules work for you (5 questions, no incident, 60 s timer, 48 h expiry, forfeit rule)?
- [ ] Should last week's top 3 get badges? (small, optional)
