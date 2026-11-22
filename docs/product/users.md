# Users

## 1. Roles

There is **one role: Player.** V1 has no admin, teacher or moderator. Content is written by hand
and loaded with a seed script, so nobody edits it inside the app.

## 2. Personas (from the brainstorm)

| Persona | Who | Goal | V1 priority |
|---|---|---|---|
| **CS student** | 18–24, studying CS, knows basic JS/Python/SQL | Keep concepts fresh and get better at technical reasoning in short breaks | **Primary** |
| **Early-career developer** | 0–2 years in industry | Refresh fundamentals, practise judgement, challenge friends | Secondary |

## 3. Skill segments (self-reported at onboarding)

The user picks one of these during onboarding. The choice sets the **starting difficulty** for every
topic until the baseline assessment or real play adjusts it.

| Segment | Onboarding label shown | Typical user | Starting difficulty |
|---|---|---|---|
| Beginner | "I'm learning the basics" | 1st–2nd year student | 1 (Beginner) in all topics |
| Intermediate | "I've built a few projects" | 3rd–4th year, internships | 2 (Intermediate) in all topics |
| Advanced | "I work or intern as a developer" | Junior developer | 2 in all topics. Level 3 has to be earned through play |

Advanced users still start at difficulty 2. If someone over-rates themselves and starts at 3, they
get hit with hard questions on day one and quit. Strong players climb to 3 after a few good answers.

## 4. Behaviour types (who we design features for)

These are not settings. They describe how people use the app, and each one maps to the features
that keep that kind of user coming back.

| Type | Behaviour | What hooks them | Risk to avoid |
|---|---|---|---|
| **Habit builder** | Opens the app once a day for 5 minutes | Daily Kata, streak, moon phases filling up | A broken streak makes them quit. Keep the "missed a day" copy kind, not punishing |
| **Competitor** | Plays to beat friends and climb the board | Duels, Dojo Board, rank titles | Beginners feel crushed. Duels are only between friends, and the board resets weekly |
| **Crammer** | Plays heavily before an exam or interview | Topic practice, the weakest-topic card, the explanations | Running out of new questions. Revisits and the "Strong" topic goal give them something to do |
| **Explorer** | Tries every mode once | All 4 modes reachable from Explore on day one | Gating content behind levels. Nothing is locked in V1 |

## 5. What each user sees first (activation)

1. Sign up → username → yokai mask avatar → preferred topics (pick 1–5) → skill segment.
2. **Baseline assessment** (optional, can be skipped): 5 questions, about 2 minutes.
3. Home → **Start Daily Kata** is the one obvious button.

**Activation target:** the first Daily Kata is finished within 10 minutes of signing up.

## Decide
- [ ] Is starting advanced users at difficulty 2 (not 3) OK?
- [ ] Are the 4 behaviour types the right ones for your usability-test write-up?
