import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import type { AvatarId } from '@luna/shared';
import { useReduceMotion } from '../lib/motion';
import { colors, fontFamily } from '../theme';
import { YokaiMask } from './YokaiMask';

type Props = {
  width: number;
  me: AvatarId;
  /** Null until someone joins: a dashed "?" stands in. */
  rival: AvatarId | null;
  meLabel: string;
  rivalLabel: string;
  /** Changes to replay the clash (e.g. on focus). */
  playKey?: number;
};

const H = 300;

/** The dashed stand-in for a rival nobody has met yet. */
function Unknown({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="-40 -60 80 100">
      <Path
        d="M-28 -34 Q0 -52 28 -34 L24 14 Q0 40 -24 14 Z"
        fill="none"
        stroke={colors.text}
        strokeWidth={3}
        strokeDasharray="6 6"
      />
      <SvgText
        x={0}
        y={8}
        textAnchor="middle"
        fontFamily={fontFamily.display}
        fontSize={30}
        fill={colors.text}
        opacity={0.8}
      >
        ?
      </SvgText>
    </Svg>
  );
}

/**
 * The duel face-off (DESIGN.md motion 6): your mask on the warm side, the rival on the night side,
 * a vermilion slash between. On each play both masks slide in from the edges, meet the slash and
 * a paper-cut spark flashes. 390 × 300 grid. With Reduce Motion the scene is simply there.
 */
export function FaceOff({ width, me, rival, meLabel, rivalLabel, playKey = 0 }: Props) {
  const reduce = useReduceMotion();
  const s = width / 390;
  const mask = 132 * s;
  const slide = useSharedValue(reduce ? 1 : 0);
  const spark = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    slide.value = 0;
    spark.value = 0;
    slide.value = withSpring(1, { damping: 13, stiffness: 150 });
    spark.value = withDelay(
      260,
      withSequence(
        withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 380 }),
      ),
    );
  }, [playKey, reduce, slide, spark]);

  const left = useAnimatedStyle(() => ({
    transform: [{ translateX: (slide.value - 1) * 160 * s }],
  }));
  const right = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - slide.value) * 160 * s }],
  }));
  const flash = useAnimatedStyle(() => ({
    opacity: spark.value,
    transform: [{ scale: 0.6 + 0.6 * spark.value }, { rotate: '18deg' }],
  }));

  return (
    <View
      style={{ width, height: H * s }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${meLabel} faces ${rival ? rivalLabel : 'an unknown rival'}.`}
    >
      <Svg width={width} height={H * s} viewBox={`0 0 390 ${H}`} style={StyleSheet.absoluteFill}>
        <Rect width={390} height={H} fill={colors.ground} />
        <Path d="M0 0 L240 0 L150 300 L0 300 Z" fill={colors.wallLight} />
        <Path d="M240 0 L390 0 L390 300 L150 300 Z" fill={colors.night} />
        <Path d="M228 -10 L252 -10 L162 310 L138 310 Z" fill={colors.seal} />
      </Svg>

      <Animated.View
        style={[styles.abs, { left: 92 * s - mask / 2, top: 150 * s - mask / 2 }, left]}
      >
        <YokaiMask id={me} size={mask} />
      </Animated.View>
      <Animated.View
        style={[styles.abs, { left: 300 * s - mask / 2, top: 152 * s - mask / 2 }, right]}
      >
        {rival ? <YokaiMask id={rival} size={mask} /> : <Unknown size={mask} />}
      </Animated.View>

      <Animated.View
        style={[styles.abs, { left: 195 * s - 40 * s, top: 150 * s - 40 * s }, flash]}
        pointerEvents="none"
      >
        <Svg width={80 * s} height={80 * s} viewBox="0 0 80 80">
          <Path d="M40 0 L46 30 L80 40 L46 50 L40 80 L34 50 L0 40 L34 30 Z" fill={colors.primary} />
          <Path d="M40 18 L43 37 L62 40 L43 43 L40 62 L37 43 L18 40 L37 37 Z" fill={colors.text} />
        </Svg>
      </Animated.View>

      <Svg
        width={width}
        height={H * s}
        viewBox={`0 0 390 ${H}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {/* An outlined "VS": a thick tatami stroke behind, the washi fill on top. */}
        <SvgText
          x={195}
          y={168}
          textAnchor="middle"
          fontFamily={fontFamily.display}
          fontSize={38}
          fill={colors.tatami}
          stroke={colors.tatami}
          strokeWidth={6}
        >
          VS
        </SvgText>
        <SvgText
          x={195}
          y={168}
          textAnchor="middle"
          fontFamily={fontFamily.display}
          fontSize={38}
          fill={colors.text}
        >
          VS
        </SvgText>
        <SvgText x={24} y={276} fontFamily={fontFamily.sansBold} fontSize={13} fill={colors.text}>
          {meLabel.toUpperCase()}
        </SvgText>
        <SvgText
          x={366}
          y={276}
          textAnchor="end"
          fontFamily={fontFamily.sansBold}
          fontSize={13}
          fill={colors.muted}
        >
          {rivalLabel.toUpperCase()}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ abs: { position: 'absolute' } });
