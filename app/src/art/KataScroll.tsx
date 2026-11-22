import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Rect } from 'react-native-svg';
import { colors } from '../theme';
import { HankoStamp } from './HankoStamp';
import { Kanji } from './Kanji';

type Props = {
  /** sealed: today's kata waits. done: today's kata is finished (stamped 正). */
  state: 'sealed' | 'done';
  /** Width in points; drawn on a 192 × 40 grid box. */
  width: number;
};

/** The Daily Kata as a rolled scroll on the low table, sealed with a vermilion 今日 ("today") seal. */
export function KataScroll({ state, width }: Props) {
  const s = width / 192;
  return (
    <View style={{ width, height: 40 * s }}>
      <Svg width={width} height={40 * s} viewBox="0 0 192 40">
        <Rect x={9} y={3} width={174} height={34} rx={17} fill={colors.shoji} />
        <Ellipse cx={9} cy={20} rx={9} ry={17} fill={colors.muted} />
        <Ellipse cx={183} cy={20} rx={9} ry={17} fill={colors.muted} />
        {state === 'sealed' ? (
          <Rect x={81} y={1} width={30} height={38} fill={colors.seal} />
        ) : null}
      </Svg>
      <View style={[styles.mark, { left: 81 * s, width: 30 * s, height: 40 * s }]}>
        {state === 'sealed' ? (
          <>
            <Kanji glyph="今" size={13 * s} color="text" />
            <Kanji glyph="日" size={13 * s} color="text" />
          </>
        ) : (
          <HankoStamp glyph="正" size={30 * s} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute', top: 0, alignItems: 'center', justifyContent: 'center' },
});
