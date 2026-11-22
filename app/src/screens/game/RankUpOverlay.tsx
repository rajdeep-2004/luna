import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SessionSummary } from '@luna/shared';
import { AppText, Button, MoonPhase } from '../../components';
import { haptic } from '../../lib/haptics';
import { colors, layout, spacing } from '../../theme';

type Props = { rankUp: NonNullable<SessionSummary['rankUp']>; onDone: () => void };

/** progression.md §1: the full-screen "Rank up — you are now Ronin 浪人" moment. */
export function RankUpOverlay({ rankUp, onDone }: Props) {
  const reduce = useReducedMotion();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(reduce ? 1 : 0.8);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: reduce ? 200 : 400 });
    if (!reduce) scale.value = withSpring(1, { damping: 12 });
    haptic.success();
  }, [reduce, opacity, scale]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[styles.overlay, fade]}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
    >
      <Animated.View style={[styles.body, pop]}>
        <MoonPhase phase="full" size={96} />
        <AppText variant="label" color="moon">
          Rank up
        </AppText>
        <AppText
          variant="display"
          style={styles.center}
          accessibilityLabel={`You are now ${rankUp.rankName}, level ${rankUp.level}`}
        >
          {rankUp.kanji}
        </AppText>
        <AppText variant="title" style={styles.center}>
          You are now {rankUp.rankName}
        </AppText>
        <AppText color="textMuted">Level {rankUp.level}</AppText>
      </Animated.View>
      <View style={styles.actions}>
        <Button label="Continue" onPress={onDone} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    paddingHorizontal: layout.screenPadding,
    justifyContent: 'center',
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  actions: { paddingBottom: spacing.giant },
});
