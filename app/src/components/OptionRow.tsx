import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const shift = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    // Selected: a quick 0.98 dip and back (150 ms). Wrong: two horizontal shakes of ±6 px (300 ms).
    if (state === 'selected')
      scale.value = withSequence(
        withTiming(0.98, { duration: 75 }),
        withTiming(1, { duration: 75 }),
      );
    if (state === 'wrong')
      shift.value = withSequence(
        withTiming(6, { duration: 50 }),
        withTiming(-6, { duration: 100 }),
        withTiming(6, { duration: 100 }),
        withTiming(0, { duration: 50 }),
      );
  }, [state, reduce, scale, shift]);

  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shift.value }],
  }));

  return (
    <Animated.View style={motion}>
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
    </Animated.View>
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
