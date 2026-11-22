import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { DuelPlayerResult, DuelView, PlayerView } from '@luna/shared';
import { duelsApi, userMessage } from '../../api';
import { AppText, Button, Card, ErrorState, Screen, YokaiAvatar } from '../../components';
import { formatClock, formatRemaining } from '../../lib/duration';
import { haptic } from '../../lib/haptics';
import type { AppStackParams } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { confirmReady, shareDuelCode, useDuelActions } from './useDuelActions';

type Props = NativeStackScreenProps<AppStackParams, 'DuelResult'>;

/** competition.md §2 "Result screen", or "Waiting for @friend…" until both have played. */
export function DuelResultScreen({ route, navigation }: Props) {
  const { duelId } = route.params;
  const query = useQuery({ queryKey: ['duel', duelId], queryFn: () => duelsApi.get(duelId) });
  const actions = useDuelActions();
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const home = () => navigation.popToTop();

  async function rematch() {
    const duel = await actions.create();
    if (duel) navigation.replace('DuelResult', { duelId: duel.id });
  }

  const d = query.data;
  if (query.isPending)
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.moon} />
        </View>
      </Screen>
    );
  if (query.isError || !d)
    return (
      <Screen>
        <View style={styles.center}>
          <ErrorState
            message={userMessage(query.error)}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
          <Button label="Back home" variant="ghost" onPress={home} />
        </View>
      </Screen>
    );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {d.result ? <Result duel={d} /> : <Waiting duel={d} />}
        {!d.result ? (
          <Button
            label="Check again"
            variant="ghost"
            pending={query.isFetching}
            onPress={() => void query.refetch()}
          />
        ) : null}
      </ScrollView>
      <View style={styles.actions}>
        {actions.error ? (
          <AppText color="emberSoft" accessibilityRole="alert">
            {actions.error}
          </AppText>
        ) : null}
        {!d.result && d.myState !== 'FINISHED' ? (
          <Button
            label={d.myState === 'PLAYING' ? 'Resume your turn' : 'Play your turn'}
            pending={actions.pending === d.id}
            disabled={actions.pending !== null}
            onPress={() =>
              d.myState === 'PLAYING'
                ? void actions.play(d.id)
                : confirmReady(d.rival?.username ?? null, () => void actions.play(d.id))
            }
          />
        ) : null}
        {d.result ? (
          <Button
            label="Rematch"
            pending={actions.pending === 'create'}
            disabled={actions.pending !== null}
            onPress={() => void rematch()}
          />
        ) : null}
        <Button
          label="Back home"
          variant={d.result || d.myState !== 'FINISHED' ? 'ghost' : 'primary'}
          onPress={home}
        />
      </View>
    </Screen>
  );
}

function Waiting({ duel }: { duel: DuelView }) {
  return (
    <View style={styles.waiting}>
      <YokaiAvatar id={duel.me.avatarId} size={72} />
      <AppText variant="title" style={styles.centerText}>
        {duel.myState !== 'FINISHED'
          ? 'Your turn'
          : duel.rival
            ? `Waiting for @${duel.rival.username}…`
            : 'Waiting for someone to join…'}
      </AppText>
      <AppText color="textMuted" style={styles.centerText}>
        {duel.myState !== 'FINISHED'
          ? '5 questions, 60 seconds each, no hints.'
          : 'Your answers are in. The result appears when they finish.'}{' '}
        The duel expires in {formatRemaining(duel.expiresAt)}.
      </AppText>
      {!duel.rival ? (
        <Card style={styles.codeCard}>
          <AppText variant="label" color="textMuted">
            Duel code
          </AppText>
          <AppText variant="display" accessibilityLabel={duel.code.split('').join(' ')}>
            {duel.code}
          </AppText>
          <Button
            label="Share code"
            variant="ghost"
            onPress={() => void shareDuelCode(duel.code)}
          />
        </Card>
      ) : null}
    </View>
  );
}

function bannerText(d: DuelView): string {
  const r = d.result!;
  if (r.endReason === 'EXPIRED') return 'This duel expired';
  if (!r.winnerId) return 'A draw. Evenly matched.';
  const winner = r.winnerId === d.me.id ? d.me : d.rival;
  const suffix = r.endReason === 'FORFEIT' ? ' by default' : '';
  return `@${winner?.username ?? 'rival'} wins the duel${suffix} ⚔️`;
}

