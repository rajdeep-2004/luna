# Luna — UI Design System

> Status: **approved** by Rajdeep — 2026-11-22 (mockups v2, "Calmer").
> Mockups: https://claude.ai/artifact/BiQbGdeWApLetcurfUC6WZ (private canvas, 6 screens).
> In code, all of the values below live in `app/src/theme/` and nowhere else.

## 1. Principles

1. **Calm night, one moon.** A dark indigo sky with a single warm accent, moon-gold. Everything
   else is quiet. The first version felt overwhelming because it used too many colours and too much
   heavy serif type. This version fixes that.
2. **One primary action per screen.** Home has *Begin kata*. A challenge has *Strike*. Feedback has
   *Next*. Secondary actions are text links or quiet rows.
3. **Show less, reveal on demand.** Home shows three things: rank and streak, the Daily Kata, and
   the weakest topic. Stats belong on Explore and Profile.
4. **The theme lives in moments, not chrome.** The samurai and moon flavour shows up in titles,
   the 正 stamp, rank-up, grades and duel clashes. Questions and options stay plain, readable English.
5. **Motion explains, then gets out of the way.** Every animation answers "what just changed?"
   and none lasts longer than 600 ms, except the celebrations.

## 2. Colour tokens

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0A0D1A` | Every screen background (the night sky) |
| `surface` | `#11152A` | Cards, rows, unselected options, secondary buttons |
| `surfaceRaised` | `#1A1F38` | Selected option or line, sheets |
| `track` | `#1B2140` | Progress-bar tracks, the unlit part of moons |
| `text` | `#EEF0F8` | Primary text |
| `textSoft` | `#C3C9E3` | Option text, code |
| `textMuted` | `#8E97BC` | Labels, metadata, inactive tabs (≥ 4.5 : 1 on `bg`) |
| `moon` | `#E9D7A1` | **The only accent:** primary buttons, progress, correct answers, active tab, selection ring |
| `moonDeep` | `#DCC994` | Moon craters, pressed state of moon buttons |
| `onMoon` | `#15120A` | Text and icons on moon-gold |
| `ember` | `#F0846E` | **Only** wrong answers, the live-incident dot, and the misconception label. Never on buttons |
| `emberSoft` | `#F7A493` | Ember text on dark surfaces |

Correct and wrong are never told apart by colour alone. Correct = filled gold circle + ✓.
Wrong = ember outline + ✕. They also differ clearly in lightness.

## 3. Typography

| Role | Font | Size / weight | Where |
|---|---|---|---|
| Display | **Shippori Mincho** | 32 / 500 | Daily Kata title, grade word (Sugoi), rank-up line, duel score |
| Title | Shippori Mincho | 24 / 500 | Screen titles (incident name) |
| Question | Inter | 21 / 500, line-height 1.4 | Challenge prompts |
| Body | Inter | 15 / 400, line-height 1.55 | Explanations, evidence |
| Label | Inter | 12 / 400, uppercase, +1.4 letter-spacing | Mode name, section labels |
| Button | Inter | 16 / 600 | All buttons |
| Code | **JetBrains Mono** | 13.5 / 400 | Snippets, plain text without syntax colours |

Rule: **the serif is used for at most one element per screen.** Fonts are loaded with `expo-font`
(`@expo-google-fonts/*`) during the splash screen.

## 4. Space, shape, layout

- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 40 · 56. The screen's side padding is **24**.
- Radii: rows and cards **16–20**, buttons **pill (999)**, avatars **circle**.
- **No borders** on cards. Depth comes from `surface` vs `bg` only. The only outline is the 1 px
  moon-gold ring on a selected item.
- Touch targets ≥ 44 pt. Primary buttons are 56 pt high and full width at the bottom (thumb zone).
- Progress: a 3 pt line at the top of game screens, with an `n / total` count. No segmented
  pills, no dots.

## 5. Components (built in P2)

`Screen` (safe area + bg + star field option) · `Button` (`primary` moon / `ghost` text;
pending and disabled states) · `OptionRow` (default / selected / correct / wrong) · `CodeBlock` +
`CodeLine` (tappable for Bug Hunt) · `ProgressLine` · `MoonPhase` (SVG: new, crescent, half,
gibbous, full) · `YokaiAvatar` (8 SVG masks) · `Lantern` (streak) · `Card` · `Sheet` (feedback
panel) · `Stamp` (正 / 誤) · `TextField` (label + error) · `EmptyState` · `ErrorState` (with Retry) ·
`WakingServer` (cold-start notice).

## 6. Motion (Reanimated + expo-haptics)

| Moment | Animation | Duration / easing | Haptic |
|---|---|---|---|
| Screen push | Native stack slide (iOS) / fade-through (Android) | platform default | — |
| Select an option or line | Ring fades in, row scales to 0.98 and back | 150 ms | `selection` |
| Submit → feedback | Sheet rises from the bottom, background dims to 30% | 500 ms, `cubic(0.2, 0.8, 0.2, 1)` | — |
| Correct | 正 stamp drops in (scale 1.5 → 1, −6° tilt) + XP counts up | 600 ms spring | `success` |
| Wrong | Stamp 誤 in ember, tapped row shakes horizontally twice (±6 px) | 300 ms | `error` |
| Incident: new evidence | Card fades in and slides up 10 px | 600 ms | `light` |
| Progress line | Width animates to the new value | 400 ms ease-out | — |
| Home moon | Slow float (±4 px) and halo breathing | 6–7 s loop | — |
| Summary | Moon grade grows from its phase, petals fall, rank-up banner pops | 700 ms + 4 s petals | `success` |
| Duel result | Avatars slide in from both sides, then the score flashes | 600 ms + 1.2 s | `heavy` on the winner reveal |

**Reduce Motion:** if the OS setting is on, the loops, petals and shakes are off, and transitions
become simple fades.

## 7. Screen inventory (V1)

Auth: Welcome · Register · Login. Onboarding: Username · Avatar · Topics · Level · Baseline (skippable).
Tabs: **Dojo** (Home) · **Explore** (5 topic moons, practice, solo incident) · **Duel** (create,
join, list) · **Profile** (rank, XP, stats, achievements, history, logout).
Pushed: Challenge (4 modes) · Feedback sheet · Summary · Incident Report · Dojo Board · Duel Result · Checkpoint.

## 8. Accessibility

Contrast ≥ 4.5 : 1 for all text. Every icon-only button has an `accessibilityLabel`. Options use
`accessibilityRole="radio"` + `accessibilityState={{ checked }}`. Code lines announce
"Line 3: const users = …". Dynamic Type is respected up to 1.3×, and layouts must not clip at that size.
