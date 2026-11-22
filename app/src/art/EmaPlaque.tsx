import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { AppText } from '../components/AppText';
import { colors } from '../theme';

type Props = {
  /** This week's place on the Dojo Board, or null when not on it yet. */
  rank: number | null;
  /** Width in points; drawn on a 68 × 88 grid box (DOJO_ANCHORS.ema). */
  width: number;
};

/** The wooden ema plaque on a peg: this week's place, one tap to the Dojo Board. */
export function EmaPlaque({ rank, width }: Props) {
  const s = width / 68;
  return (
    <View style={{ width, height: 88 * s }}>
      <Svg width={width} height={88 * s} viewBox="0 0 68 88">
        <Circle cx={34} cy={6} r={3} fill={colors.muted} />
        <Line x1={34} y1={6} x2={34} y2={28} stroke={colors.muted} strokeWidth={1.5} />
        <Path d="M4 42 L34 26 L64 42 L64 86 L4 86 Z" fill={colors.muted} />
      </Svg>
      <View style={[styles.text, { top: 46 * s }]}>
        <AppText
          variant="title"
          color="tatami"
          style={{ fontSize: (rank ? 18 : 13) * s, lineHeight: 22 * s }}
        >
          {rank ? `#${rank}` : 'Rank'}
        </AppText>
        <AppText variant="label" color="ground" style={{ fontSize: 8.5 * s, lineHeight: 11 * s }}>
          {rank ? 'THIS WEEK' : 'NOT YET'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { position: 'absolute', left: 4, right: 4, alignItems: 'center' },
});
