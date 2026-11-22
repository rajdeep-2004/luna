import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { DURATION, useReduceMotion } from '../lib/motion';
import { layout } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Off for controls that fire their own haptic (e.g. answer options). */
  hapticOnPress?: boolean;
};

/**
 * The base of every tappable in Luna: the control sinks 2 pt as if pressed into wood and a selection
 * haptic fires. A plain Pressable has no Android ripple; the old grey half-circle came from React
 * Navigation's default tab buttons, which TabBar replaces (DESIGN.md: "nothing ever ripples grey").
 */
export function PressableSink({ children, style, hapticOnPress = true, onPress, ...rest }: Props) {
  const reduce = useReduceMotion();
  const sink = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: sink.value }] }));
  const to = (v: number) => {
    sink.value = reduce ? v : withTiming(v, { duration: DURATION.micro });
  };
  return (
    <AnimatedPressable
      onPressIn={() => to(layout.pressSink)}
      onPressOut={() => to(0)}
      onPress={(e) => {
        if (hapticOnPress) haptic.selection();
        onPress?.(e);
      }}
      style={[style, animated]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
