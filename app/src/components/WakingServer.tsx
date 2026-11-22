import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, Rect } from 'react-native-svg';
import { useReduceMotion } from '../lib/motion';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';

/** A small breathing lantern: the "please wait" of the dojo. */
function BreathingLantern() {
  const reduce = useReduceMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
    );
  }, [reduce, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={style}>
      <Svg width={22} height={30} viewBox="0 0 22 30">
        <Rect x={7} y={0} width={8} height={3} fill={colors.wood} />
        <Ellipse cx={11} cy={15} rx={10} ry={11} fill={colors.primary} />
        <Rect x={7} y={27} width={8} height={3} fill={colors.wood} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Shown when the API is slow to answer: Render's free tier sleeps and takes ~30 s to wake. In the
 * dojo's words, with a breathing lantern instead of a spinner.
 */
export function WakingServer() {
  return (
    <View style={styles.wrap} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <BreathingLantern />
      <View style={styles.text}>
        <AppText style={styles.title}>Waking the dojo…</AppText>
        <AppText color="muted">The first visit after a quiet spell takes up to 30 seconds.</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.tatami,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  text: { flex: 1, gap: 2 },
  title: { fontWeight: '700' },
});
