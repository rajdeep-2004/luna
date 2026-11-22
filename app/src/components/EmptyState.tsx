import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import { AppText } from './AppText';
import { MoonPhase } from './MoonPhase';

type Props = { title: string; message?: string };

/** Nothing here yet. A new moon keeps the tone calm instead of showing an error. */
export function EmptyState({ title, message }: Props) {
  return (
    <View style={styles.wrap}>
      <MoonPhase phase="new" size={56} />
      <AppText variant="title" style={styles.center}>
        {title}
      </AppText>
      {message ? (
        <AppText color="textMuted" style={styles.center}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  center: { textAlign: 'center' },
});
