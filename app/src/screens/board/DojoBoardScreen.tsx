import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { BoardRow, BoardView } from '@luna/shared';
import { leaderboardApi, userMessage } from '../../api';
import { AppText, Button, EmptyState, ErrorState, Screen, YokaiAvatar } from '../../components';
import { formatRemaining } from '../../lib/duration';
import type { AppStackParams } from '../../navigation/types';
import { colors, layout, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<AppStackParams, 'DojoBoard'>;

export const BOARD_KEY = ['board'] as const;
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' } as const;

/** competition.md §1: this week's XP ranking, top 50, with my own row pinned when out of view. */
export function DojoBoardScreen({ navigation }: Props) {
  const query = useInfiniteQuery({
    queryKey: BOARD_KEY,
    queryFn: ({ pageParam }) => leaderboardApi.weekly(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: BoardView) => last.nextCursor ?? undefined,
  });
  const pages = query.data?.pages ?? [];
  const rows = pages.flatMap((p) => p.rows);
  const head = pages[0];
  const me = head?.me ?? null;
  const meInView = !!me && rows.some((r) => r.player.id === me.player.id);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <AppText color="textMuted">‹ Back</AppText>
        </Pressable>
        <AppText variant="display">Dojo Board</AppText>
        {head ? (
          <AppText variant="label" color="textMuted">
            This week · resets in {formatRemaining(head.resetsAt)}
          </AppText>
        ) : null}
      </View>

      {query.isPending ? <ActivityIndicator color={colors.moon} /> : null}
      {query.isError ? (
        <ErrorState
          message={userMessage(query.error)}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : null}
      {query.data && rows.length === 0 ? (
        <EmptyState
          title="The dojo is quiet"
          message="Be the first on the board this week. Every correct answer counts."
        />
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.player.id}
        renderItem={({ item }) => <Row row={item} isMe={item.player.id === me?.player.id} />}
        contentContainerStyle={styles.list}
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        ListFooterComponent={
          query.hasNextPage ? (
            <Button
              label="Show more"
              variant="ghost"
              pending={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          ) : undefined
        }
      />
      {me && !meInView ? (
        <View style={styles.pinned}>
          <Row row={me} isMe />
        </View>
      ) : null}
      {head && !me && rows.length > 0 ? (
        <AppText color="textMuted" style={styles.note}>
          You&apos;re not on the board yet this week. One kata puts you there.
        </AppText>
      ) : null}
    </Screen>
  );
}

function Row({ row, isMe }: { row: BoardRow; isMe: boolean }) {
  const medal = row.lastWeekPlace ? MEDAL[row.lastWeekPlace] : '';
  return (
    <View
      style={[styles.row, isMe && styles.me]}
      accessible
      accessibilityLabel={`Rank ${row.rank}, ${row.player.username}${isMe ? ' (you)' : ''}, ${row.player.rankName}, ${row.weeklyXP} XP this week${row.lastWeekPlace ? `, number ${row.lastWeekPlace} last week` : ''}`}
    >
      <AppText variant="code" color={row.rank <= 3 ? 'moon' : 'textMuted'} style={styles.rank}>
        {row.rank}
      </AppText>
      <YokaiAvatar id={row.player.avatarId} size={36} />
      <View style={styles.who}>
        <AppText color={isMe ? 'moon' : 'textSoft'} numberOfLines={1}>
          {row.player.username}
          {medal ? ` ${medal}` : ''}
        </AppText>
        <AppText variant="label" color="textMuted">
          {row.player.rankName}
        </AppText>
      </View>
      <AppText variant="code">{row.weeklyXP} XP</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingVertical: spacing.lg },
  back: { minHeight: layout.touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  list: { gap: spacing.sm, paddingBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
  },
  me: { backgroundColor: colors.surfaceRaised },
  rank: { width: 28 },
  who: { flex: 1, gap: 2 },
  pinned: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.track },
  note: { textAlign: 'center', paddingBottom: spacing.lg },
});
