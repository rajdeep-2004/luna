/**
 * Colour tokens from DESIGN.md (Kiri-e Den). The only place hex values live.
 * Amber (`primary`) is the one action colour; vermilion (`seal`) is for marks and shapes, never text.
 */
const palette = {
  ground: '#3B2418',
  tatami: '#2A1910',
  wood: '#5C3A27',
  wallLight: '#4A2E1F',
  text: '#F3E6CC',
  shoji: '#E9DCC0',
  onShoji: '#3B2418',
  muted: '#B39A78',
  primary: '#F2A93B',
  primaryPressed: '#C9831F',
  onPrimary: '#2A1910',
  seal: '#D9442B',
  night: '#23305C',
  nightDeep: '#18213F',
  /** Tatami mats on the Dojo floor. */
  mat: '#8A7354',
  matShade: '#7C6649',
} as const;

/**
 * TEMPORARY (P7, D-039): old token names pointing at the new palette, so screens not yet rebuilt
 * keep compiling. Removed in P7 task 11; `tsc` then lists any straggler.
 */
const legacy = {
  bg: palette.ground,
  surface: palette.tatami,
  surfaceRaised: palette.wood,
  track: palette.wallLight,
  textSoft: palette.text,
  textMuted: palette.muted,
  moon: palette.primary,
  moonDeep: palette.primaryPressed,
  onMoon: palette.onPrimary,
  ember: palette.seal,
  emberSoft: palette.primary,
} as const;

export const colors = { ...palette, ...legacy } as const;
export type ColorToken = keyof typeof colors;
