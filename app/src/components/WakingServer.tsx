import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';

/** Shown when the API is slow to answer: Render's free tier sleeps and takes ~30 s to wake. */
export function WakingServer() {
  return (
    <View style={styles.wrap} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.moon} />
      <AppText color="textSoft" style={styles.text}>
        Waking the server. The first request after a break can take up to 30 seconds.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  text: { flex: 1 },
});
