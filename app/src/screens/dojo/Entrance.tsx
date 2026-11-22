import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '../../lib/motion';

/**
 * How each Dojo object enters (P7 feedback): the rank scroll unrolls downward, the lantern drops on
 * its cord and swings to rest, the ema sways on its peg, the mask rises onto its stand, the rest fade.
 */
export type EntranceKind = 'unroll' | 'drop' | 'sway' | 'rise' | 'fade';

/**
 * A counter that ticks each time the Dojo gains focus or the app returns to the foreground: the
 * entrance replays on every return to the room, not only on the first launch.
 */
export function useEntranceKey(): number {
  const [key, setKey] = useState(0);
  useFocusEffect(useCallback(() => setKey((k) => k + 1), []));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setKey((k) => k + 1);
    });
    return () => sub.remove();
  }, []);
  return key;
}

type Props = {
  kind: EntranceKind;
  /** Changes to replay the entrance (see useEntranceKey). 0 = not played yet: stay hidden. */
  playKey: number;
  delay?: number;
  /** Height of the object in points, for the drop distance. */
  height?: number;
  children: ReactNode;
};

const UNROLL_MS = 520;
const FADE_MS = 360;

/** Wraps one Dojo object and plays its entrance. With Reduce Motion the object is simply there. */
export function Entrance({ kind, playKey, delay = 0, height = 120, children }: Props) {
  const reduce = useReduceMotion();
  const t = useSharedValue(reduce ? 1 : 0);
  const swing = useSharedValue(0);

  useEffect(() => {
    if (reduce || playKey === 0) return;
    t.value = 0;
    swing.value = 0;
    if (kind === 'unroll') {
      t.value = withDelay(
        delay,
        withTiming(1, { duration: UNROLL_MS, easing: Easing.out(Easing.cubic) }),
      );
    } else if (kind === 'drop') {
      t.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 140 }));
      swing.value = withDelay(
        delay + 220,
        withSequence(
          withTiming(6, { duration: 260 }),
          withTiming(-3.5, { duration: 340 }),
          withTiming(1.5, { duration: 320 }),
          withTiming(0, { duration: 300 }),
        ),
      );
    } else if (kind === 'sway') {
      t.value = withDelay(delay, withTiming(1, { duration: FADE_MS }));
      swing.value = withDelay(
        delay,
        withSequence(
          withTiming(9, { duration: 0 }),
          withTiming(-5, { duration: 380 }),
          withTiming(2.5, { duration: 340 }),
          withTiming(0, { duration: 300 }),
        ),
      );
    } else {
      t.value = withDelay(
        delay,
        withTiming(1, {
          duration: kind === 'rise' ? 480 : FADE_MS,
          easing: Easing.out(Easing.quad),
        }),
      );
    }
  }, [playKey, reduce, kind, delay, t, swing]);

  const style = useAnimatedStyle(() => {
    switch (kind) {
      case 'unroll':
        return { opacity: t.value > 0 ? 1 : 0, transform: [{ scaleY: Math.max(0.001, t.value) }] };
      case 'drop':
        return {
          opacity: t.value > 0 ? 1 : 0,
          transform: [
            { translateY: (t.value - 1) * (height + 80) },
            { rotate: `${swing.value}deg` },
          ],
        };
      case 'sway':
        return { opacity: t.value, transform: [{ rotate: `${swing.value}deg` }] };
      case 'rise':
        return {
          opacity: t.value,
          transform: [{ translateY: (1 - t.value) * 22 }, { scale: 0.92 + 0.08 * t.value }],
        };
      default:
        return { opacity: t.value };
    }
  });

  return <Animated.View style={[{ transformOrigin: 'top' }, style]}>{children}</Animated.View>;
}
