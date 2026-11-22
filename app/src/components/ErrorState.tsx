import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

type Props = { message: string; onRetry?: () => void; retrying?: boolean };

/** Friendly error with an optional Retry. Never shows raw server text or stack traces. */
export function ErrorState({ message, onRetry, retrying = false }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <AppText variant="title" style={styles.center}>
        Something went wrong
      </AppText>
      <AppText color="textMuted" style={styles.center}>
        {message}
      </AppText>
      {onRetry ? (
        <Button label="Try again" variant="ghost" onPress={onRetry} pending={retrying} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  center: { textAlign: 'center' },
});
