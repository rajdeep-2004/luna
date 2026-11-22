import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { AppText } from '../components/AppText';
import { colors } from '../theme';
import { Enso } from './Enso';
import { Kanji } from './Kanji';
import type { KanjiGlyph } from './kanjiPaths';

type Props = {
  /** One or two rank characters, e.g. ['侍'] or ['浪', '人']. */
  glyphs: KanjiGlyph[];
  rankName: string;
  level: number;
  /** 0..1 towards the next rank; drives the ensō. */
  progress: number;
  /** Width in points; drawn on a 72 × 224 grid box (DOJO_ANCHORS.scroll). */
  width: number;
};

/** The hanging kakejiku scroll: rank kanji inside the XP ensō, the rank name and level under it. */
export function RankScroll({ glyphs, rankName, level, progress, width }: Props) {
  const s = width / 72;
  const enso = 56 * s;
  const glyph = (glyphs.length > 1 ? 22 : 34) * s;
  return (
    <View style={{ width, height: 224 * s }}>
      <Svg width={width} height={224 * s} viewBox="0 0 72 224">
        <Line x1={36} y1={0} x2={36} y2={10} stroke={colors.muted} strokeWidth={1.5} />
        <Rect x={0} y={10} width={72} height={8} rx={3} fill={colors.tatami} />
        <Rect x={6} y={18} width={60} height={196} fill={colors.shoji} />
        <Rect x={0} y={214} width={72} height={9} rx={3} fill={colors.tatami} />
      </Svg>
      <View style={[styles.center, { top: 34 * s, height: enso }]}>
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.center}>
            <Enso progress={progress} size={enso} color="tatami" />
          </View>
        </View>
        <View style={styles.row}>
          {glyphs.map((g, i) => (
            <Kanji key={`${g}${i}`} glyph={g} size={glyph} color="tatami" />
          ))}
        </View>
      </View>
      <AppText
        variant="title"
        color="onShoji"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.text, { top: 108 * s, fontSize: 9.5 * s, lineHeight: 14 * s }]}
      >
        {rankName.toUpperCase()}
      </AppText>
      <AppText
        variant="label"
        color="wood"
        style={[styles.text, { top: 126 * s, fontSize: 10 * s }]}
      >
        LVL {level}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row' },
  text: { position: 'absolute', left: 8, right: 8, textAlign: 'center' },
});
