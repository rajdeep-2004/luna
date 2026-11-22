import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import type { SessionSummary } from '@luna/shared';
import { Enso } from '../../art/Enso';
import { Kanji, toGlyphs } from '../../art/Kanji';
import { AppText, Button } from '../../components';
import { haptic } from '../../lib/haptics';
import { useReduceMotion } from '../../lib/motion';
import { colors, layout, spacing } from '../../theme';

type Props = { rankUp: NonNullable<SessionSummary['rankUp']>; onDone: () => void };

const DRAW_MS = 520;
const BRUSH_MS = 700;

/** A katana in cut paper: blade, hamon line, tsuba and wrapped grip. 300 × 24 grid. */
function Katana({ width }: { width: number }) {
  return (
    <Svg width={width} height={(width / 300) * 24} viewBox="0 0 300 24">
      <Path d="M70 9 L284 7 Q298 8 296 12 Q290 15 284 15 L70 15 Z" fill={colors.shoji} />
      <Path d="M80 12 Q180 10 280 11" stroke={colors.muted} strokeWidth={1.2} fill="none" />
      <Rect x={60} y={2} width={8} height={20} rx={2} fill={colors.seal} />
      <Rect x={4} y={7} width={56} height={10} rx={3} fill={colors.tatami} />
      <Path
        d="M10 7 L18 17 M22 7 L30 17 M34 7 L42 17 M46 7 L54 17"
        stroke={colors.primary}
        strokeWidth={1.6}
      />
    </Svg>
  );
}

/**
 * The rank-up moment (DESIGN.md motion 5): a katana draws across the screen, then the new rank's kanji
 * is brushed in from left to right inside a closed ensō, and the new name lands. Shown once, when the
 * completion crosses a threshold. With Reduce Motion everything appears at once.
 */
export function RankUpOverlay({ rankUp, onDone }: Props) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const blade = width * 0.9;
  const draw = useSharedValue(reduce ? 1 : 0);
  const brush = useSharedValue(reduce ? 1 : 0);
  const land = useSharedValue(reduce ? 1 : 0);
  const glyphs = toGlyphs(rankUp.kanji);
  const kanjiSize = glyphs.length > 1 ? 88 : 120;
  const kanjiW = kanjiSize * Math.max(1, glyphs.length);

  useEffect(() => {
    haptic.success();
    if (reduce) return;
    draw.value = withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.cubic) });
    brush.value = withDelay(
      DRAW_MS,
      withTiming(1, { duration: BRUSH_MS, easing: Easing.out(Easing.quad) }),
    );
    land.value = withDelay(DRAW_MS + BRUSH_MS * 0.6, withTiming(1, { duration: 300 }));
    const t = setTimeout(() => haptic.heavy(), DRAW_MS + BRUSH_MS);
    return () => clearTimeout(t);
  }, [reduce, draw, brush, land]);

  const sword = useAnimatedStyle(() => ({
    opacity: draw.value < 1 ? 1 : 0,
    transform: [{ translateX: -width + draw.value * width * 2 }, { rotate: '-14deg' }],
  }));
  const brushed = useAnimatedStyle(() => ({ width: kanjiW * brush.value }));
  const ensoIn = useAnimatedStyle(() => ({
    opacity: brush.value,
    transform: [{ rotate: `${-40 + 40 * brush.value}deg` }],
  }));
  const nameIn = useAnimatedStyle(() => ({
    opacity: land.value,
    transform: [{ translateY: (1 - land.value) * 12 }],
  }));

  return (
    <View style={styles.overlay} accessibilityViewIsModal accessibilityLiveRegion="assertive">
      <Animated.View style={[styles.sword, sword]} pointerEvents="none">
        <Katana width={blade} />
      </Animated.View>

      <View style={styles.body}>
        <View style={[styles.stage, { width: kanjiW + 80, height: kanjiSize + 80 }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, ensoIn]}>
            <Enso progress={1} size={kanjiSize + 76} color="primary" thickness={0.07} />
          </Animated.View>
          <View style={{ width: kanjiW, height: kanjiSize }}>
            <Animated.View style={[styles.reveal, { height: kanjiSize }, brushed]}>
              <View style={[styles.row, { width: kanjiW }]}>
                {glyphs.map((g, i) => (
                  <Kanji key={`${g}${i}`} glyph={g} size={kanjiSize} color="text" />
                ))}
              </View>
            </Animated.View>
          </View>
        </View>
        <Animated.View style={[styles.center, nameIn]}>
          <AppText variant="label" color="primary">
            RANK UP
          </AppText>
          <AppText
            variant="display"
            style={styles.centerText}
            accessibilityLabel={`Rank up. You are now ${rankUp.rankName}, level ${rankUp.level}`}
          >
            {rankUp.rankName}
          </AppText>
          <AppText color="muted">Level {rankUp.level}</AppText>
        </Animated.View>
      </View>
      <View style={styles.actions}>
        <Button label="Continue" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ground,
    paddingHorizontal: layout.screenPadding,
  },
  sword: { position: 'absolute', top: '30%', left: '5%' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  stage: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  centerText: { textAlign: 'center' },
  reveal: { overflow: 'hidden', alignSelf: 'flex-start' },
  row: { flexDirection: 'row' },
  actions: { paddingBottom: spacing.giant },
});
