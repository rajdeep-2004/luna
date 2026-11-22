import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import { AppText } from './AppText';
import { Enso } from '../art/Enso';

type Props = { title: string; message?: string };

/** Nothing here yet. An open ensō keeps the tone calm instead of showing an error. */
export function EmptyState({ title, message }: Props) {
  return (
    <View style={styles.wrap}>
      <Enso progress={0.2} size={56} color="muted" />
      <AppText variant="title" style={styles.center}>
        {title}
      </AppText>
      {message ? (
        <AppText color="muted" style={styles.center}>
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
