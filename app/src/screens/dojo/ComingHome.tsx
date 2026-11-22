import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';
import { useReduceMotion } from '../../lib/motion';
import { colors } from '../../theme';

const OPEN_MS = 420;

/** One shoji panel: paper with a wooden lattice, drawn to fill half the screen. */
function Panel() {
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 200">
      <Rect x={0} y={0} width={100} height={200} fill={colors.shoji} />
      {[25, 50, 75].map((x) => (
        <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={200} stroke={colors.muted} strokeWidth={1.2} />
      ))}
      {[40, 80, 120, 160].map((y) => (
        <Line key={`h${y}`} x1={0} y1={y} x2={100} y2={y} stroke={colors.muted} strokeWidth={1.2} />
      ))}
    </Svg>
  );
}

/**
 * "Coming home" (DESIGN.md motion 1): on the first Dojo view of an app launch, two shoji panels slide
 * apart onto the room. With Reduce Motion the room simply appears.
 */
export function ComingHome({ onDone }: { onDone: () => void }) {
  const reduce = useReduceMotion();
  const open = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      onDone();
      return;
    }
    open.value = withDelay(
      180,
      withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [reduce, open, onDone]);
  const left = useAnimatedStyle(() => ({ transform: [{ translateX: `${-100 * open.value}%` }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ translateX: `${100 * open.value}%` }] }));
  if (reduce) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
      <Animated.View style={[styles.half, styles.left, left]}>
        <Panel />
      </Animated.View>
      <Animated.View style={[styles.half, styles.right, right]}>
        <Panel />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  half: { position: 'absolute', top: 0, bottom: 0, width: '50%' },
  left: { left: 0, borderRightWidth: 4, borderRightColor: colors.wood },
  right: { right: 0, borderLeftWidth: 4, borderLeftColor: colors.wood },
});
