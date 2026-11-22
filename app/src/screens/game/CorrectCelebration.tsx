import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { HankoStamp } from '../../art/HankoStamp';
import { Kanji } from '../../art/Kanji';
import { AppText, Button } from '../../components';
import { haptic } from '../../lib/haptics';
import { useReduceMotion } from '../../lib/motion';
import { useCountUp } from '../../lib/useCountUp';
import { colors, layout, spacing } from '../../theme';

type Props = {
  xpEarned: number;
  nextLabel: string;
  advancing: boolean;
  onNext: () => void;
  /** Opens the full feedback sheet with the explanation unfolded. */
  onExplain: () => void;
};

const SLASH_MS = 260;
const WORD_MS = 420;
const STAMP_DELAY = SLASH_MS + WORD_MS - 80;

/** Short English lines under 見事, picked at random so repeats feel less canned. */
const LINES = ['Clean cut.', 'One stroke.', 'Sharp blade.', 'Well struck.', 'True aim.'];

/** One diagonal brush slash on a 390 × 200 grid: a lens-shaped wedge, thick in the middle. */
function Slash({ width }: { width: number }) {
  return (
    <Svg width={width} height={(width / 390) * 200} viewBox="0 0 390 200">
      <Path d="M6 182 Q180 96 386 14 Q206 118 6 182 Z" fill={colors.shoji} />
      <Path d="M40 170 Q200 100 360 32" stroke={colors.primary} strokeWidth={1.4} fill="none" />
    </Svg>
  );
}

/** Ink spatter where the blade left the paper: seal-red drops of a few sizes. */
function Spatter({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={13} fill={colors.seal} />
      <Circle cx={74} cy={34} r={6} fill={colors.seal} />
      <Circle cx={28} cy={72} r={5} fill={colors.seal} />
      <Circle cx={82} cy={62} r={3.5} fill={colors.seal} />
      <Circle cx={22} cy={30} r={3} fill={colors.seal} />
      <Circle cx={62} cy={84} r={2.5} fill={colors.seal} />
    </Svg>
  );
}

/**
 * The celebration for a correct answer (P7 feedback): no answer, no paragraph, just the cut. An ink
 * slash crosses the screen, 見事 ("splendid") is brushed in, a 正 seal strikes beside it and the XP
 * counts up. The explanation stays one tap away behind "Why it works". With Reduce Motion it all
 * appears at once.
 */
export function CorrectCelebration({ xpEarned, nextLabel, advancing, onNext, onExplain }: Props) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const line = useMemo(() => LINES[Math.floor(Math.random() * LINES.length)], []);
  const xp = useCountUp(xpEarned, 600, reduce);
  const slash = useSharedValue(reduce ? 1 : 0);
  const word = useSharedValue(reduce ? 1 : 0);
  const stamp = useSharedValue(reduce ? 1 : 0);
  const dim = useSharedValue(reduce ? 1 : 0);
  const wordW = 2 * 96;

  useEffect(() => {
    haptic.heavy();
    if (reduce) return;
    dim.value = withTiming(1, { duration: 160 });
    slash.value = withTiming(1, { duration: SLASH_MS, easing: Easing.out(Easing.exp) });
    word.value = withDelay(
      SLASH_MS,
      withTiming(1, { duration: WORD_MS, easing: Easing.out(Easing.quad) }),
    );
    stamp.value = withDelay(STAMP_DELAY, withSpring(1, { damping: 12, stiffness: 240 }));
    const t = setTimeout(() => haptic.success(), STAMP_DELAY);
    return () => clearTimeout(t);
  }, [reduce, dim, slash, word, stamp]);

  const backdrop = useAnimatedStyle(() => ({ opacity: dim.value }));
  const cut = useAnimatedStyle(() => ({ width: width * slash.value }));
  const splat = useAnimatedStyle(() => ({
    opacity: slash.value >= 1 ? 1 : 0,
    transform: [{ scale: 0.4 + 0.6 * word.value }],
  }));
  const brushed = useAnimatedStyle(() => ({ width: wordW * word.value }));
  const seal = useAnimatedStyle(() => ({
    opacity: stamp.value > 0 ? 1 : 0,
    transform: [{ scale: 1.6 - 0.6 * stamp.value }, { rotate: '-6deg' }],
  }));
  const after = useAnimatedStyle(() => ({ opacity: stamp.value }));

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]} />

      <View style={styles.slashBand} pointerEvents="none">
        <Animated.View style={[styles.clip, cut]}>
          <Slash width={width} />
        </Animated.View>
        <Animated.View style={[styles.spatter, splat]}>
          <Spatter size={64} />
        </Animated.View>
      </View>

      <View style={styles.body} pointerEvents="box-none">
        <View
          style={styles.wordRow}
          accessible
          accessibilityRole="alert"
          accessibilityLabel={`Correct. Migoto, splendid. ${xpEarned} experience points.`}
        >
          <View style={{ width: wordW, height: 96 }}>
            <Animated.View style={[styles.clip, { height: 96 }, brushed]}>
              <View style={[styles.row, { width: wordW }]}>
                <Kanji glyph="見" size={96} color="text" />
                <Kanji glyph="事" size={96} color="text" />
              </View>
            </Animated.View>
          </View>
          <Animated.View style={[styles.seal, seal]}>
            <HankoStamp glyph="正" size={44} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.center, after]}>
          <AppText variant="label" color="muted">
            {line}
          </AppText>
          <AppText variant="number" color="primary">
            +{xp} XP
          </AppText>
        </Animated.View>
      </View>

      <Animated.View style={[styles.actions, after]}>
        <Button label={nextLabel} onPress={onNext} pending={advancing} />
        <Button label="Why it works" variant="ghost" onPress={onExplain} disabled={advancing} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(42,25,16,0.9)' },
  slashBand: { position: 'absolute', top: '14%', left: 0, right: 0 },
  clip: { overflow: 'hidden', alignSelf: 'flex-start' },
  spatter: { position: 'absolute', right: 6, top: -18 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  wordRow: { flexDirection: 'row', alignItems: 'flex-end' },
  row: { flexDirection: 'row' },
  seal: { marginLeft: -10, marginBottom: -8 },
  center: { alignItems: 'center', gap: spacing.xs },
  actions: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.giant,
    gap: spacing.sm,
  },
});
