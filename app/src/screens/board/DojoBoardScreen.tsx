import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import type { BoardRow, BoardView } from '@luna/shared';
import { leaderboardApi, userMessage } from '../../api';
import { YokaiMask } from '../../art/YokaiMask';
import { AppText, Button, EmptyState, ErrorState, PressableSink, Screen } from '../../components';
import { formatRemaining } from '../../lib/duration';
import type { AppStackParams } from '../../navigation/types';
import { colors, layout, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<AppStackParams, 'DojoBoard'>;

export const BOARD_KEY = ['board'] as const;
/** Last week's top three wear a medal: a small disc in amber, shoji or wood (no emoji, DESIGN.md). */
const MEDAL = { 1: colors.primary, 2: colors.shoji, 3: colors.wood } as const;

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
        <PressableSink
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <AppText color="muted">‹ Back</AppText>
        </PressableSink>
        <AppText variant="display">Dojo Board</AppText>
        {head ? (
          <AppText variant="label" color="muted">
            This week · resets in {formatRemaining(head.resetsAt)}
          </AppText>
        ) : null}
      </View>

      {query.isPending ? <ActivityIndicator color={colors.primary} /> : null}
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
        <AppText color="muted" style={styles.note}>
          You&apos;re not on the board yet this week. One kata puts you there.
        </AppText>
      ) : null}
    </Screen>
  );
}

function Row({ row, isMe }: { row: BoardRow; isMe: boolean }) {
  const top = row.rank <= 3;
  return (
    <View
      style={[styles.row, isMe && styles.me]}
      accessible
      accessibilityLabel={`Rank ${row.rank}, ${row.player.username}${isMe ? ' (you)' : ''}, ${row.player.rankName}, ${row.weeklyXP} XP this week${row.lastWeekPlace ? `, number ${row.lastWeekPlace} last week` : ''}`}
    >
      <AppText
        variant="title"
        color={isMe ? 'onShoji' : top ? 'primary' : 'muted'}
        style={styles.rank}
      >
        {row.rank}
      </AppText>
      <YokaiMask id={row.player.avatarId} size={36} />
      <View style={styles.who}>
        <View style={styles.nameRow}>
          <AppText color={isMe ? 'onShoji' : 'text'} style={styles.name} numberOfLines={1}>
            {row.player.username}
            {isMe ? ' (you)' : ''}
          </AppText>
          {row.lastWeekPlace ? (
            <View style={[styles.medal, { backgroundColor: MEDAL[row.lastWeekPlace] }]}>
              <AppText
                variant="label"
                color={row.lastWeekPlace === 3 ? 'text' : 'onShoji'}
                style={styles.medalText}
              >
                {row.lastWeekPlace}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="label" color={isMe ? 'wood' : 'muted'}>
          {row.player.rankName}
        </AppText>
      </View>
      <AppText variant="code" color={isMe ? 'onShoji' : 'text'}>
        {row.weeklyXP} XP
      </AppText>
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.tatami,
    borderRadius: radii.md,
    minHeight: 56,
  },
  me: { backgroundColor: colors.shoji },
  rank: { width: 32, fontSize: 18, lineHeight: 22, textAlign: 'center' },
  who: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { fontWeight: '600', flexShrink: 1 },
  medal: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: { fontSize: 10, lineHeight: 12 },
  pinned: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.wood },
  note: { textAlign: 'center', paddingBottom: spacing.lg },
});
