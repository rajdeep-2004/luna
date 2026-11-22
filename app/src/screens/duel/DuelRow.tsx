import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { DuelView } from '@luna/shared';
import { AppText, YokaiAvatar } from '../../components';
import { formatRemaining } from '../../lib/duration';
import { colors, layout, radii, spacing } from '../../theme';

type Props = { duel: DuelView; pending: boolean; disabled: boolean; onPress: () => void };

/** One line of the duel list: who, the state in words, and the score or the time left. */
export function DuelRow({ duel, pending, disabled, onPress }: Props) {
  const title = duel.rival ? `vs @${duel.rival.username}` : `Code ${duel.code}`;
  const line = statusLine(duel);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {duel.rival ? (
        <YokaiAvatar id={duel.rival.avatarId} size={40} />
      ) : (
        <View style={styles.unknown}>
          <AppText color="textMuted">?</AppText>
        </View>
      )}
      <View style={styles.body}>
        <AppText color="textSoft">{title}</AppText>
        <AppText variant="label" color={duel.result ? 'textMuted' : 'moon'}>
          {line}
        </AppText>
      </View>
      {pending ? <ActivityIndicator color={colors.moon} /> : <Score duel={duel} />}
    </Pressable>
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
    <AppText variant="code" color="textSoft">
      {r.mine?.correct ?? '–'} – {r.rivals?.correct ?? '–'}
    </AppText>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    minHeight: layout.touchTarget,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  body: { flex: 1, gap: spacing.xs },
  unknown: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
