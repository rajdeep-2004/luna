import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

export type TabIconName = 'Dojo' | 'Explore' | 'Duel' | 'Profile';

type Props = { name: TabIconName; active: boolean; size?: number };

/**
 * Cut-paper tab icons (DESIGN.md: tab bar). Inactive: outline in muted wood. Active: filled vermilion.
 * Drawn on a 28 × 28 grid.
 */
export function TabIcon({ name, active, size = 28 }: Props) {
  const ink = active ? colors.seal : colors.muted;
  const fill = active ? colors.seal : 'none';
  const line = { stroke: ink, strokeWidth: active ? 2.4 : 2, strokeLinejoin: 'round' as const };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {name === 'Dojo' ? (
        <>
          <Path d="M2 12 L14 4 L26 12 L22 12 L22 24 L6 24 L6 12 Z" fill={fill} {...line} />
          {active ? <Rect x={11} y={16} width={6} height={8} fill={colors.tatami} /> : null}
        </>
      ) : null}
      {name === 'Explore' ? (
        <>
          <Path d="M14 24 L3 10 Q14 2 25 10 Z" fill={fill} {...line} />
          <Path
            d="M14 24 L9 6 M14 24 L14 5 M14 24 L19 6"
            stroke={active ? colors.tatami : ink}
            strokeWidth={1.6}
          />
        </>
      ) : null}
      {name === 'Duel' ? (
        <Path
          d="M5 23 L23 5 M5 5 L23 23 M3 19 L9 25 M19 3 L25 9 M3 9 L9 3 M19 25 L25 19"
          stroke={ink}
          strokeWidth={active ? 3 : 2.2}
          strokeLinecap="round"
          fill="none"
        />
      ) : null}
      {name === 'Profile' ? (
        <Path d="M6 8 L9 2 L12 7 L16 7 L19 2 L22 8 L20 18 L14 26 L8 18 Z" fill={fill} {...line} />
      ) : null}
    </Svg>
  );
}
