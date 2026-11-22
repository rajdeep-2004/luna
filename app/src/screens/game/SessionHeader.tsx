import type { ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, BrushMarks, PressableSink } from '../../components';
import { layout, spacing } from '../../theme';

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
        <PressableSink
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
          <AppText color="muted">✕</AppText>
        </PressableSink>
        <AppText variant="label" color="muted">
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
});
