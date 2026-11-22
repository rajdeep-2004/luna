import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

export type MoonPhaseName = 'new' | 'crescent' | 'half' | 'gibbous' | 'full';

/** Fraction of the disc that is lit, measured from the right edge. */
const LIT: Record<MoonPhaseName, number> = {
  new: 0,
  crescent: 0.25,
  half: 0.5,
  gibbous: 0.75,
  full: 1,
};

/** Path for the lit part: a half circle on the right plus an elliptical terminator. */
function litPath(r: number, c: number, lit: number): string {
  const top = `${c} ${c - r}`;
  const bottom = `${c} ${c + r}`;
  const rx = Math.abs(1 - 2 * lit) * r;
  const sweep = lit < 0.5 ? 0 : 1;
  return `M ${top} A ${r} ${r} 0 0 1 ${bottom} A ${rx} ${r} 0 0 ${sweep} ${top} Z`;
}

type Props = { phase: MoonPhaseName; size?: number };

export function MoonPhase({ phase, size = 64 }: Props) {
  const c = size / 2;
  const r = size / 2 - 1;
  const lit = LIT[phase];
  return (
    <Svg width={size} height={size} accessibilityLabel={`${phase} moon`}>
      <Circle cx={c} cy={c} r={r} fill={colors.track} />
      {lit >= 1 ? <Circle cx={c} cy={c} r={r} fill={colors.moon} /> : null}
      {lit > 0 && lit < 1 ? <Path d={litPath(r, c, lit)} fill={colors.moon} /> : null}
    </Svg>
  );
}
