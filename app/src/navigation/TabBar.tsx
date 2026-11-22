import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { TabIcon, type TabIconName } from '../art/TabIcon';
import { AppText, PressableSink } from '../components';
import { colors, layout, spacing } from '../theme';

/** The woven tatami-edge (heri) border along the top of the bar. */
function Heri() {
  return (
    <Svg width="100%" height={6} style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <Defs>
        <Pattern id="heri" width={15} height={6} patternUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={6} height={6} fill={colors.wallLight} />
          <Rect x={9} y={0} width={3} height={6} fill="#6B4530" />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height={6} fill="url(#heri)" />
    </Svg>
  );
}

/**
 * Luna's tab bar (DESIGN.md: Components): a tatami strip, cut-paper icons, a vermilion hanko mark under
 * the active tab, a 2 pt sink and a haptic on press. Replaces React Navigation's default bar, whose
 * hidden icons and grey ripple were part of the rejected UI (D-037).
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <Heri />
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key]?.options.title ?? route.name;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <PressableSink
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.tab}
          >
            <TabIcon name={route.name as TabIconName} active={focused} />
            <AppText variant="label" color={focused ? 'text' : 'muted'}>
              {label}
            </AppText>
            <View style={[styles.hanko, !focused && styles.hidden]} />
          </PressableSink>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.tatami,
    paddingTop: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    minHeight: layout.touchTarget,
  },
  hanko: { width: 6, height: 6, backgroundColor: colors.seal, marginTop: 1 },
  hidden: { opacity: 0 },
});
