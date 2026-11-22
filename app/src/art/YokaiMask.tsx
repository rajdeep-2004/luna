import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { AvatarId } from '@luna/shared';
import { colors } from '../theme';

const ink = {
  stroke: colors.tatami,
  strokeWidth: 3.2,
  strokeLinecap: 'round' as const,
  fill: 'none',
};
const red = {
  stroke: colors.seal,
  strokeWidth: 3.2,
  strokeLinecap: 'round' as const,
  fill: 'none',
};

/** Closed, content-aware eyes: the masks rest, like the master at home. */
const restingEyes = (y: number, gap = 13) => (
  <Path
    d={`M${50 - gap - 7} ${y} Q${50 - gap} ${y - 7} ${50 - gap + 7} ${y} M${50 + gap - 7} ${y} Q${50 + gap} ${y - 7} ${50 + gap + 7} ${y}`}
    {...ink}
  />
);

/**
 * The eight yokai masks in cut-paper style (DESIGN.md), on a 100 × 100 grid. Each is a distinct
 * silhouette first, so they read at 28 pt in the tab bar as well as at 160 pt on the Profile banner.
 */
const MASKS: Record<AvatarId, ReactNode> = {
  kitsune: (
    <G>
      <Path d="M20 32 L30 4 L44 28 L56 28 L70 4 L80 32 L72 72 L50 98 L28 72 Z" fill={colors.text} />
      <Path d="M30 12 L36 26 L28 28 Z M70 12 L64 26 L72 28 Z" fill={colors.seal} />
      {restingEyes(54, 12)}
      <Path d="M44 36 L50 44 L56 36" {...red} />
      <Path d="M28 66 L38 70 M72 66 L62 70" {...red} />
      <Path d="M46 86 L50 92 L54 86 Z" fill={colors.tatami} />
    </G>
  ),
  tanuki: (
    <G>
      <Circle cx={24} cy={24} r={11} fill={colors.muted} />
      <Circle cx={76} cy={24} r={11} fill={colors.muted} />
      <Ellipse cx={50} cy={56} rx={38} ry={36} fill={colors.text} />
      <Path
        d="M18 50 Q30 38 44 52 Q36 66 22 62 Z M82 50 Q70 38 56 52 Q64 66 78 62 Z"
        fill={colors.wood}
      />
      {restingEyes(54, 18)}
      <Ellipse cx={50} cy={70} rx={6} ry={4.5} fill={colors.tatami} />
      <Path d="M44 14 Q50 2 58 12 Q52 18 44 14 Z" fill={colors.primary} />
    </G>
  ),
  oni: (
    <G>
      <Path d="M22 30 L14 4 L34 24 Z M78 30 L86 4 L66 24 Z" fill={colors.shoji} />
      <Path d="M14 40 Q50 6 86 40 L80 78 Q50 100 20 78 Z" fill={colors.seal} />
      <Path
        d="M24 44 L42 50 M76 44 L58 50"
        stroke={colors.tatami}
        strokeWidth={5}
        strokeLinecap="round"
      />
      {restingEyes(58, 14)}
      <Path d="M30 76 Q50 88 70 76" {...ink} />
      <Path d="M34 76 L38 86 L42 79 Z M66 76 L62 86 L58 79 Z" fill={colors.text} />
    </G>
  ),
  tengu: (
    <G>
      <Path d="M16 34 Q50 4 84 34 L78 78 Q50 98 22 78 Z" fill={colors.seal} />
      <Path
        d="M22 36 Q34 28 44 38 M78 36 Q66 28 56 38"
        stroke={colors.text}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      {restingEyes(48, 14)}
      <Path
        d="M46 52 L96 60 L50 70 Z"
        fill={colors.seal}
        stroke={colors.tatami}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M36 84 Q50 78 64 84" {...ink} />
    </G>
  ),
  neko: (
    <G>
      <Path d="M14 42 L16 6 L40 26 L60 26 L84 6 L86 42 L80 74 Q50 98 20 74 Z" fill={colors.text} />
      <Path d="M20 14 L22 30 L34 26 Z M80 14 L78 30 L66 26 Z" fill={colors.seal} />
      <Path
        d="M30 52 Q36 46 42 52 M58 52 Q64 46 70 52"
        stroke={colors.primary}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M46 64 L50 68 L54 64 Z" fill={colors.seal} />
      <Path d="M50 68 Q46 76 40 74 M50 68 Q54 76 60 74" {...ink} />
      <Path
        d="M10 62 L30 66 M10 72 L30 70 M90 62 L70 66 M90 72 L70 70"
        stroke={colors.tatami}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </G>
  ),
  ryu: (
    <G>
      <Path
        d="M26 30 L18 2 L36 22 M74 30 L82 2 L64 22"
        stroke={colors.primary}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M16 36 Q50 10 84 36 L84 66 L66 96 L34 96 L16 66 Z" fill={colors.night} />
      <Path
        d="M24 46 L42 52 M76 46 L58 52"
        stroke={colors.primary}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Path
        d="M30 60 Q36 54 42 60 M58 60 Q64 54 70 60"
        stroke={colors.text}
        strokeWidth={3.2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M36 80 Q20 84 6 74 M64 80 Q80 84 94 74"
        stroke={colors.text}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={42} cy={78} r={2.5} fill={colors.text} />
      <Circle cx={58} cy={78} r={2.5} fill={colors.text} />
    </G>
  ),
  usagi: (
    <G>
      <Path
        d="M30 46 Q22 18 30 2 Q42 18 40 46 Z M70 46 Q78 18 70 2 Q58 18 60 46 Z"
        fill={colors.text}
      />
      <Path
        d="M31 38 Q28 22 31 10 Q36 22 36 38 Z M69 38 Q72 22 69 10 Q64 22 64 38 Z"
        fill={colors.seal}
      />
      <Ellipse cx={50} cy={66} rx={34} ry={30} fill={colors.text} />
      {restingEyes(64, 14)}
      <Circle cx={26} cy={74} r={5} fill={colors.seal} />
      <Circle cx={74} cy={74} r={5} fill={colors.seal} />
      <Path d="M46 76 L50 80 L54 76" {...ink} />
    </G>
  ),
  kappa: (
    <G>
      <Ellipse cx={50} cy={60} rx={36} ry={36} fill={colors.mat} />
      <Ellipse cx={50} cy={26} rx={26} ry={12} fill={colors.shoji} />
      <Path
        d="M24 26 L18 16 M34 18 L30 8 M66 18 L70 8 M76 26 L82 16"
        stroke={colors.matShade}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {restingEyes(56, 15)}
      <Path
        d="M36 72 Q50 64 64 72 L50 86 Z"
        fill={colors.primary}
        stroke={colors.tatami}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </G>
  ),
};

type Props = { id: AvatarId; size: number; label?: string };

/** A yokai mask on its own (no backdrop). Decorative unless `label` is given. */
export function YokaiMask({ id, size, label }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessible={!!label}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      {MASKS[id]}
    </Svg>
  );
}
