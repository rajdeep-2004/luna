import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { DuelView } from '@luna/shared';
import { Kanji } from '../../art/Kanji';
import { YokaiMask } from '../../art/YokaiMask';
import { AppText, PressableSink } from '../../components';
import { formatRemaining } from '../../lib/duration';
import { BLADES } from '../../lib/duelFormats';
import { colors, radii, spacing } from '../../theme';

type Props = { duel: DuelView; pending: boolean; disabled: boolean; onPress: () => void };

/** One line of the duel list: the rival's mask, the blade, the state in words, and the score. */
export function DuelRow({ duel, pending, disabled, onPress }: Props) {
  const title = duel.rival ? `vs @${duel.rival.username}` : `Code ${duel.code}`;
  const line = statusLine(duel);
  const blade = BLADES[duel.format];
  return (
    <PressableSink
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${blade.name}. ${line}`}
      style={styles.row}
    >
      {duel.rival ? (
        <YokaiMask id={duel.rival.avatarId} size={40} />
      ) : (
        <View style={styles.unknown}>
          <AppText variant="title" color="muted">
            ?
          </AppText>
        </View>
      )}
      <View style={styles.body}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText variant="label" color={duel.result ? 'muted' : 'primary'}>
          {line}
        </AppText>
      </View>
      <Kanji glyph={blade.kanji} size={22} color="muted" />
      {pending ? <ActivityIndicator color={colors.primary} /> : <Score duel={duel} />}
    </PressableSink>
  );
}

function statusLine(d: DuelView): string {
  if (d.result) {
    if (d.result.endReason === 'EXPIRED') return 'Expired';
    if (!d.result.winnerId) return 'Draw';
    const won = d.result.winnerId === d.me.id;
    const forfeit = d.result.endReason === 'FORFEIT' ? ' by default' : '';
    return won ? `You won${forfeit}` : `You lost${forfeit}`;
  }
  const left = `${formatRemaining(d.expiresAt)} left`;
  if (!d.rival)
    return d.myState === 'FINISHED'
      ? `Waiting for someone to join · ${left}`
      : `Your turn · ${left}`;
  if (d.myState === 'FINISHED') return `Waiting for @${d.rival.username} · ${left}`;
  if (d.myState === 'PLAYING') return `Resume · ${left}`;
  return `Your turn · ${left}`;
}

function Score({ duel }: { duel: DuelView }) {
  const r = duel.result;
  if (!r?.mine && !r?.rivals) return null;
  return (
    <AppText variant="title" style={styles.score}>
      {r.mine?.correct ?? '–'} – {r.rivals?.correct ?? '–'}
    </AppText>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.tatami,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 60,
  },
  body: { flex: 1, gap: 2 },
  title: { fontWeight: '600' },
  score: { fontSize: 18, lineHeight: 22, minWidth: 44, textAlign: 'right' },
  unknown: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
