import { StyleSheet, View } from 'react-native';
import { LIVE_DUEL, PLAYING_PHASES, type DuelPhase, type DuelSnapshot } from '@luna/shared';
import { AppText, Button, WakingServer } from '../../../components';
import { config } from '../../../config/env';
import type { LiveState } from '../../../lib/live/state';
import { useNow } from '../../../lib/live/useNow';
import { colors, layout, radii, spacing } from '../../../theme';

const isPlaying = (p: DuelPhase) => (PLAYING_PHASES as readonly DuelPhase[]).includes(p);

/** Seconds left of a grace that started at `since` (device clock), never below zero. */
const graceLeft = (since: number, now: number) =>
  Math.max(0, Math.ceil((since + LIVE_DUEL.reconnectGraceMs - now) / 1000));

type Props = Pick<
  LiveState,
  'conn' | 'everConnected' | 'connectingSince' | 'lostAt' | 'rivalLostAt'
> & {
  duel: DuelSnapshot | null;
};

/**
 * The connection strip at the top of the live duel (P14 task 6). One line at a time, most urgent
 * first: the server waking from a cold start, my own reconnect (with the seat's grace counting
 * down), or the rival's. The grace counts on this device's clock from when the drop was seen; it
 * is a hint for the player, and the server alone decides the forfeit.
 */
export function LiveBanners({
  duel,
  conn,
  everConnected,
  connectingSince,
  lostAt,
  rivalLostAt,
}: Props) {
  const rivalOffline = !!duel?.rival && duel.seats.rival?.connected === false;
  const playing = !!duel && isPlaying(duel.phase);
  const watching = conn !== 'online' || (rivalOffline && playing);
  const now = useNow(config.live.bannerTickMs, watching);

  if (!everConnected && conn !== 'online') {
    const slow = connectingSince !== null && now - connectingSince >= config.coldStartNoticeMs;
    return slow ? (
      <View style={styles.pad}>
        <WakingServer />
      </View>
    ) : null;
  }
  if (conn !== 'online') {
    const line =
      playing && lostAt !== null
        ? `Reconnecting… your seat is held for ${graceLeft(lostAt, now)} s`
        : 'Reconnecting to the dojo…';
    return <Strip line={line} tone="seal" />;
  }
  if (rivalOffline && playing && rivalLostAt !== null) {
    const name = `@${duel!.rival!.username}`;
    const left = graceLeft(rivalLostAt, now);
    return (
      <Strip
        line={
          left > 0
            ? `${name} lost connection. They have ${left} s to come back.`
            : `${name} did not come back…`
        }
        tone="night"
      />
    );
  }
  return null;
}

function Strip({ line, tone }: { line: string; tone: 'seal' | 'night' }) {
  return (
    <View
      style={[styles.strip, tone === 'seal' ? styles.seal : styles.night]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <AppText variant="label" color="text" style={styles.text}>
        {line}
      </AppText>
    </View>
  );
}

/**
 * This seat was taken by another of my devices (`duel:superseded`). The match goes on there; here
 * the player can take it back or step away without leaving the duel.
 */
export function SupersededPanel({
  onTakeSeat,
  onClose,
}: {
  onTakeSeat: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.cover} accessibilityViewIsModal>
      <View style={styles.sheet}>
        <AppText variant="title" color="onShoji" style={styles.center}>
          Open on another device
        </AppText>
        <AppText color="onShoji" style={styles.center}>
          This duel moved to your other phone. Play it there, or bring it back here.
        </AppText>
        <Button label="Play on this phone" onPress={onTakeSeat} />
        <Button label="Close" variant="ghost" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm },
  strip: {
    marginHorizontal: layout.screenPadding,
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  // Vermilion is for marks, never behind text (DESIGN.md): a seal edge on tatami instead.
  seal: { backgroundColor: colors.tatami, borderLeftWidth: 4, borderLeftColor: colors.seal },
  night: { backgroundColor: colors.night },
  text: { textAlign: 'center' },
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.ground,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  sheet: {
    backgroundColor: colors.shoji,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  center: { textAlign: 'center' },
});
