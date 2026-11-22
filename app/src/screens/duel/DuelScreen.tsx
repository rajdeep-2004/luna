import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  DUEL_FORMATS,
  DuelCode,
  type DuelFormat,
  type DuelListView,
  type DuelView,
} from '@luna/shared';
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
import type { AppStackParams } from '../../navigation/types';
import { useAuthStore } from '../../store/auth';
import { colors, layout, radii, spacing } from '../../theme';
import { DuelRow } from './DuelRow';
import { confirmReady, DUELS_KEY, useDuelActions } from './useDuelActions';

type Tab = keyof DuelListView;
const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: 'yourTurn', label: 'Your turn', empty: 'No duels waiting on you.' },
  { key: 'waiting', label: 'Waiting', empty: 'Nobody owes you a move.' },
  { key: 'finished', label: 'Finished', empty: 'Your finished duels appear here.' },
];
const CODE_LENGTH = 6;

/**
 * Duel (DESIGN.md, competition.md §2): the face-off is the hero, then choose a blade (Classic,
 * Blitz, Sudden Death), challenge a friend, or type a code into six cells; the three lists below.
 */
export function DuelScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const list = useQuery({ queryKey: DUELS_KEY, queryFn: duelsApi.list });
  const actions = useDuelActions();
  const [tab, setTab] = useState<Tab>('yourTurn');
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
    if (!duel) return;
    setCode('');
    confirmReady(duel.rival?.username ?? null, duel.format, () => void actions.play(duel.id));
  }

  function open(duel: DuelView) {
    if (duel.result || duel.myState === 'FINISHED')
      return navigation.navigate('DuelResult', { duelId: duel.id });
    if (duel.myState === 'PLAYING') return void actions.play(duel.id);
    confirmReady(duel.rival?.username ?? null, duel.format, () => void actions.play(duel.id));
  }

  const rows = list.data?.[tab] ?? [];
  const current = TABS.find((t) => t.key === tab)!;
  // The face-off shows your next rival when one is waiting on you, else the unknown friend.
  const next = list.data?.yourTurn.find((d) => d.rival)?.rival ?? null;

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
              const count = list.data?.[t.key].length ?? 0;
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