/** Avatars slide in from both sides (600 ms), then the score flashes in (ui-design.md §6). */
function Result({ duel }: { duel: DuelView }) {
  const r = duel.result!;
  const reduce = useReducedMotion();
  const slide = useSharedValue(reduce ? 0 : 1);
  const flash = useSharedValue(reduce ? 1 : 0);
  const iWon = r.winnerId === duel.me.id;
  useEffect(() => {
    if (!reduce) {
      slide.value = withTiming(0, { duration: 600 });
      flash.value = withDelay(600, withTiming(1, { duration: 400 }));
    }
    const t = setTimeout(() => (iWon ? haptic.heavy() : haptic.light()), reduce ? 0 : 600);
    return () => clearTimeout(t);
  }, [reduce, slide, flash, iWon]);
  const left = useAnimatedStyle(() => ({ transform: [{ translateX: -120 * slide.value }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ translateX: 120 * slide.value }] }));
  const score = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <View style={styles.result}>
      <View style={styles.clash}>
        <Animated.View style={left}>
          <Side player={duel.me} label="You" won={iWon} />
        </Animated.View>
        <Animated.View style={score}>
          <AppText
            variant="display"
            accessibilityLabel={`Score ${r.mine?.correct ?? 0} to ${r.rivals?.correct ?? 0}`}
          >
            {r.mine?.correct ?? '–'} – {r.rivals?.correct ?? '–'}
          </AppText>
        </Animated.View>
        <Animated.View style={right}>
          {duel.rival ? (
            <Side
              player={duel.rival}
              label={`@${duel.rival.username}`}
              won={r.winnerId === duel.rival.id}
            />
          ) : null}
        </Animated.View>
      </View>
      <AppText
        variant="title"
        color={iWon ? 'moon' : 'text'}
        style={styles.centerText}
        accessibilityLiveRegion="polite"
      >
        {bannerText(duel)}
      </AppText>
      {iWon && r.winBonusXP > 0 ? (
        <AppText color="moon" style={styles.centerText}>
          +{r.winBonusXP} XP win bonus
        </AppText>
      ) : null}
      {r.mine?.perQuestion || r.rivals?.perQuestion ? (
        <Breakdown mine={r.mine} rivals={r.rivals} rivalName={duel.rival?.username ?? 'rival'} />
      ) : null}
    </View>
  );
}

function Side({ player, label, won }: { player: PlayerView; label: string; won: boolean }) {
  return (
    <View style={styles.side}>
      <YokaiAvatar id={player.avatarId} size={64} />
      <AppText variant="label" color={won ? 'moon' : 'textMuted'}>
        {label}
      </AppText>
    </View>
  );
}

type BreakdownProps = {
  mine: DuelPlayerResult | null;
  rivals: DuelPlayerResult | null;
  rivalName: string;
};

/** Per-question ✓/✗ for both players, then total times (the tie-breaker). */
function Breakdown({ mine, rivals, rivalName }: BreakdownProps) {
  const rows = Math.max(mine?.perQuestion?.length ?? 0, rivals?.perQuestion?.length ?? 0);
  const mark = (q?: { isCorrect: boolean; timedOut: boolean }) =>
    !q ? '–' : q.isCorrect ? '✓' : q.timedOut ? '⏱' : '✗';
  const said = (q?: { isCorrect: boolean; timedOut: boolean }) =>
    !q ? 'not played' : q.isCorrect ? 'correct' : q.timedOut ? 'timed out' : 'wrong';
  return (
    <Card>
      <View style={styles.bRow}>
        <AppText variant="label" color="textMuted" style={styles.bCell}>
          Q
        </AppText>
        <AppText variant="label" color="textMuted" style={styles.bCell}>
          You
        </AppText>
        <AppText variant="label" color="textMuted" style={styles.bCell} numberOfLines={1}>
          @{rivalName}
        </AppText>
      </View>
      {Array.from({ length: rows }, (_, i) => {
        const a = mine?.perQuestion?.[i];
        const b = rivals?.perQuestion?.[i];
        return (
          <View
            key={i}
            style={styles.bRow}
            accessible
            accessibilityLabel={`Question ${i + 1}: you ${said(a)}, ${rivalName} ${said(b)}`}
          >
            <AppText color="textMuted" style={styles.bCell}>
              {i + 1}
            </AppText>
            <AppText color={a?.isCorrect ? 'moon' : 'emberSoft'} style={styles.bCell}>
              {mark(a)}
            </AppText>
            <AppText color={b?.isCorrect ? 'moon' : 'emberSoft'} style={styles.bCell}>
              {mark(b)}
            </AppText>
          </View>
        );
      })}
      <View style={styles.bRow}>
        <AppText variant="label" color="textMuted" style={styles.bCell}>
          Time
        </AppText>
        <AppText variant="code" style={styles.bCell}>
          {mine ? formatClock(mine.totalTimeMs) : '–'}
        </AppText>
        <AppText variant="code" style={styles.bCell}>
          {rivals ? formatClock(rivals.totalTimeMs) : '–'}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', gap: spacing.md },
  centerText: { textAlign: 'center' },
  waiting: { alignItems: 'center', gap: spacing.md },
  codeCard: { alignItems: 'center', alignSelf: 'stretch' },
  result: { gap: spacing.lg },
  clash: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { alignItems: 'center', gap: spacing.sm, minWidth: 80 },
  bRow: { flexDirection: 'row', alignItems: 'center' },
  bCell: { flex: 1, textAlign: 'center' },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg },
});
