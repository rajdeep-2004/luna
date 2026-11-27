import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { DUEL_FORMATS, DuelCode, type DuelFormat, type DuelView, type Page } from '@luna/shared';
import { duelsApi, userMessage } from '../../api';
import { FaceOff } from '../../art/FaceOff';
import { Kanji } from '../../art/Kanji';
import {
  AppText,
  Button,
  CodeCells,
  EmptyState,
  ErrorState,
  PressableSink,
  Screen,
} from '../../components';
import { BLADES } from '../../lib/duelFormats';
import { useAuthStore } from '../../store/auth';
import { colors, layout, radii, spacing } from '../../theme';
import { DuelRow } from './DuelRow';
import { DUELS_KEY, isEndedDuel, useDuelActions } from './useDuelActions';

type Tab = 'open' | 'finished';
const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: 'open', label: 'Live', empty: 'No live duels. Challenge a friend.' },
  { key: 'finished', label: 'Finished', empty: 'Your finished duels appear here.' },
];
const isEnded = isEndedDuel;
const tabOf = (d: DuelView): Tab => (isEnded(d) ? 'finished' : 'open');
const CODE_LENGTH = 6;

/**
 * Duel (DESIGN.md, competition.md §2): the face-off is the hero, then choose a blade (Classic,
 * Blitz, Sudden Death), challenge a friend, or type a code into six cells; the three lists below.
 */
export function DuelScreen() {
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  // History is paged by the server (newest first); "Older duels" fetches the next page.
  const list = useInfiniteQuery({
    queryKey: DUELS_KEY,
    queryFn: ({ pageParam }) => duelsApi.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<DuelView>) => last.nextCursor ?? undefined,
  });
  const actions = useDuelActions();
  const [tab, setTab] = useState<Tab>('open');
  const [format, setFormat] = useState<DuelFormat>('CLASSIC');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [clash, setClash] = useState(0);
  const { refetch } = list;
  useFocusEffect(
    useCallback(() => {
      void refetch();
      setClash((k) => k + 1);
    }, [refetch]),
  );

  async function join() {
    const parsed = DuelCode.safeParse(code);
    if (!parsed.success) return setCodeError(parsed.error.issues[0]?.message ?? 'Invalid code');
    setCodeError(null);
    const duel = await actions.join(parsed.data);
    if (duel) setCode('');
  }

  const open = (duel: DuelView) => actions.openDuel(duel);

  const all = list.data?.pages.flatMap((p) => p.items) ?? [];
  const rows = all.filter((d) => tabOf(d) === tab);
  const current = TABS.find((t) => t.key === tab)!;
  // The face-off shows the rival in your newest open duel, else the unknown friend.
  const next = all.find((d) => !isEnded(d) && d.rival)?.rival ?? null;

  return (
    <Screen padded={false}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {user ? (
          <FaceOff
            width={width}
            me={user.avatarId}
            rival={next?.avatarId ?? null}
            meLabel="You"
            rivalLabel={next ? `@${next.username}` : 'A friend'}
            playKey={clash}
          />
        ) : null}

        <View style={styles.body}>
          <View style={styles.formats} accessibilityRole="radiogroup">
            {DUEL_FORMATS.map((f) => {
              const on = f === format;
              const b = BLADES[f];
              return (
                <PressableSink
                  key={f}
                  onPress={() => setFormat(f)}
                  style={[styles.fmt, on && styles.fmtOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${b.name}: ${b.rule}`}
                >
                  <Kanji glyph={b.kanji} size={30} color={on ? 'seal' : 'muted'} />
                  <AppText variant="title" color={on ? 'onShoji' : 'text'} style={styles.fmtName}>
                    {b.name}
                  </AppText>
                  <AppText variant="code" color={on ? 'wood' : 'muted'}>
                    {b.rule}
                  </AppText>
                </PressableSink>
              );
            })}
          </View>

          <Button
            label="Challenge a friend"
            pending={actions.pending === 'create'}
            disabled={actions.pending !== null}
            onPress={() => void actions.create(format)}
          />

          <View style={styles.code}>
            <AppText color="muted" style={styles.codeLabel}>
              Have a code?
            </AppText>
            <View style={styles.codeCells}>
              <CodeCells
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setCodeError(null);
                }}
                length={CODE_LENGTH}
                onSubmit={() => void join()}
                label="Duel code, six characters"
                error={codeError}
              />
            </View>
            {actions.pending === 'join' ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
          {actions.error ? (
            <AppText color="primary" accessibilityRole="alert">
              {actions.error}
            </AppText>
          ) : null}

          <View style={styles.tabs} accessibilityRole="tablist">
            {TABS.map((t) => {
              const active = t.key === tab;
              const count = all.filter((d) => tabOf(d) === t.key).length;
              return (
                <PressableSink
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${t.label}, ${count}`}
                  style={styles.tab}
                >
                  <AppText color={active ? 'text' : 'muted'} style={styles.tabText}>
                    {t.label}
                  </AppText>
                  {count ? (
                    <AppText variant="title" color="primary" style={styles.tabCount}>
                      {count}
                    </AppText>
                  ) : null}
                </PressableSink>
              );
            })}
          </View>

          {list.isPending ? <ActivityIndicator color={colors.primary} /> : null}
          {list.isError ? (
            <ErrorState
              message={userMessage(list.error)}
              onRetry={() => void list.refetch()}
              retrying={list.isFetching}
            />
          ) : null}
          {list.data && rows.length === 0 ? <EmptyState title={current.empty} /> : null}
          {rows.map((d) => (
            <DuelRow
              key={d.id}
              duel={d}
              pending={actions.pending === d.id}
              disabled={actions.pending !== null}
              onPress={() => open(d)}
            />
          ))}
          {tab === 'finished' && list.hasNextPage ? (
            <Button
              label="Older duels"
              variant="ghost"
              pending={list.isFetchingNextPage}
              onPress={() => void list.fetchNextPage()}
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  formats: { gap: 10 },
  fmt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 60,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.tatami,
  },
  fmtOn: { backgroundColor: colors.shoji },
  fmtName: { flex: 1, fontSize: 17, lineHeight: 22 },
  code: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  codeLabel: { paddingTop: 12, fontWeight: '600' },
  codeCells: { flex: 1 },
  tabs: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'baseline', gap: 4, minHeight: layout.touchTarget },
  tabText: { fontWeight: '600' },
  tabCount: { fontSize: 16, lineHeight: 20 },
});
