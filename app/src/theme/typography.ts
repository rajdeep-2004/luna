import type { TextStyle } from 'react-native';

/** Font family names as registered by expo-font in `fonts.ts`. */
export const fontFamily = {
  /** The game voice: titles, numbers, ranks. Never for questions or body text. */
  display: 'DelaGothicOne_400Regular',
  sans: 'SourceSans3_400Regular',
  sansMedium: 'SourceSans3_500Medium',
  sansSemiBold: 'SourceSans3_600SemiBold',
  sansBold: 'SourceSans3_700Bold',
  mono: 'JetBrainsMono_400Regular',
} as const;

/** Type roles from DESIGN.md. Levels differ by face and size, not only weight. */
export const typography = {
  display: { fontFamily: fontFamily.display, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 28 },
  number: { fontFamily: fontFamily.display, fontSize: 44, lineHeight: 50 },
  question: { fontFamily: fontFamily.sansMedium, fontSize: 21, lineHeight: 29 },
  body: { fontFamily: fontFamily.sans, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fontFamily.sansBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  button: { fontFamily: fontFamily.sansBold, fontSize: 18, lineHeight: 24 },
  code: { fontFamily: fontFamily.mono, fontSize: 14, lineHeight: 21 },
} as const satisfies Record<string, TextStyle>;
export type TypeRole = keyof typeof typography;
