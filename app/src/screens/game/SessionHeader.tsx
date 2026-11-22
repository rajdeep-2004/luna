import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText, ProgressLine } from '../../components';
import { layout, spacing } from '../../theme';

type Props = {
  progress: number;
  position: number;
  total: number;
  onLeave: () => void;
  clock: ReactNode;
};

/** Top of every game screen: leave button, "n / total", elapsed clock, and the 3 pt progress line. */
export function SessionHeader({ progress, position, total, onLeave, clock }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={() =>
            Alert.alert(
              'Leave this session?',
              'Your answers are saved. You can pick it up again later.',
              [
                { text: 'Keep playing', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: onLeave },
              ],
            )
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
      <ProgressLine value={progress} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, paddingTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leave: { width: layout.touchTarget, height: layout.touchTarget, justifyContent: 'center' },
});
