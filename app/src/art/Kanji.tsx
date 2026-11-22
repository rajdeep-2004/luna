import Svg, { Path } from 'react-native-svg';
import { colors, type ColorToken } from '../theme';
import { KANJI, type KanjiGlyph } from './kanjiPaths';

type Props = { glyph: KanjiGlyph; size: number; color?: ColorToken; label?: string };

/** One brush kanji from the baked set (D-039). Decorative unless `label` is given. */
export function Kanji({ glyph, size, color = 'text', label }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={KANJI[glyph].box}
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      <Path d={KANJI[glyph].d} fill={colors[color]} />
    </Svg>
  );
}

/**
 * Splits kanji text from the API (e.g. a rank's `kanji`, "浪人") into baked glyphs. Characters that
 * were not baked are dropped, so a new rank can never crash a screen; add them to the bake script.
 */
export function toGlyphs(text: string): KanjiGlyph[] {
  return [...text].filter((c): c is KanjiGlyph => c in KANJI);
}
