import Svg, { Circle } from 'react-native-svg';
import { colors, type ColorToken } from '../theme';

type Props = { progress: number; size: number; color?: ColorToken; thickness?: number };

/**
 * The ensō brush circle that replaces every progress bar (DESIGN.md): it closes as XP nears the next
 * rank. A real ensō is never fully closed, so it stops just short even at the top rank.
 */
export function Enso({ progress, size, color = 'tatami', thickness = 0.09 }: Props) {
  const stroke = size * thickness;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.min(0.95, Math.max(0.06, progress));
  return (
    <Svg
      width={size}
      height={size}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colors[color]}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circ * p} ${circ}`}
        transform={`rotate(-200 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
