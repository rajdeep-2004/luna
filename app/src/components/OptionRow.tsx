import { Pressable, StyleSheet } from 'react-native';
import { colors, layout, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { Marker, type MarkState } from './Marker';

type Props = {
  text: string;
  state: MarkState;
  onPress: () => void;
  disabled?: boolean;
};

/** One answer option. default / selected (moon ring) / correct / wrong. Plain, readable text (ui-design.md §1). */
export function OptionRow({ text, state, onPress, disabled = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={text}
      accessibilityState={{ checked: state === 'selected' || state === 'correct', disabled }}
      style={[
        styles.row,
        state === 'selected' && styles.selected,
        state === 'correct' && styles.selected,
        state === 'wrong' && styles.wrong,
      ]}
    >
      <AppText color="textSoft" style={styles.text}>
        {text}
      </AppText>
      <Marker state={state} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.buttonHeight,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: colors.surfaceRaised, borderColor: colors.moon },
  wrong: { borderColor: colors.ember },
  text: { flex: 1 },
});
