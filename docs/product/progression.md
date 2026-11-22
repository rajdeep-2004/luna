# Progression

## 1. Levels — samurai ranks (XP)

**10 levels** instead of the brainstorm's 5. With only 5, an active user would reach the top level
within two weeks and have nothing left to aim for. With 10, a new user still levels up on day one,
and the top rank takes about a month of daily play.

| Lvl | Rank | Kanji | Meaning | Total XP needed | Roughly when (daily player) |
|---:|---|---|---|---:|---|
| 1 | **Deshi** | 弟子 | Apprentice | 0 | Sign-up |
| 2 | **Ashigaru** | 足軽 | Foot soldier | 50 | Day 1 (first Kata) |
| 3 | **Ronin** | 浪人 | Wandering blade | 150 | Day 2 |
| 4 | **Bushi** | 武士 | Warrior | 300 | Day 3–4 |
| 5 | **Samurai** | 侍 | Samurai | 500 | ~Day 6 |
| 6 | **Hatamoto** | 旗本 | Banner guard | 750 | ~Day 9 |
| 7 | **Kenshi** | 剣士 | Swordmaster | 1,050 | ~Day 13 |
| 8 | **Sensei** | 先生 | Master teacher | 1,400 | ~Day 19 |
| 9 | **Daimyo** | 大名 | Lord | 1,800 | ~Day 26 |
| 10 | **Shogun** | 将軍 | Supreme commander | 2,300 | ~Day 35+ (needs streaks + duels) |

- Level 10 is the cap for V1. XP keeps counting after it.
- Each level-up shows a full-screen moment: "Rank up — you are now **Ronin** 浪人".
- The rank name is displayed with your avatar everywhere: on Home, the Dojo Board and duels.

**Alternative names, if you want to swap some:** *Kohai* (junior) for Lvl 1, *Kenkaku* (sword
expert) for Lvl 7, *Kensei* (sword saint) for Lvl 10 instead of Shogun.

## 2. Topic mastery — moon phases (accuracy)

Mastery is tracked separately for each of the 5 topics. As the brainstorm asks, Luna never shows a
fake "you know 87% of databases". It shows a phase that depends on how many answers you've given
and how accurate your recent ones were.

| Phase | Icon | Label | Rule (checked after every answer in that topic) |
|---|---|---|---|
| **Shingetsu** | 🌑 | New moon — "Unexplored" | Fewer than 5 answers in the topic |
| **Mikazuki** | 🌒 | Crescent — "Practising" | 5+ answers and below 50% accuracy over the last 10 |
| **Jōgen** | 🌓 | Half moon — "Developing" | 5+ answers and 50–79% over the last 10, **or** ≥80% but not yet eligible for full moon |
| **Mangetsu** | 🌕 | Full moon — "Strong" | **10+ answers, ≥80% over the last 10, and at least 1 advanced challenge correct** |

- Mastery can go **down**. If recent accuracy drops, the moon wanes. That's honest, and it makes
  the revisit system matter.
- "Over the last 10" means a rolling window of the last 10 answers in that topic, so old mistakes stop counting.
- Home shows the 5 moons in a row: the clearest possible "weakest topic" display.

## 3. Weakest topic and recommendation

- **Weakest topic** = the topic with the lowest accuracy over the last 10 answers, among topics with
  5+ answers. Ties go to the topic least recently practised.
- If no topic has 5 answers yet: recommend the first preferred topic that is still 🌑.
- The Home card says: "Your weakest blade: **Databases** 🌒 — practise 5 questions", and opens Topic Practice.

## 4. Adaptive difficulty (per topic, from the brainstorm)

Each topic has a current difficulty (1–3), starting from the onboarding segment (`users.md` §3).
After every answer in that topic, the last 5 answers are checked:
- **4–5 correct → difficulty +1** (max 3)
- **0–2 correct → difficulty −1** (min 1)
- **3 correct → no change**
- After a change, the window resets, so the next decision waits for 5 new answers. Without the
  reset, difficulty would bounce up and down on every answer.

The baseline adjusts the start: if the beginner question for a topic is correct, that topic starts
at the segment's difficulty; if it's wrong, at 1.

## 5. Mistake revisiting (spaced repetition, light)

- A wrongly answered challenge goes into the user's **revisit queue**.
- It can come back **after at least 3 other answers**, and **not on the same day** for the Daily Kata.
- Each Daily Kata contains **up to 2 revisits** (if the queue has items), and Topic Practice up to 1.
- Answering a revisit correctly removes it from the queue. Answering it wrong keeps it there and
  waits 2 days before showing it again.
- The summary marks revisits: "🔁 You fixed a past mistake".

## 6. Streak

- **+1** when a Daily Kata is completed on a new local calendar day. If the previous Kata was
  more than one day ago, the streak resets to 1. Current and longest streak are both kept.
- The flame shown on Home is a lantern 🏮 with the streak number, which fits the theme.
- Milestone bonuses at 3, 7 and 30 days (`scoring.md` §3).
- When a streak breaks, the message is kind: "Your lantern went out. Light it again today." No guilt.
- **No streak freeze in V1** (parked in `TODOS.md`).

## 7. Achievements (5, from the brainstorm, with themed names)

| Key | Name | Condition | Icon |
|---|---|---|---|
| FIRST_COMMIT | **First Strike** | Complete your first challenge | ⚔️ |
| BUG_HUNTER | **Bug Slayer** | 10 Bug Hunt answers correct | 🐞 |
| DAILY_GRINDER | **Seven Katas** | Complete 7 Daily Katas (they don't need to be in a row) | 🏮 |
| INCIDENT_COMMANDER | **Incident Commander** | Complete 5 Incident Rooms | 🚨 |
| PERFECT_RUN | **Kanpeki** | A Daily Kata with 7/7 answers correct | 🌕 |

Each is awarded once, shown as a toast on the summary screen, and listed on the Profile (locked
ones shown greyed out with their condition). Achievements give no XP, so the XP math stays simple.

## Decide
- [ ] Approve the 10 samurai ranks and their names (or name your swaps).
- [ ] Approve the XP thresholds.
- [ ] Approve the moon-phase mastery and its rules.
- [ ] Approve the achievement names (English originals or themed).
