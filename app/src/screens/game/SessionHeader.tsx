import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { colors, layout, spacing } from '../../theme';

type Props = {
  progress: number;
  position: number;
  total: number;
  onLeave: () => void;
  clock: ReactNode;
  /** Body of the "Leave?" alert; duels warn that the clock keeps running. */
  leaveMessage?: string;
};

/** Top of every game screen: leave, "n / total", the clock, and one brush mark per answer (DESIGN.md: no progress bars). */
const DEFAULT_LEAVE = 'Your answers are saved. You can pick it up again later.';

export function SessionHeader({
  progress,
  position,
  total,
  onLeave,
  clock,
  leaveMessage = DEFAULT_LEAVE,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={() =>
            Alert.alert('Leave this session?', leaveMessage, [
              { text: 'Keep playing', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: onLeave },
            ])
          }
          accessibilityRole="button"
          accessibilityLabel="Leave session"
          style={styles.leave}
        >
          <AppText color="textMuted">✕</AppText>
        </Pressable>
        <AppText variant="label" color="textMuted">
          {Math.min(position, total)} / {total}
        </AppText>
        {clock}
      </View>
      <BrushMarks total={total} done={Math.round(progress * total)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, paddingTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leave: { width: layout.touchTarget, height: layout.touchTarget, justifyContent: 'center' },
  marks: { flexDirection: 'row', gap: 6 },
  mark: { flex: 1, height: 6, borderRadius: 3, transform: [{ skewX: '-18deg' }] },
  markDone: { backgroundColor: colors.primary },
  markNow: { backgroundColor: colors.seal },
  markTodo: { backgroundColor: colors.wallLight },
});

/** One short brush stroke per answer: amber when done, vermilion for the current one, faint after. */
function BrushMarks({ total, done }: { total: number; done: number }) {
  return (
    <View
      style={styles.marks}
      accessible
      accessibilityLabel={`${Math.min(done, total)} of ${total} answered`}
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
