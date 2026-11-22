import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';
import { DOJO } from './scene';

type Props = {
  /** Points. The room fills this width. */
  width: number;
  /** Grid units, between DOJO.minHeight and DOJO.height: the floor band absorbs the difference. */
  gridHeight: number;
  /** 0..1 through the player's day, moving the moon across the window towards the kata reset. */
  dayProgress: number;
};

/** Point on the moon's arc (a quadratic curve inside the window), t in 0..1. */
function moonAt(t: number): { x: number; y: number } {
  const a = { x: 132, y: 226 };
  const c = { x: 158, y: 70 };
  const b = { x: 200, y: 150 };
  const k = 1 - t;
  return {
    x: k * k * a.x + 2 * k * t * c.x + t * t * b.x,
    y: k * k * a.y + 2 * k * t * c.y + t * t * b.y,
  };
}

/**
 * The back wall and floor of the player's den (DESIGN.md: Kiri-e Den): a half-open shoji onto the
 * night, the lantern's flat circle of light, tatami mats and the low table. Interactive objects are
 * placed on top by the Dojo screen at DOJO_ANCHORS. Decorative, so hidden from screen readers.
 */
export function DojoScene({ width, gridHeight, dayProgress }: Props) {
  const H = Math.min(DOJO.height, Math.max(DOJO.minHeight, gridHeight));
  const F = DOJO.floorY;
  const T = H - DOJO.tableFromBottom;
  const seam = F + (H - F) * 0.58;
  const moon = moonAt(Math.min(1, Math.max(0, dayProgress)));
  return (
    <Svg
      width={width}
      height={(width / 390) * H}
      viewBox={`0 0 390 ${H}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <ClipPath id="sky">
          <Rect x={120} y={86} width={76} height={162} />
        </ClipPath>
      </Defs>
      <Rect width={390} height={H} fill={colors.ground} />
      <Circle cx={326} cy={178} r={118} fill="#43291C" />
      <Circle cx={326} cy={178} r={82} fill={colors.wallLight} />
      <Rect x={0} y={22} width={390} height={18} fill={colors.tatami} />
      <Rect x={0} y={40} width={14} height={F - 40} fill={colors.tatami} />
      <Rect x={376} y={40} width={14} height={F - 40} fill={colors.tatami} />

      {/* window: night on the left, shoji paper slid half over it */}
      <Rect x={112} y={78} width={168} height={178} fill={colors.tatami} />
      <Rect x={120} y={86} width={76} height={162} fill={colors.night} />
      <G clipPath="url(#sky)">
        <Circle cx={140} cy={200} r={1.4} fill={colors.text} opacity={0.6} />
        <Circle cx={182} cy={176} r={1.2} fill={colors.text} opacity={0.5} />
        <Circle cx={132} cy={112} r={1} fill={colors.text} opacity={0.5} />
        <Circle cx={moon.x} cy={moon.y} r={19} fill={colors.text} />
        <Circle cx={moon.x + 9} cy={moon.y - 6} r={17} fill={colors.night} />
      </G>
      <Rect x={196} y={86} width={76} height={162} fill={colors.shoji} />
      <G stroke={colors.muted} strokeWidth={2}>
        <Line x1={221} y1={86} x2={221} y2={248} />
        <Line x1={247} y1={86} x2={247} y2={248} />
        <Line x1={196} y1={126} x2={272} y2={126} />
        <Line x1={196} y1={166} x2={272} y2={166} />
        <Line x1={196} y1={206} x2={272} y2={206} />
      </G>
      <Rect x={192} y={86} width={6} height={162} fill={colors.wood} />
      <Rect x={100} y={256} width={192} height={10} fill={colors.wood} />

      {/* tatami floor with dark heri borders */}
      <Rect x={0} y={F} width={390} height={H - F} fill={colors.mat} />
      <G fill={colors.matShade}>
        <Path
          d={`M0 ${F + 10} L130 ${F + 10} L${130 - 0.2 * (seam - F)} ${seam - 6} L0 ${seam - 6} Z`}
        />
        <Path
          d={`M262 ${F + 10} L390 ${F + 10} L390 ${seam - 6} L${262 + 0.2 * (seam - F)} ${seam - 6} Z`}
        />
      </G>
      <G stroke={colors.tatami} strokeWidth={5}>
        <Line x1={0} y1={seam} x2={390} y2={seam} />
        <Line x1={134} y1={F + 2} x2={96} y2={H} />
        <Line x1={258} y1={F + 2} x2={296} y2={H} />
      </G>
      <Rect x={0} y={F - 4} width={390} height={6} fill={colors.wood} />

      {/* low table; the kata scroll sits on it */}
      <Ellipse cx={195} cy={T + 92} rx={170} ry={24} fill={colors.tatami} opacity={0.35} />
      <Path d={`M70 ${T} L320 ${T} L340 ${T + 24} L50 ${T + 24} Z`} fill={colors.wood} />
      <Rect x={50} y={T + 24} width={290} height={10} fill={colors.ground} />
      <Rect x={70} y={T + 34} width={14} height={40} fill={colors.ground} />
      <Rect x={306} y={T + 34} width={14} height={40} fill={colors.ground} />
    </Svg>
  );
}
