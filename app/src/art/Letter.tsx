import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

/** A folded letter slid under the shoji: a Checkpoint has arrived (DESIGN.md: Layout). 60 × 40 grid. */
export function Letter({ width }: { width: number }) {
  return (
    <Svg width={width} height={(width / 60) * 40} viewBox="0 0 60 40" accessibilityElementsHidden>
      <Rect x={2} y={6} width={56} height={32} fill={colors.shoji} transform="rotate(-8 30 22)" />
      <Path
        d="M2 6 L30 24 L58 6"
        stroke={colors.muted}
        strokeWidth={2}
        fill="none"
        transform="rotate(-8 30 22)"
      />
      <Rect x={24} y={16} width={12} height={12} fill={colors.seal} transform="rotate(-8 30 22)" />
    </Svg>
  );
}
