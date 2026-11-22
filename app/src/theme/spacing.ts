/** Spacing scale, radii and layout constants from DESIGN.md. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 32,
  huge: 40,
  giant: 56,
} as const;

/** Small, purposeful radii: shapes come from objects, not from rounding every box. */
export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  /** TEMPORARY aliases (P7, removed in task 11). */
  card: 14,
  cardLg: 14,
  pill: 999,
} as const;

export const layout = {
  screenPadding: 22,
  touchTarget: 44,
  buttonHeight: 56,
  /** The solid "wooden block" offset under the primary button. */
  buttonOffset: 4,
  /** How far a pressed control sinks. */
  pressSink: 2,
  /** Scenes are drawn on this grid and scale to the screen width. */
  sceneWidth: 390,
} as const;
