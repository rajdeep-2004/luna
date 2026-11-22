---
# gstack: design-md-format=spec
name: Luna
description: A lamplit cut-paper samurai den at night, warm and quiet, where every tap answers like a game.
colors:
  ground: "#3B2418"
  tatami: "#2A1910"
  lacquer-wood: "#5C3A27"
  wall-light: "#4A2E1F"
  text: "#F3E6CC"
  shoji: "#E9DCC0"
  text-on-shoji: "#3B2418"
  text-muted: "#B39A78"
  primary: "#F2A93B"
  primary-pressed: "#C9831F"
  on-primary: "#2A1910"
  seal: "#D9442B"
  night: "#23305C"
  night-deep: "#18213F"
  success: "#D9442B"
  error: "#B39A78"
  warning: "#F2A93B"
typography:
  display:
    fontFamily: Dela Gothic One
    fontWeight: 400
    fontSize: 32px
    letterSpacing: 0.01em
  title:
    fontFamily: Dela Gothic One
    fontWeight: 400
    fontSize: 22px
  number:
    fontFamily: Dela Gothic One
    fontWeight: 400
    fontSize: 44px
  question:
    fontFamily: Source Sans 3
    fontWeight: 500
    fontSize: 21px
    lineHeight: 1.4
  body:
    fontFamily: Source Sans 3
    fontWeight: 400
    fontSize: 16px
    lineHeight: 1.5
  button:
    fontFamily: Source Sans 3
    fontWeight: 700
    fontSize: 18px
  label:
    fontFamily: Source Sans 3
    fontWeight: 700
    fontSize: 12px
    letterSpacing: 0.04em
  mono:
    fontFamily: JetBrains Mono
    fontWeight: 400
    fontSize: 14px
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 22px
  2xl: 32px
  3xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: 56px
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
  tab-bar:
    backgroundColor: "{colors.tatami}"
    height: 86px
  tab-active:
    iconColor: "{colors.seal}"
    textColor: "{colors.text}"
  tab-inactive:
    iconColor: "{colors.text-muted}"
    textColor: "{colors.text-muted}"
  input-cell:
    backgroundColor: "{colors.tatami}"
    rounded: "{rounded.sm}"
  list-row:
    textColor: "{colors.text}"
---

# Luna

## Overview

**Creative North Star:** Kiri-e Den. Every screen is a small stage built from 3–4 flat cut-paper layers, lit warm from inside like a paper theatre. You look into a room, not at a list.

**Product context:** Luna is a phone game (iOS and Android, portrait, Expo / React Native) for software engineers and CS students to pass time after work, like Elevate or Peak but for engineering knowledge. It is not a study app. The world is a Japanese night dojo: samurai ranks with kanji, a streak lantern, yokai masks, 正/誤 stamps, the Daily Kata, the Dojo Board and friend duels.

**The one thing to remember (approved 2026-11-22):** a tired engineer comes home and, instead of reels, opens Luna. It feels like a real game, they are the samurai of code, and the Dojo is their den where the master has come home to rest. Every decision below serves this.

**Mode per surface:**
- Dojo, Duel face-off, results and rank-up: Experience (immersive scenes).
- Challenge screens: Operate (fast, legible, one decision at a time).
- Answer explanations: Read (the only place paragraphs are allowed).

**Reference sites:** none; competitive research was declined, and the direction comes from design knowledge plus an independent second proposal (D-038).

**Key characteristics:**
- Opening the app feels like coming home to a lamplit room.
- Stats are objects in the room (lantern, scroll, ema plaque), not tiles.
- Very little text: one line per element, numbers and shapes before words.
- Every press reacts: a sink, a haptic, a stamp.
- Japanese without costume: the theme lives in objects, kanji and moments; questions stay plain English.

## Colors

**Strategy:** Committed. Warm persimmon-brown owns every surface. Amber is the only action colour. Vermilion is the seal and is rare.

