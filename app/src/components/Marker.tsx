import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { AppText } from './AppText';

export type MarkState = 'none' | 'selected' | 'correct' | 'wrong';

/**
 * Status marker shared by options and code lines. Correct and wrong never rely on colour alone
 * (ui-design.md §2): correct is a filled gold circle with ✓, wrong is an ember outline with ✕.
 */
export function Marker({ state }: { state: MarkState }) {
  if (state === 'correct')
    return (
      <View style={[styles.base, styles.correct]}>
        <AppText color="onMoon">✓</AppText>
      </View>
    );
  if (state === 'wrong')
    return (
      <View style={[styles.base, styles.wrong]}>
        <AppText color="emberSoft">✕</AppText>
      </View>
    );
  return <View style={[styles.base, state === 'selected' ? styles.selected : styles.idle]} />;
}

const styles = StyleSheet.create({
  base: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  idle: { backgroundColor: colors.track },
  selected: { borderWidth: 6, borderColor: colors.moon, backgroundColor: colors.bg },
  correct: { backgroundColor: colors.moon },
  wrong: { borderWidth: 2, borderColor: colors.ember },
});
