import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import type { PracticeMode } from '@luna/shared';
import { colors } from '../theme';

/** One small cut-paper picture per game mode, on a 64 × 56 grid (DESIGN.md: Explore). */
const ART: Record<PracticeMode, React.ReactNode> = {
  // A thread of execution winding to its end point.
  TRACE: (
    <G>
      <Path
        d="M6 44 C18 44 14 12 30 12 S42 40 58 30"
        fill="none"
        stroke={colors.primary}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Circle cx={58} cy={30} r={5} fill={colors.seal} />
    </G>
  ),
  // The bug itself.
  BUG_HUNT: (
    <G>
      <Ellipse cx={32} cy={32} rx={14} ry={18} fill={colors.shoji} />
      <Line x1={32} y1={14} x2={32} y2={50} stroke={colors.ground} strokeWidth={2.5} />
      <Circle cx={32} cy={12} r={7} fill={colors.shoji} />
      <Path
        d="M18 24 L8 18 M18 34 L6 34 M18 44 L8 50 M46 24 L56 18 M46 34 L58 34 M46 44 L56 50"
        stroke={colors.muted}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path d="M28 6 L24 0 M36 6 L40 0" stroke={colors.muted} strokeWidth={2.5} />
    </G>
  ),
  // A fork in the road with two flags.
  ENGINEER_CHOICE: (
    <G>
      <Path
        d="M32 52 V28 L12 8 M32 28 L52 8"
        fill="none"
        stroke={colors.muted}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x={5} y={2} width={14} height={10} fill={colors.seal} transform="rotate(-45 12 7)" />
      <Rect x={45} y={2} width={14} height={10} fill={colors.primary} transform="rotate(45 52 7)" />
    </G>
  ),
};

export function ModeArt({ mode, width = 64 }: { mode: PracticeMode; width?: number }) {
  return (
    <Svg width={width} height={(width / 64) * 56} viewBox="0 0 64 56">
      {ART[mode]}
    </Svg>
  );
}

/** The boss stage behind the Incident Room: night mountains, a fire, and the server bell. 390 × 128. */
export function BossStage({ width, height = 128 }: { width: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 390 128" preserveAspectRatio="xMaxYMid slice">
      <Rect width={390} height={128} fill={colors.night} />
      <Path
        d="M170 128 L210 40 L230 70 L260 10 L290 64 L310 36 L350 128 Z"
        fill={colors.nightDeep}
      />
      <Path
        d="M270 128 Q276 92 288 96 Q282 72 300 60 Q296 84 312 88 Q308 104 320 128 Z"
        fill={colors.seal}
      />
      <Path
        d="M284 128 Q288 104 298 106 Q296 92 306 86 Q304 104 312 110 L310 128 Z"
        fill={colors.primary}
      />
      <G transform="translate(220 30)">
        <Path d="M0 0 Q14 0 14 18 L18 34 L-18 34 L-14 18 Q-14 0 0 0 Z" fill={colors.shoji} />
        <Rect x={-4} y={-8} width={8} height={8} fill={colors.muted} />
        <Circle cx={0} cy={40} r={5} fill={colors.shoji} />
      </G>
    </Svg>
  );
}
