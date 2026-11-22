import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { useReduceMotion } from '../lib/motion';
import { colors } from '../theme';
import { HankoStamp } from './HankoStamp';
import type { KanjiGlyph } from './kanjiPaths';

type Props = {
  correct: boolean;
  size: number;
  label?: string;
  /** Overrides the seal's glyph and ink (e.g. the Summary grade seal: 道 for "keep walking"). */
  glyph?: KanjiGlyph;
  tone?: 'seal' | 'ink';
};

/**
 * The hanko strike (DESIGN.md motion 3): the seal drops from 1.5× onto the paper and the ink bleeds.
 * 正 in red seal ink for correct, 誤 in grey sumi for wrong; heavy haptic on correct, warning on wrong.
 * With Reduce Motion it simply appears.
 */
export function HankoStrike({ correct, size, label, glyph, tone }: Props) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(reduce ? 1 : 1.5);
  const opacity = useSharedValue(reduce ? 1 : 0);
  const bleed = useSharedValue(0);
  const inkTone = tone ?? (correct ? 'seal' : 'ink');

  useEffect(() => {
    if (correct) haptic.heavy();
    else haptic.error();
    if (reduce) return;
    opacity.value = withTiming(1, { duration: 90 });
    scale.value = withSpring(1, { damping: 14, stiffness: 260, overshootClamping: true });
    bleed.value = withSequence(
      withTiming(0, { duration: 90 }),
      withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
    );
  }, [correct, reduce, scale, opacity, bleed]);

  const stamp = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const ink = useAnimatedStyle(() => ({
    opacity: 0.22 * (1 - bleed.value) * (bleed.value > 0 ? 1 : 0),
    transform: [{ scale: 0.7 + 0.6 * bleed.value }],
  }));

  return (
    <View style={{ width: size, height: size }} accessible={!!label} accessibilityLabel={label}>
      <Animated.View
        style={[
          styles.ink,
          { borderRadius: size, backgroundColor: inkTone === 'seal' ? colors.seal : colors.muted },
          ink,
        ]}
      />
      <Animated.View style={stamp}>
        <HankoStamp glyph={glyph ?? (correct ? '正' : '誤')} size={size} tone={inkTone} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ink: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
