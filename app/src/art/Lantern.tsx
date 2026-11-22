import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Line, Path, Rect } from 'react-native-svg';
import { AppText } from '../components/AppText';
import { colors } from '../theme';

export type LanternState = 'lit' | 'waiting' | 'out';

type Props = {
  streak: number;
  /** lit: today's kata is done. waiting: the streak is alive but today is not done. out: no streak. */
  state: LanternState;
  /** Width in points; the lantern is drawn on an 88 × 252 grid box (DOJO_ANCHORS.lantern). */
  width: number;
  showCaption?: boolean;
};

const BODY = { lit: colors.primary, waiting: colors.primaryPressed, out: colors.wood } as const;
const RIB = { lit: colors.primaryPressed, waiting: '#A86A14', out: colors.wallLight } as const;

/** The paper lantern that *is* the streak (DESIGN.md: Layout). The number is cut into its paper. */
export function Lantern({ streak, state, width, showCaption = true }: Props) {
  const s = width / 88;
  const caption = state === 'out' ? 'LIGHT IT TODAY' : 'DAY STREAK';
  return (
    <View style={{ width, height: 252 * s }}>
      <Svg width={width} height={252 * s} viewBox="0 0 88 252">
        <Line x1={44} y1={0} x2={44} y2={72} stroke={colors.muted} strokeWidth={1.5} />
        <Rect x={24} y={72} width={40} height={12} rx={3} fill={colors.tatami} />
        <Ellipse cx={44} cy={138} rx={40} ry={56} fill={BODY[state]} />
        <Path
          d="M6 110 Q44 102 82 110 M4 138 Q44 130 84 138 M6 166 Q44 158 82 166"
          stroke={RIB[state]}
          strokeWidth={2}
          fill="none"
        />
        <Rect x={24} y={192} width={40} height={12} rx={3} fill={colors.tatami} />
        <Line x1={44} y1={204} x2={44} y2={222} stroke={colors.seal} strokeWidth={3} />
      </Svg>
      <View style={[styles.number, { top: 100 * s, height: 76 * s }]} pointerEvents="none">
        <AppText
          variant="number"
          color={state === 'out' ? 'muted' : 'ground'}
          style={{ fontSize: 44 * s, lineHeight: 52 * s }}
        >
          {streak}
        </AppText>
      </View>
      {showCaption ? (
        <AppText
          variant="label"
          color="muted"
          style={[styles.caption, { top: 228 * s, fontSize: 11 * s }]}
        >
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  number: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { position: 'absolute', left: -20, right: -20, textAlign: 'center' },
});
