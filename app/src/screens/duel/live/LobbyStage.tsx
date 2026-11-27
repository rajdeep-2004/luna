import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { DuelSnapshot } from '@luna/shared';
import { FaceOff } from '../../../art/FaceOff';
import { AppText, Button } from '../../../components';
import { config } from '../../../config/env';
import { bladeOf, rulesLine } from '../../../lib/duelFormats';
import { formatClock } from '../../../lib/duration';
import { msUntil } from '../../../lib/live/clock';
import { useNow } from '../../../lib/live/useNow';
import { colors, fontFamily, layout, radii, spacing } from '../../../theme';
import { shareDuelCode } from '../useDuelActions';

type Props = {
  duel: DuelSnapshot;
  offsetMs: number;
  onCancel: () => void;
  cancelling: boolean;
};

/**
 * LOBBY (creator, nobody joined yet): the face-off with a dashed "?" where the rival will stand,
 * the code big enough to read across a room, one amber Share action, and Cancel. The invite's
 * closing time is the server's `lobbyExpiresAt`, counted with the clock offset.
 */
export function LobbyStage({ duel, offsetMs, onCancel, cancelling }: Props) {
  const { width } = useWindowDimensions();
  const now = useNow(config.live.bannerTickMs);
  const left = msUntil(duel.lobbyExpiresAt, offsetMs, now);
  return (
    <View style={styles.wrap}>
      <FaceOff
        width={width}
        me={duel.me.avatarId}
        rival={null}
        meLabel={`You · ${bladeOf(duel.format).name}`}
        rivalLabel="Your rival"
      />
      <View style={styles.body}>
        <AppText variant="title" style={styles.center} accessibilityLiveRegion="polite">
          Waiting for your rival…
        </AppText>
        <View style={styles.slip}>
          <AppText variant="label" color="wood">
            Duel code
          </AppText>
          <AppText
            color="onShoji"
            style={styles.code}
            accessibilityLabel={`Duel code ${duel.code.split('').join(' ')}`}
            selectable
          >
            {duel.code}
          </AppText>
          <AppText variant="code" color="wood">
            {duel.lobbyExpiresAt ? `Closes in ${formatClock(left)}` : ' '}
          </AppText>
        </View>
        <AppText color="muted" style={styles.center}>
          {rulesLine(duel.format)}
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button label="Share the code" onPress={() => void shareDuelCode(duel.code, duel.format)} />
        <Button label="Cancel duel" variant="ghost" pending={cancelling} onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  body: { paddingHorizontal: layout.screenPadding, gap: spacing.md, marginTop: spacing.lg },
  center: { textAlign: 'center' },
  slip: {
    alignItems: 'center',
    backgroundColor: colors.shoji,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  code: {
    fontFamily: fontFamily.mono,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: 8,
  },
  actions: {
    marginTop: 'auto',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
  },
});
