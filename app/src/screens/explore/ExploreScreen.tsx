import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { topicsApi, userMessage } from '../../api';
import { AppText, Card, EmptyState, ErrorState, MoonPhase, Screen } from '../../components';
import { colors, layout, radii, spacing } from '../../theme';
import { useStartSession } from './useStartSession';

export function ExploreScreen() {
  const topics = useQuery({ queryKey: ['topics'], queryFn: topicsApi.list });
  const { start, pendingKey, error } = useStartSession();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">Explore</AppText>
        <AppText color="textMuted">Pick a topic for five quick challenges.</AppText>

        {topics.isPending ? <ActivityIndicator color={colors.moon} /> : null}
        {topics.isError ? (
          <ErrorState
            message={userMessage(topics.error)}
            onRetry={() => void topics.refetch()}
            retrying={topics.isFetching}
          />
        ) : null}
        {topics.data?.length === 0 ? <EmptyState title="No topics yet" /> : null}

        {topics.data?.map((t) => (
          <Row
            key={t.slug}
            title={t.name}
            subtitle={t.description}
            busy={pendingKey === t.slug}
            disabled={pendingKey !== null}
            onPress={() => void start(t.slug, { type: 'PRACTICE', topicSlug: t.slug })}
          />
        ))}

        {topics.data ? (
          <Row
            title="Incident Room"
            subtitle="Investigate a live production problem in three stages."
            busy={pendingKey === 'incident'}
            disabled={pendingKey !== null}
            onPress={() => void start('incident', { type: 'INCIDENT' })}
          />
        ) : null}

        {error ? (
          <AppText color="emberSoft" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

type RowProps = {
  title: string;
  subtitle: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
};

function Row({ title, subtitle, busy, disabled, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{ disabled, busy }}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
        disabled && !busy && styles.dim,
      ]}
    >
      <Card style={styles.card}>
        {busy ? <ActivityIndicator color={colors.moon} /> : <MoonPhase phase="new" size={44} />}
        <View style={styles.text}>
          <AppText variant="button">{title}</AppText>
          <AppText color="textMuted">{subtitle}</AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingVertical: spacing.xl },
  row: { borderRadius: radii.cardLg, minHeight: layout.touchTarget },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  text: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.85 },
  dim: { opacity: 0.5 },
});
