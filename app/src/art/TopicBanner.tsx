import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { TopicSlug } from '@luna/shared';
import { colors, fontFamily } from '../theme';

/** Each topic's banner: cloth colour, mark colour and the cut-paper mark (DESIGN.md: Explore). */
const BANNERS: Record<TopicSlug, { cloth: string; ink: string }> = {
  'js-async': { cloth: colors.primary, ink: colors.tatami },
  'http-apis': { cloth: colors.wood, ink: colors.text },
  databases: { cloth: colors.night, ink: colors.text },
  'caching-queues': { cloth: colors.shoji, ink: colors.ground },
  'debugging-prod': { cloth: colors.seal, ink: colors.text },
};

function Mark({ slug, ink }: { slug: TopicSlug; ink: string }) {
  switch (slug) {
    case 'js-async':
      return (
        <SvgText
          x={33}
          y={72}
          fill={ink}
          fontSize={20}
          fontFamily={fontFamily.mono}
          textAnchor="middle"
        >
          {'=>'}
        </SvgText>
      );
    case 'http-apis':
      return (
        <SvgText
          x={33}
          y={72}
          fill={ink}
          fontSize={19}
          fontFamily={fontFamily.mono}
          textAnchor="middle"
        >
          200
        </SvgText>
      );
    case 'databases':
      return (
        <Path
          d="M22 52 A11 4 0 1 0 44 52 A11 4 0 1 0 22 52 M22 52 V72 Q33 78 44 72 V52 M22 62 Q33 68 44 62"
          stroke={ink}
          strokeWidth={2.4}
          fill="none"
        />
      );
    case 'caching-queues':
      return (
        <>
          <Rect x={21} y={50} width={24} height={6} fill={ink} />
          <Rect x={21} y={59} width={24} height={6} fill={ink} opacity={0.7} />
          <Rect x={21} y={68} width={24} height={6} fill={ink} opacity={0.45} />
        </>
      );
    case 'debugging-prod':
      return (
        <>
          <Path d="M33 48 Q42 48 42 60 L44 70 L22 70 L24 60 Q24 48 33 48 Z" fill={ink} />
          <Circle cx={33} cy={75} r={3} fill={ink} />
        </>
      );
  }
}

type Props = { slug: TopicSlug; width: number };

/**
 * A nobori banner hanging from its pole: one per topic, its mark cut into the cloth. Drawn on a
 * 66 × 132 grid; the swallowtail foot matches the preview's clip path.
 */
export function TopicBanner({ slug, width }: Props) {
  const b = BANNERS[slug];
  return (
    <Svg width={width} height={width * 2} viewBox="0 0 66 132">
      <Path d="M0 4 L66 4 L66 116 L33 132 L0 116 Z" fill={b.cloth} />
      <Rect x={0} y={0} width={66} height={6} rx={2} fill={colors.tatami} />
      <Ellipse cx={33} cy={22} rx={20} ry={2.2} fill={b.ink} opacity={0.25} />
      <Mark slug={slug} ink={b.ink} />
    </Svg>
  );
}
