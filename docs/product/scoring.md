# Scoring

Three different numbers, each with one job:

| Number | Measures | Used for |
|---|---|---|
| **XP** | Effort and progress (it only goes up) | Levels, the Dojo Board |
| **Accuracy** | Skill (correct ÷ answered) | Session summary, moon-phase mastery, duel score |
| **Time** | Speed | Shown on summaries. Only used as the duel tie-breaker |

Speed never earns XP, because rewarding speed teaches guessing.

## 1. What counts as an "answer"

An **answer** is one decision: one single challenge, or **one stage of an Incident Room**.
So a Daily Kata has 5 challenges and **7 answers** (4 singles + 3 incident stages). Accuracy,
mastery and duel scores all count answers. This keeps one rule everywhere, and an incident
correctly weighs more than a single question.

## 2. XP per answer

| Answer | XP |
|---|---:|
| Correct, beginner (difficulty 1) | **10** |
| Correct, intermediate (difficulty 2) | **15** |
| Correct, advanced (difficulty 3) | **20** |
| Incident stage correct | same table, using the incident's difficulty, **per stage** |
| Wrong answer | 0 |
| Hint used on that answer | half of the above, rounded down (e.g. 15 → 7) |

### Anti-farming rules

1. **First-correct rule:** full XP for a challenge (or an incident stage) is earned **once per
   user, ever**: the first time it's answered correctly. Getting it wrong first and right later
   still earns full XP. That's the revisit system working as intended.
2. **Review XP:** a correct answer on something already earned gives **2 XP**, **only inside the
   Daily Kata.** This keeps the Kata worth playing after the bank runs out, and because the Kata
   is once a day, it can't be farmed.
3. Practice, solo Incident and Duels give **0 XP** on repeats.
4. Baseline and Checkpoint give **no XP**. They're measurements, not play, so there's no reason to rush them.

## 3. Bonuses

| Bonus | XP | Rule |
|---|---:|---|
| **Daily Kata complete** | **15** | Once per local day |
| **Perfect Kata** (7/7 answers correct) | **+10** | Once per local day, on top of the Kata bonus |
| **First Incident Room ever** | **25** | Once per user (from the brainstorm) |
| **Duel win** | **10** | Max 3 win bonuses per local day. A draw gives 0 |
| **Streak milestone** | 3 days **+10**, 7 days **+25**, 30 days **+50** | Each milestone is paid once per streak run |

Bonuses are also recorded in the XP ledger, each under a unique key (e.g. `daily:2026-11-22`,
`perfect:2026-11-22`, `streak7:<runStartDate>`), so they can never be paid twice.

## 4. Expected XP (sanity check)

| Scenario | XP |
|---|---|
| A good first Daily Kata (beginner, 5/7 correct, new content) | 5 × 10 + 15 = **65** |
| A perfect intermediate Kata (7/7, new content) | 7 × 15 + 15 + 10 = **130** |
| A day-20 Kata (content used up, 6/7 correct) | 6 × 2 + 15 = **27** |
| The whole V1 bank earned once | 20×10 + 20×15 + 10×20 + incidents (2×30 + 3×45 + 3×60 = 375) = **1,075** |
| One active month (bank + 30 Katas + bonuses) | about **1,075 + 450 + 300 ≈ 1,800–2,000** |

The level curve in `progression.md` is built from these numbers.

## 5. Session results

- **Accuracy** = correct answers ÷ answers given, shown as `5/7 · 71%`.
- **Grade** (summary and Incident Report), which carries the theme:

| Grade | Accuracy | Shown as |
|---|---|---|
| **Kanpeki** (perfect) | 100% | 🌕 gold |
| **Sugoi** (great) | 80–99% | 🌔 |
| **Yoshi** (good) | 50–79% | 🌓 |
| **Mada mada** (not yet) | below 50% | 🌒. The copy: "Not yet. Your next kata will be sharper." |

- **Incident grade:** 3/3 = Kanpeki · 2/3 = Yoshi · 0–1/3 = Mada mada.

## 6. Duel score

**Score = correct answers out of 5** (no incidents in duels).
Tie → **lower total server-measured time wins.** Still tied (same to the second) → **draw**.
A timeout is a wrong answer, and that challenge's time is recorded as 60 s.

## Decide
- [ ] Is Review XP (2 XP, only inside the Daily Kata) OK?
- [ ] Approve the bonus table, especially the duel win cap (3/day) and the streak milestones. The
      milestones are a small addition beyond the brainstorm.
- [ ] Approve the grade names (Kanpeki / Sugoi / Yoshi / Mada mada).
