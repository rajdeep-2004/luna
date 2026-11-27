# Competition

Luna has **two** kinds of competition. The Dojo Board is asynchronous. Duels are **live** since V2
(P13–P14, D-052): both players are online and play the same question at the same moment.

| Type                                | Against                    | Window                      | Motivation                       |
| ----------------------------------- | -------------------------- | --------------------------- | -------------------------------- |
| **Dojo Board** (weekly leaderboard) | Everyone registered        | One week                    | Steady effort: "climb this week" |
| **Duel** (live)                     | One friend, by invite code | One sitting (a few minutes) | Direct rivalry: "I beat you"     |

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
- **Row:** rank · yokai avatar · username · rank title (e.g. _Ronin_) · weekly XP.
- **Ties:** the user who reached that XP first ranks higher.
- **List:** top 50, paginated, plus your own row pinned at the bottom if you're not in view.
- **Tier shown = the user's level rank** (Deshi → Shogun). This replaces the brainstorm's
  "league or tier" without needing a league system.
- **Last week's top 3** get a small 🥇🥈🥉 badge next to their name for the following week.
  It's cheap to build and gives the reset a moment.
- Empty state (Monday morning): "The dojo is quiet. Be the first on the board this week."

## 2. Duels (live, V2)

V1 duels were asynchronous (each player played alone within 48 hours). Rajdeep's V2 brief made them live;
the V1 rules below were replaced, and old V1 duels were closed as _Expired_ by a boot migration.

### Flow

1. **Create:** A picks a format and taps _Challenge a friend_ → the server picks the questions (singles only,
   no Incident) → A gets a **6-character code** (e.g. `KX7P2M`, no 0/O/1/I), a share button, and waits in the
   lobby. The invite closes after **10 minutes**.
2. **Join:** B enters the code. Both phones show the face-off, then **3 · 2 · 1**.
3. **Play together:** each question appears on both phones at once with the format's timer. It ends when both
   have answered or the timer runs out. The rival's status shows ("thinking" / "answered"), never their pick.
4. **Reveal:** for about 3 s both see both results (正/誤 and time), the right option and one line of why; then
   the next question arrives by itself.
5. **Result:** after the last question (or the Sudden Death decider) both land on the result page.

### Formats (blades)

| Format       | Questions                                    | Timer per question | Ends early                                                                   |
| ------------ | -------------------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| Classic      | 5 (1 Trace, 1 Bug Hunt, 3 Engineer's Choice) | 60 s               | No                                                                           |
| Blitz        | 10 (kinds cycle)                             | 10 s               | No                                                                           |
| Sudden Death | up to 10 (kinds cycle)                       | 30 s               | At the first question where exactly one player is wrong. Both wrong: play on |

### Rules

| Rule        | Value                                                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Difficulty  | The creator's average topic difficulty, rounded. Both players get the same set, in the same option order                                                                                        |
| Topics      | Mixed, from all 5 topics, drawn at random per duel (two duels differ)                                                                                                                           |
| Timing      | The server owns the clock: it stamps each question's deadline and measures each response time. Answers are accepted until the deadline plus 750 ms for the network. No answer = timeout = wrong |
| Answers     | One per question, locked in on Strike. The right answer is never sent before that question's reveal                                                                                             |
| Hints       | None                                                                                                                                                                                            |
| Score       | Correct answers. Tie → lower total server-measured time. Exact tie → draw                                                                                                                       |
| Lobby       | Closes after 10 min, or when the creator cancels, or when the creator is offline for 60 s. A joiner offline 60 s frees the seat                                                                 |
| Disconnects | A player who drops keeps their seat for 20 s (missed questions are timeouts). After that they lose by forfeit. Both gone → _Abandoned_, no result                                               |
| Leaving     | ✕ / Back asks first: _Cancel the duel?_ in the lobby, _Forfeit the duel?_ in a match                                                                                                            |
| Limits      | One open lobby per user, one live match per user. Two devices: the newest one holds the seat                                                                                                    |
| Self-join   | Not allowed                                                                                                                                                                                     |
| Re-join     | One opponent only. A second person using the code is told "This duel is already taken"                                                                                                          |
| XP          | Normal first-correct XP for each answer + 10 for a win (max 3 per day, not for a win by forfeit)                                                                                                |
| Visibility  | Only the two participants can see a duel or join its room                                                                                                                                       |

### Result screen

The seal for the winner, scores (`4 – 3`), per-question 正/誤 and time for both players, total times, and
"+10 XP win bonus" for the winner. A forfeit shows "You win by default" / "You lost by default". Buttons:
_Rematch_ (creates a new duel and shares the new code) and _Back home_.

### Duel list (on the Duel screen)

Tabs: **Live** (your open lobby or a match in progress; tap to go back in) · **Finished** (paged, "Older duels").

## Decide

- [ ] Is leaving the daily leaderboard and leagues out of V1 OK?
- [x] Duel rules: replaced by live duels in V2 (D-047, D-052).
- [ ] Should last week's top 3 get badges? (small, optional)
