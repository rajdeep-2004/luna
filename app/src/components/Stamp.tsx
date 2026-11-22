import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { AppText } from './AppText';

/**
 * 正 (correct) or 誤 (wrong). Drops in with a spring (scale 1.5 → 1, tilted -6°). With Reduce Motion it just fades in.
 * Also labelled for screen readers, since the glyph alone is not enough.
 */
export function Stamp({ correct }: { correct: boolean }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(reduce ? 1 : 1.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: reduce ? 150 : 120 });
    if (!reduce) scale.value = withSpring(1, { damping: 12, stiffness: 160 });
  }, [reduce, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: '-6deg' }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityLabel={correct ? 'Correct' : 'Incorrect'}
      style={[styles.stamp, { borderColor: correct ? colors.moon : colors.ember }, style]}
    >
      <AppText variant="title" color={correct ? 'moon' : 'emberSoft'}>
        {correct ? '正' : '誤'}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
