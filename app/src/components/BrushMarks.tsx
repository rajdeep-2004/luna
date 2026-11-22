import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

type Props = { total: number; done: number; label?: string };

/**
 * One short brush stroke per step: amber when done, vermilion for the current one, faint after.
 * Replaces progress bars in a round and in onboarding (DESIGN.md: no progress bars).
 */
export function BrushMarks({ total, done, label }: Props) {
  return (
    <View
      style={styles.marks}
      accessible
      accessibilityLabel={label ?? `${Math.min(done, total)} of ${total} answered`}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.mark,
            i < done ? styles.markDone : i === done ? styles.markNow : styles.markTodo,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  marks: { flexDirection: 'row', gap: 6 },
  mark: { flex: 1, height: 6, borderRadius: 3, transform: [{ skewX: '-18deg' }] },
  markDone: { backgroundColor: colors.primary },
  markNow: { backgroundColor: colors.seal },
  markTodo: { backgroundColor: colors.wallLight },
});
