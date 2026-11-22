import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** 3 pt progress line. `value` is clamped to 0..1. Width animation arrives with the game UI in P3. */
export function ProgressLine({ value }: { value: number }) {
  const pct = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 3, backgroundColor: colors.track, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: colors.moon },
});
