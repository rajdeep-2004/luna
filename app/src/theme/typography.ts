import type { TextStyle } from 'react-native';

/** Font family names as registered by expo-font in `fonts.ts`. */
export const fontFamily = {
  serif: 'ShipporiMincho_500Medium',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
} as const;

/** Type roles from ui-design.md §3. */
export const typography = {
  display: { fontFamily: fontFamily.serif, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fontFamily.serif, fontSize: 24, lineHeight: 32 },
  question: { fontFamily: fontFamily.sansMedium, fontSize: 21, lineHeight: 29 },
  body: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 23 },
  label: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  button: { fontFamily: fontFamily.sansSemiBold, fontSize: 16, lineHeight: 22 },
  code: { fontFamily: fontFamily.mono, fontSize: 13.5, lineHeight: 20 },
} as const satisfies Record<string, TextStyle>;
export type TypeRole = keyof typeof typography;
