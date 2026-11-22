import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Kanji } from './Kanji';
import type { KanjiGlyph } from './kanjiPaths';

type Props = {
  glyph: KanjiGlyph;
  size: number;
  /** `seal`: red seal ink (correct, won). `ink`: grey sumi (wrong, lost). */
  tone?: 'seal' | 'ink';
  label?: string;
};

/** A square hanko seal, rotated −6° like a hand-pressed stamp (DESIGN.md: Components). */
export function HankoStamp({ glyph, size, tone = 'seal', label }: Props) {
  const color = tone === 'seal' ? 'seal' : 'muted';
  return (
    <View
      style={[
        styles.stamp,
        {
          width: size,
          height: size,
          borderColor: colors[color],
          borderWidth: Math.max(2, size * 0.06),
          borderRadius: size * 0.1,
        },
      ]}
      accessible={!!label}
      accessibilityLabel={label}
    >
      <Kanji glyph={glyph} size={size * 0.74} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: { alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
});
