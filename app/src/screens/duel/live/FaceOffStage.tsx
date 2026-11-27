import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { DuelSnapshot } from '@luna/shared';
import { FaceOff } from '../../../art/FaceOff';
import { AppText, Button } from '../../../components';
import { config } from '../../../config/env';
import { bladeOf, rulesLine } from '../../../lib/duelFormats';
import { haptic } from '../../../lib/haptics';
import { msUntil } from '../../../lib/live/clock';
import { useNow } from '../../../lib/live/useNow';
import { useReduceMotion } from '../../../lib/motion';
import { layout, spacing } from '../../../theme';

type Props = {
  duel: DuelSnapshot;
  offsetMs: number;
  onLeave: () => void;
  leaving: boolean;
};

/**
 * READY and COUNTDOWN: both masks clash on the face-off, then a big 3 · 2 · 1 cut in Dela Gothic,
 * counted from the server's `phaseEndsAt`. The first question arrives from the server; the number
 * reaching zero does nothing by itself.
 */
export function FaceOffStage({ duel, offsetMs, onLeave, leaving }: Props) {
  const { width } = useWindowDimensions();
  const counting = duel.phase === 'COUNTDOWN';
  const now = useNow(config.live.timerTickMs, counting);
  const left = counting ? Math.ceil(msUntil(duel.phaseEndsAt, offsetMs, now) / 1000) : null;
  const rival = duel.rival;
  const rivalIn = !!duel.seats.rival?.connected;
  const waitingLine = !rival
    ? 'Your rival left. Waiting for them to come back…'
    : rivalIn
      ? 'Bowing in…'
      : `Waiting for @${rival.username} to connect…`;

  return (
    <View style={styles.wrap}>
      <FaceOff
        width={width}
        me={duel.me.avatarId}
        rival={rival?.avatarId ?? null}
        meLabel={`You · ${bladeOf(duel.format).name}`}
        rivalLabel={rival ? `@${rival.username}` : 'Your rival'}
      />
      <View style={styles.body}>
        {counting ? (
          <CountNumber n={Math.max(1, left ?? 1)} />
        ) : (
          <AppText variant="title" style={styles.center} accessibilityLiveRegion="polite">
            {waitingLine}
          </AppText>
        )}
        <AppText color="muted" style={styles.center}>
          {rulesLine(duel.format)}
        </AppText>
      </View>
      {!counting ? (
        <View style={styles.actions}>
          <Button label="Leave" variant="ghost" pending={leaving} onPress={onLeave} />
        </View>
      ) : null}
    </View>
  );
}

/** One countdown numeral: drops in from 1.5x with a light haptic; Reduce Motion just swaps it. */
function CountNumber({ n }: { n: number }) {
  const reduce = useReduceMotion();
  const pop = useSharedValue(1);
  useEffect(() => {
    haptic.light();
    if (reduce) return;
    pop.value = 0;
    pop.value = withSpring(1, { damping: 14, stiffness: 260 });
  }, [n, reduce, pop]);
  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 1.5 - 0.5 * pop.value }],
  }));
  return (
    <Animated.View style={[styles.count, style]} accessibilityLiveRegion="assertive">
      <AppText variant="number" color="primary" style={styles.countText} accessibilityLabel={`${n}`}>
        {n}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  body: { paddingHorizontal: layout.screenPadding, gap: spacing.md, marginTop: spacing.lg },
  center: { textAlign: 'center' },
  count: { alignItems: 'center' },
  countText: { fontSize: 96, lineHeight: 110 },
  actions: { marginTop: 'auto', paddingHorizontal: layout.screenPadding, paddingBottom: spacing.lg },
});
