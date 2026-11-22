/** Colour tokens from docs/product/ui-design.md §2. The only place hex values live. */
export const colors = {
  bg: '#0A0D1A',
  surface: '#11152A',
  surfaceRaised: '#1A1F38',
  track: '#1B2140',
  text: '#EEF0F8',
  textSoft: '#C3C9E3',
  textMuted: '#8E97BC',
  moon: '#E9D7A1',
  moonDeep: '#DCC994',
  onMoon: '#15120A',
  ember: '#F0846E',
  emberSoft: '#F7A493',
} as const;
export type ColorToken = keyof typeof colors;
