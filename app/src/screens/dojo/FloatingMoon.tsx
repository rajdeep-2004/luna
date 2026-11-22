import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { MoonPhase, type MoonPhaseName } from '../../components';
import { colors } from '../../theme';

const FLOAT_MS = 3200;
const HALO_MS = 3500;
const FLOAT_PX = 4;

/** ui-design.md §6: the Home moon floats ±4 px and its halo breathes. Still under Reduce Motion. */
export function FloatingMoon({ phase, size = 132 }: { phase: MoonPhaseName; size?: number }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  const halo = useSharedValue(0.18);
  useEffect(() => {
    if (reduce) return;
    const ease = Easing.inOut(Easing.sin);
    y.value = withRepeat(withTiming(-FLOAT_PX, { duration: FLOAT_MS, easing: ease }), -1, true);
    halo.value = withRepeat(withTiming(0.32, { duration: HALO_MS, easing: ease }), -1, true);
  }, [reduce, y, halo]);
  const moonStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value }));
  const haloSize = size * 1.5;
  return (
    <View
      style={[styles.wrap, { height: haloSize }]}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          styles.halo,
          { width: haloSize, height: haloSize, borderRadius: haloSize / 2 },
          haloStyle,
        ]}
      />
      <Animated.View style={moonStyle}>
        <MoonPhase phase={phase} size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', backgroundColor: colors.moon },
});
