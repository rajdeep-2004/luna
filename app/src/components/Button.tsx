import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { DURATION, useReduceMotion } from '../lib/motion';
import { colors, layout, radii } from '../theme';
import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  pending?: boolean;
  disabled?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Primary: the amber wooden block (DESIGN.md: Components). It sits on a 4 pt darker offset and sinks
 * into it when pressed. Ghost: a quiet text action. While `pending` it ignores taps, so a double tap
 * never submits twice.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  pending = false,
  disabled = false,
}: Props) {
  const reduce = useReduceMotion();
  const sink = useSharedValue(0);
  const block = useAnimatedStyle(() => ({ transform: [{ translateY: sink.value }] }));
  const inactive = pending || disabled;
  const primary = variant === 'primary';
  const depth = primary ? layout.buttonOffset : layout.pressSink;
  const to = (v: number) => {
    sink.value = reduce ? v : withTiming(v, { duration: DURATION.micro });
  };

  const press = (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: pending }}
      disabled={inactive}
      onPressIn={() => to(depth)}
      onPressOut={() => to(0)}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={[primary ? styles.primary : styles.ghost, block, disabled && !pending && styles.off]}
    >
      {pending ? (
        <ActivityIndicator color={primary ? colors.onPrimary : colors.muted} />
      ) : (
        <AppText variant="button" color={primary ? 'onPrimary' : 'muted'}>
          {label}
        </AppText>
      )}
    </AnimatedPressable>
  );

  if (!primary) return press;
  return <View style={styles.offset}>{press}</View>;
}

const styles = StyleSheet.create({
  offset: {
    alignSelf: 'stretch',
    borderRadius: radii.md,
    backgroundColor: colors.primaryPressed,
    paddingBottom: layout.buttonOffset,
  },
  primary: {
    height: layout.buttonHeight,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    minHeight: layout.touchTarget,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.5 },
});