**Light or dark:** dark, because the use scene is night, at home, on the couch or in bed after work. It is a warm, lamplit dark, not black and not navy. There is no light mode while that scene holds.

- **Ground (`ground`)** is the wall of the den; **tatami** is the floor, the tab bar and recessed inputs; **lacquer-wood** is furniture and frames. Light from the lantern is a flat, lighter paper shape (`wall-light`), never a glow.
- **Text** is washi on the ground (11.7:1). **Muted** text is aged wood (5.4:1 on ground, 6.3:1 on tatami) and is the smallest text allowed.
- **Shoji** is lit paper: scrolls, selected formats, the kata scroll. Text on shoji uses `text-on-shoji` (10.7:1).
- **Primary (lantern amber)** means "go": the one main button per screen, XP and the streak. Button text is `on-primary` (8.4:1).
- **Seal (shu vermilion)** marks correctness and identity: the 正 stamp, the active tab, the winner's seal, hanko marks. It fails body-text contrast (3.3:1 on ground, 3.5:1 under washi text), so it is used for shapes and large marks only, never for text you must read.
- **Correct and wrong follow Japanese marking:** correct is red seal ink (`success` = seal); wrong is grey sumi ink (`error` = muted wood). Wrong is never shouted in red.
- **Night** is only seen through windows and on the duel rival's side.

## Typography

- **Dela Gothic One** (Google Fonts, OFL, one weight; Expo package `@expo-google-fonts/dela-gothic-one`, 2.7 MB) is the game voice: titles, scores, XP, rank names, the duel score and rank kanji. It is chunky and arcade-like and includes kanji, so it reads as "game", not "literature". Never for body text or questions.
- **Source Sans 3** (`@expo-google-fonts/source-sans-3`) is the reading voice: questions (500), body (400), buttons and labels (700). It stays calm and legible up to 1.3x Dynamic Type.
- **JetBrains Mono** (already in the app) for every code snippet, line numbers and duel codes.
- **Brush kanji** (the 正/誤 stamps, grade stamps, rank-up kanji, 今日 seal) use the look of Yuji Boku, but they are drawn once from the font and shipped as SVG paths. The app does not load the 8.6 MB brush font. Zen Kaku Gothic New was rejected for the same reason (12 MB).
- **Scale:** display 32, title 22, question 21, body 16, label 12; numbers in scenes 44. Levels differ by size and face, not just weight.

## Layout

- **Scene-first.** The Dojo, the duel face-off, the Profile header and results are SVG scenes in 3–4 paper layers that fill the screen edge to edge. Controls sit on the scene, not in cards.
- **Objects are buttons on the Dojo:** the lantern (streak), the hanging scroll (rank and XP ensō), the ema plaque (weekly rank, opens the Board), the sealed scroll on the low table (the Daily Kata, the biggest target), and a folded letter under the shoji when a Checkpoint is ready.
- **One primary action per screen,** in amber, near the thumb.
- **Unequal things get unequal weight:** the Incident Room is a "boss" stage on Explore, not one more row.
- **Lists** (Board, duel lists, history) are rows separated by a thin muted rule, never stacked cards.
- **Screen padding** 22 px; vertical rhythm on the spacing scale. Portrait phones only; scenes are drawn on a 390-wide grid and scale to width.

## Elevation & Depth

Depth comes from stacked flat paper layers with real offsets, one warm light source from the lantern, and a 6–7% paper-grain overlay. The primary button has a 4 px solid offset (`primary-pressed`) like a wooden block. No zero-offset glows, no blurred halos, no frosted glass.

## Shapes

Mostly straight cuts: paper, wood, scrolls and plaques. Radii are small and purposeful: 6 for input cells, 10 for buttons and format rows, 14 for the boss stage. Round shapes come from objects (lanterns, scroll ends, crests), not from rounding every box.

## Components

