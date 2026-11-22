import { StyleSheet, View } from 'react-native';
import { HankoStamp } from '../art/HankoStamp';
import { colors } from '../theme';

export type MarkState = 'none' | 'selected' | 'correct' | 'wrong';

/**
 * Status mark shared by options and code lines. Correct and wrong never rely on colour alone:
 * correct carries a small 正 seal, wrong a grey 誤 (DESIGN.md: Japanese marking).
 */
export function Marker({ state }: { state: MarkState }) {
  if (state === 'correct') return <HankoStamp glyph="正" size={26} label="Correct" />;
  if (state === 'wrong')
    return <HankoStamp glyph="誤" size={26} tone="ink" label="Your answer, wrong" />;
  return <View style={[styles.dot, state === 'selected' ? styles.selected : styles.idle]} />;
}

const styles = StyleSheet.create({
  dot: { width: 20, height: 20, borderRadius: 4, transform: [{ rotate: '-6deg' }] },
  idle: { borderWidth: 2, borderColor: colors.muted, opacity: 0.6 },
  selected: { backgroundColor: colors.seal },
});
