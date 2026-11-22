import Svg, { Path } from 'react-native-svg';
import { colors, type ColorToken } from '../theme';
import { KANJI, KANJI_VIEWBOX, type KanjiGlyph } from './kanji';

type Props = { glyph: KanjiGlyph; size: number; color?: ColorToken; label?: string };

/** One brush kanji from the baked set (D-039). Decorative unless `label` is given. */
export function Kanji({ glyph, size, color = 'text', label }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={KANJI_VIEWBOX}
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      <Path d={KANJI[glyph]} fill={colors[color]} />
    </Svg>
  );
}
