import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { colors } from '../../theme';

type Props = {
  /** Time left when this question appeared, from the server's clock. */
  remainingMs: number;
  /** Total time per question for this duel format. */
  totalMs: number;
  /** Stops the clock once an answer is in flight or shown. */
  paused: boolean;
  onExpire: () => void;
};

const STICK = 72;

/**
 * The duel countdown as a burning incense stick (P7): the stick shortens towards its glowing tip and
 * the seconds stay readable beside it. It counts against a fixed deadline, not by ticks, so a slow JS
 * thread can't stretch it; the server is still the judge, and a late answer is a timeout.
 */
export function DuelCountdown({ remainingMs, totalMs, paused, onExpire }: Props) {
  const deadline = useRef(Date.now() + Math.max(0, remainingMs));
  const fired = useRef(false);
  const [leftMs, setLeftMs] = useState(Math.max(0, remainingMs));
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const ms = deadline.current - Date.now();
      setLeftMs(Math.max(0, ms));
      if (ms <= 0 && !fired.current) {
        fired.current = true;
        expire.current();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [paused]);

  const seconds = Math.ceil(leftMs / 1000);
  const urgent = seconds <= Math.min(10, totalMs / 3000);
  const frac = totalMs > 0 ? leftMs / totalMs : 0;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${seconds} seconds left`}
      accessibilityLiveRegion={urgent ? 'polite' : 'none'}
    >
      <View style={styles.track}>
        <View style={[styles.stick, { width: STICK * frac }]} />
        <View style={[styles.tip, urgent && styles.tipUrgent]} />
      </View>
      <AppText variant="title" color={urgent ? 'seal' : 'primary'} style={styles.secs}>
        {seconds}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { width: STICK + 8, height: 8, flexDirection: 'row', alignItems: 'center' },
  stick: { height: 4, backgroundColor: colors.muted, borderRadius: 2 },
  tip: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  tipUrgent: { backgroundColor: colors.seal },
  secs: { minWidth: 28, textAlign: 'right' },
});
