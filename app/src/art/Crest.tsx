import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { AchievementKey } from '@luna/shared';
import { colors } from '../theme';

type Mark = (ink: string) => React.ReactNode;

/** Each achievement's crest: a disc colour and a cut mark, on a 58 × 58 grid (DESIGN.md: Profile). */
const CRESTS: Record<AchievementKey, { disc: string; ink: string; mark: Mark }> = {
  // First Strike: a single blade cut.
  FIRST_COMMIT: {
    disc: colors.primary,
    ink: colors.ground,
    mark: (ink) => (
      <G>
        <Path d="M18 40 L40 18" stroke={ink} strokeWidth={4} strokeLinecap="round" />
        <Path d="M15 37 L21 43" stroke={ink} strokeWidth={3} />
      </G>
    ),
  },
  // Bug Hunter: the bug.
  BUG_HUNTER: {
    disc: colors.seal,
    ink: colors.text,
    mark: (ink) => (
      <G>
        <Ellipse cx={29} cy={31} rx={9} ry={12} fill={ink} />
        <Path
          d="M20 24 L13 20 M20 32 L12 32 M20 39 L13 43 M38 24 L45 20 M38 32 L46 32 M38 39 L45 43"
          stroke={ink}
          strokeWidth={2.5}
        />
      </G>
    ),
  },
  // Daily Grinder: a kata scroll.
  DAILY_GRINDER: {
    disc: colors.shoji,
    ink: colors.ground,
    mark: (ink) => (
      <G>
        <Rect
          x={16}
          y={22}
          width={26}
          height={14}
          rx={7}
          fill="none"
          stroke={ink}
          strokeWidth={2.5}
        />
        <Rect x={25} y={20} width={8} height={18} fill={colors.seal} />
      </G>
    ),
  },
  // Incident Commander: the server bell.
  INCIDENT_COMMANDER: {
    disc: colors.night,
    ink: colors.text,
    mark: (ink) => (
      <G>
        <Path d="M29 16 Q38 16 38 27 L40 36 L18 36 L20 27 Q20 16 29 16 Z" fill={ink} />
        <Circle cx={29} cy={40} r={3} fill={ink} />
      </G>
    ),
  },
  // Perfect Run: a closed ensō.
  PERFECT_RUN: {
    disc: colors.wood,
    ink: colors.primary,
    mark: (ink) => <Circle cx={29} cy={29} r={12} fill="none" stroke={ink} strokeWidth={4} />,
  },
};

type Props = { id: AchievementKey; earned: boolean; size?: number };

/** An earned crest is solid; a locked one is a dashed outline of the same mark. */
export function Crest({ id, earned, size = 58 }: Props) {
  const c = CRESTS[id];
  return (
    <Svg width={size} height={size} viewBox="0 0 58 58">
      {earned ? (
        <>
          <Circle cx={29} cy={29} r={27} fill={c.disc} />
          <Circle
            cx={29}
            cy={29}
            r={22}
            fill="none"
            stroke={c.ink}
            strokeWidth={1.5}
            opacity={0.5}
          />
          {c.mark(c.ink)}
        </>
      ) : (
        <>
          <Circle
            cx={29}
            cy={29}
            r={26}
            fill="none"
            stroke={colors.muted}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <G opacity={0.55}>{c.mark(colors.muted)}</G>
        </>
      )}
    </Svg>
  );
}

export type TrophyKind = 'streak' | 'duels' | 'katas' | 'week';

/** The four trophies under the Profile banner, on a 44 × 44 grid. */
export function Trophy({ kind, size = 44 }: { kind: TrophyKind; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      {kind === 'streak' ? (
        <G>
          <Rect x={15} y={4} width={14} height={5} fill={colors.tatami} />
          <Ellipse cx={22} cy={22} rx={15} ry={14} fill={colors.primary} />
          <Path
            d="M10 17 H34 M8 22 H36 M10 27 H34"
            stroke={colors.primaryPressed}
            strokeWidth={1.5}
          />
          <Rect x={15} y={35} width={14} height={5} fill={colors.tatami} />
        </G>
      ) : kind === 'duels' ? (
        <G>
          <Path d="M8 36 L36 8" stroke={colors.shoji} strokeWidth={4} strokeLinecap="round" />
          <Path d="M8 8 L36 36" stroke={colors.seal} strokeWidth={4} strokeLinecap="round" />
          <Path d="M5 31 L13 39 M31 5 L39 13" stroke={colors.muted} strokeWidth={3} />
        </G>
      ) : kind === 'katas' ? (
        <G>
          <Rect x={8} y={14} width={28} height={16} rx={8} fill={colors.shoji} />
          <Ellipse cx={8} cy={22} rx={4} ry={8} fill={colors.muted} />
          <Ellipse cx={36} cy={22} rx={4} ry={8} fill={colors.muted} />
          <Rect x={18} y={12} width={8} height={20} fill={colors.seal} />
        </G>
      ) : (
        <G>
          <Path d="M8 16 L22 8 L36 16 L36 36 L8 36 Z" fill={colors.muted} />
          <Circle cx={22} cy={13} r={1.8} fill={colors.tatami} />
        </G>
      )}
    </Svg>
  );
}
