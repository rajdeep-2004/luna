import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { DuelCode, type DuelListView, type DuelView } from '@luna/shared';
import { duelsApi, userMessage } from '../../api';
import { AppText, Button, Card, EmptyState, ErrorState, Screen, TextField } from '../../components';
import type { AppStackParams } from '../../navigation/types';
import { colors, layout, radii, spacing } from '../../theme';
import { DuelRow } from './DuelRow';
import { confirmReady, DUELS_KEY, useDuelActions } from './useDuelActions';

type Tab = keyof DuelListView;
const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: 'yourTurn', label: 'Your turn', empty: 'No duels waiting on you.' },
  { key: 'waiting', label: 'Waiting', empty: 'Nobody owes you a move.' },
  { key: 'finished', label: 'Finished', empty: 'Your finished duels appear here.' },
];

/** competition.md §2: start a duel, join one by code, and the three duel lists. */
export function DuelScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();
  const list = useQuery({ queryKey: DUELS_KEY, queryFn: duelsApi.list });
  const actions = useDuelActions();
  const [tab, setTab] = useState<Tab>('yourTurn');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const { refetch } = list;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  async function join() {
    const parsed = DuelCode.safeParse(code);
    if (!parsed.success) return setCodeError(parsed.error.issues[0]?.message ?? 'Invalid code');
    setCodeError(null);
    const duel = await actions.join(parsed.data);
    if (!duel) return;
    setCode('');
    confirmReady(duel.rival?.username ?? null, () => void actions.play(duel.id));
  }

  function open(duel: DuelView) {
    if (duel.result || duel.myState === 'FINISHED')
      return navigation.navigate('DuelResult', { duelId: duel.id });
    if (duel.myState === 'PLAYING') return void actions.play(duel.id);
    confirmReady(duel.rival?.username ?? null, () => void actions.play(duel.id));
  }

  const rows = list.data?.[tab] ?? [];
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="display">Duel</AppText>
        <AppText color="textMuted">
          Same five questions for both of you. 60 seconds each. Most correct wins.
        </AppText>

        <Button
          label="Start a duel"
          pending={actions.pending === 'create'}
          disabled={actions.pending !== null}
          onPress={() => void actions.create()}
        />

        <Card>
          <TextField
            label="Join with a code"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            placeholder="KX7P2M"
            error={codeError}
            returnKeyType="go"
            onSubmitEditing={() => void join()}
          />
          <Button
            label="Join duel"
            variant="ghost"
            pending={actions.pending === 'join'}
            disabled={actions.pending !== null || code.length === 0}
            onPress={() => void join()}
          />
        </Card>
        {actions.error ? (
          <AppText color="emberSoft" accessibilityRole="alert">
            {actions.error}
          </AppText>
        ) : null}

        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((t) => {
            const active = t.key === tab;
            const count = list.data?.[t.key].length ?? 0;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${t.label}, ${count}`}
                style={[styles.tab, active && styles.tabActive]}
              >
                <AppText variant="label" color={active ? 'onMoon' : 'textMuted'}>
                  {t.label}
                  {count ? ` ${count}` : ''}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {list.isPending ? <ActivityIndicator color={colors.moon} /> : null}
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.lg },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    minHeight: layout.touchTarget,
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.moon },
});