- **Primary button:** amber, 56 high, radius 10, a 4 px darker offset underneath. Pressed: it sinks into the offset, with a light haptic. Pending: a spinner replaces the label and taps are ignored. Disabled: 50% opacity.
- **Tab bar:** a tatami strip with a woven heri border. Four cut-paper icons drawn for Luna: dojo roof (Dojo), half-open fan (Explore), crossed bokken (Duel), the player's own mask (Profile). Inactive: outline in muted wood. Active: filled vermilion, with a small square hanko mark under the label. Press: the icon sinks 2 px and a selection haptic fires. No ripple on any platform.
- **Hanko stamp:** square, rotated −6°, brush kanji inside. Correct = vermilion 正; wrong = muted 誤.
- **Ensō progress:** an open brush circle around the rank kanji that closes as XP approaches the next rank. Tapping it shows the exact XP. It replaces every progress bar.
- **Duel format rows:** three blades, each with a brush kanji (刀 Classic, 雷 Blitz, 一 Sudden Death), a name and a mono rule ("10 × 10s"). Selected: shoji paper with a vermilion kanji.
- **Code cells:** six recessed tatami cells for the duel code; the current cell has an amber underline.
- **Crests (achievements):** round kamon. Earned: filled amber or vermilion with the emblem. Locked: dashed muted outline, with the condition read out by the screen reader.
- **States:** loading is a lantern breathing; empty is the quiet room with one line ("The dojo is quiet"); errors are one line plus Retry; slow server shows "Waking the dojo…".

## Do's and Don'ts

- Do: one line of copy per element; objects and numbers before words.
- Do: one amber action per screen.
- Do: build scenes from 3–4 flat paper layers with real offsets and one warm light source.
- Do: give unequal things unequal weight (the boss stage, the kata on the table).
- Do: make every press react (sink, haptic, stamp); provide a Reduce Motion fallback for every animation.
- Don't: cards on the main screens, and never a card inside a card.
- Don't: progress bars or percentages; use the ensō, the lantern and stamps.
- Don't: glows, gradients, neon, or a navy-plus-pale-gold palette (that was the rejected UI).
- Don't: emoji as icons, or a generic icon set; every icon is a cut-paper object from the den.
- Don't: paragraphs outside the answer explanation, which starts collapsed.

## Motion

- **Approach:** expressive. Luna is a game; moments are authored.
- **Easing:** enter ease-out, exit ease-out, move ease-in-out. Stamps and button presses use a firm spring without overshoot.
- **Duration:** micro 80 ms (press), short 200 ms (state), medium 400 ms (scene change), long 600–900 ms (authored moments).
- **The authored moments:**
  1. Coming home: on app open the shoji slide apart (about 420 ms), the lantern catches, and the moon settles on its arc.
  2. Unrolling the kata: the seal breaks and the scroll unrolls into the challenge screen.
  3. Hanko strike: the stamp drops from 1.5x with an ink bleed; heavy haptic on correct, warning haptic on wrong.
  4. Lantern relight: amber fills the lantern from the bottom and the new streak number cuts itself in.
  5. Rank-up: a katana draws across the screen, the new kanji is brushed stroke by stroke, and the ensō closes.
  6. Duel face-off: both masks slide in from the edges and clash with a paper-cut spark; the winner takes the seal.
- **Reduce Motion:** every moment becomes a crossfade or appears instantly. Haptics stay.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-22 | Initial design system created (Kiri-e Den) | Created by /design-consultation after the previous UI was rejected as text-heavy "AI slop" and Luna was repositioned as a game (D-037). Direction merged from my draft and an independent second proposal; approved by Rajdeep after an HTML preview of Dojo, Explore, Duel and Profile (D-038). |
| 2026-11-22 | Amber, not vermilion, for buttons | Washi text on vermilion is only 3.5:1; amber with dark text is 8.4:1, and the lantern already means "go". |
| 2026-11-22 | Brush kanji shipped as SVG, not a font | Yuji Boku is 8.6 MB; only about 20 brush glyphs are needed. |
