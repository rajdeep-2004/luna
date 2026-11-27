import { StyleSheet, View } from 'react-native';
import type { DuelRoundResult, DuelSnapshot } from '@luna/shared';
import { HankoStamp } from '../../../art/HankoStamp';
import { YokaiMask } from '../../../art/YokaiMask';
import { AppText } from '../../../components';
import { firstSentence } from '../../../lib/live/state';
import { colors, radii, spacing } from '../../../theme';

type Round = DuelSnapshot['rounds'][number];
type Props = { duel: DuelSnapshot; round: Round };

/** "4.2s", or "time" for a timeout. */
export function answerTime(
  r: Pick<DuelRoundResult, 'responseMs' | 'timedOut'> | null | undefined,
): string {
  if (!r) return '–';
  if (r.timedOut) return 'time';
  return `${(r.responseMs / 1000).toFixed(1)}s`;
}

const verdictWord = (r: DuelRoundResult | null | undefined) =>
  !r ? 'no answer' : r.isCorrect ? 'correct' : r.timedOut ? 'out of time' : 'wrong';

/**
 * REVEAL: both stamps side by side (you on the warm side, the rival on the night side), each with
 * its server-measured time, and one line of why. The options above already show the right answer.
 * It stays for the server's reveal time; the next question arrives by itself.
 */
export function RevealPanel({ duel, round }: Props) {
  const mine = round.results.find((r) => r.userId === duel.me.id);
  const theirs = duel.rival ? round.results.find((r) => r.userId === duel.rival!.id) : undefined;
  const rivalName = duel.rival ? `@${duel.rival.username}` : 'Rival';
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`You: ${verdictWord(mine)}. ${rivalName}: ${verdictWord(theirs)}. ${firstSentence(round.explanation)}`}
    >
      <View style={styles.sides}>
        <Side label="You" result={mine} warm />
        <Side label={rivalName} result={theirs} avatar={duel.rival?.avatarId} />
      </View>
      <AppText color="onShoji" numberOfLines={3} style={styles.why}>
        {firstSentence(round.explanation)}
      </AppText>
    </View>
  );
}

function Side({
  label,
  result,
  warm = false,
  avatar,
}: {
  label: string;
  result: DuelRoundResult | undefined;
  warm?: boolean;
  avatar?: DuelSnapshot['me']['avatarId'];
}) {
  const ok = !!result?.isCorrect;
  return (
    <View style={[styles.side, warm ? styles.warm : styles.night]}>
      {avatar ? <YokaiMask id={avatar} size={28} /> : null}
      <HankoStamp glyph={ok ? '正' : '誤'} size={40} tone={ok ? 'seal' : 'ink'} />
      <View style={styles.sideText}>
        <AppText variant="label" color={warm ? 'muted' : 'text'} numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="code" color="text">
          {answerTime(result)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  sides: { flexDirection: 'row', gap: spacing.sm },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  warm: { backgroundColor: colors.wallLight },
  night: { backgroundColor: colors.night },
  sideText: { flex: 1, gap: 2 },
  why: {
    backgroundColor: colors.shoji,
    borderRadius: radii.md,
    padding: spacing.md,
  },
});
