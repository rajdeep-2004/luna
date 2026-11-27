import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from '../../../components';
import { config } from '../../../config/env';
import { timerLabel } from '../../../lib/live/clock';
import { colors } from '../../../theme';

type Props = {
  /** Time left on the server's deadline, already corrected by the clock offset (`msUntil`). */
  leftMs: number;
  /** The format's per-question timer. */
  totalMs: number;
  /** Frozen once the question is revealed. */
  stopped: boolean;
  size?: number;
};

const STROKE = 5;

/**
 * The synced question timer: an ink ring that empties as the server's deadline nears, the seconds
 * inside. The caller derives `leftMs` from `deadlineAt − offset`, so both phones show the same second. It never acts
 * on reaching zero; the server reveals the question and the app redraws from that push.
 * The screen-reader label only changes at a few marks (D-053), so it isn't read out every second.
 */
export function TimerRing({ leftMs, totalMs, stopped, size = 56 }: Props) {
  const seconds = Math.ceil(leftMs / 1000);
  const urgent = !stopped && seconds <= config.live.urgentSec;
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const frac = !stopped && totalMs > 0 ? Math.min(1, leftMs / totalMs) : 0;
  const ink = urgent ? colors.seal : colors.primary;
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={
        stopped ? 'Question closed' : timerLabel(leftMs, config.live.timerAnnounceAtSec)
      }
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.tatami}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={ink}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - frac)}
          // Start at 12 o'clock and empty clockwise.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <AppText variant="title" color={urgent ? 'primary' : 'text'} style={styles.secs}>
          {stopped ? '·' : seconds}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  secs: { fontSize: 20, lineHeight: 24 },
});
