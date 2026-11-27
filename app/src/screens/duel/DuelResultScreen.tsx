import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { DuelView } from '@luna/shared';
import { duelsApi, userMessage } from '../../api';
import { FaceOff } from '../../art/FaceOff';
import { HankoStamp } from '../../art/HankoStamp';
import { WinSeal } from '../../art/WinSeal';
import { AppText, Button, ErrorState, Screen } from '../../components';
import { formatClock } from '../../lib/duration';
import { bladeOf, formatOrClassic } from '../../lib/duelFormats';
import { duelLines, type PlayerLine } from '../../lib/duelScore';
import { haptic } from '../../lib/haptics';
import { useReduceMotion } from '../../lib/motion';
import type { AppStackParams } from '../../navigation/types';
import { colors, layout, radii, spacing } from '../../theme';
import { duelKey, isEndedDuel, useDuelActions } from './useDuelActions';
import { answerTime } from './live/RevealPanel';

type Props = NativeStackScreenProps<AppStackParams, 'DuelResult'>;

/**
 * competition.md §2 "Result screen": the winner's seal, the score, per-question ✓/✗ and times for
 * both, and the win bonus. A duel that is still live (opened from the list or a stale link) moves
 * on to the live screen instead.
 */
export function DuelResultScreen({ route, navigation }: Props) {
  const { duelId } = route.params;
  const query = useQuery({ queryKey: duelKey(duelId), queryFn: () => duelsApi.get(duelId) });
  const actions = useDuelActions();
  const { width } = useWindowDimensions();
  const [clash, setClash] = useState(0);
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
      setClash((k) => k + 1);
    }, [refetch]),
  );
  const home = () => navigation.popToTop();
  const live = !!query.data && !isEndedDuel(query.data);
  useEffect(() => {
    if (live) navigation.replace('LiveDuel', { duelId });
  }, [live, navigation, duelId]);

  async function rematch() {
    await actions.create(formatOrClassic(query.data?.format));
  }

  const d = query.data;
  if (query.isPending || live)
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
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
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <FaceOff
          width={width}
          me={d.me.avatarId}
          rival={d.rival?.avatarId ?? null}
          meLabel={`You · ${bladeOf(d.format).name}`}
          rivalLabel={d.rival ? `@${d.rival.username}` : 'A friend'}
          playKey={clash}
        />
        <View style={styles.inner}>
          {d.result ? (
            <Result duel={d} />
          ) : (
            <AppText variant="title" style={styles.centerText}>
              This duel ended without a result
            </AppText>
          )}
        </View>
      </ScrollView>
      <View style={styles.actions}>
        {actions.error ? (
          <AppText color="primary" accessibilityRole="alert">
            {actions.error}
          </AppText>
        ) : null}
        {d.result ? (
          <Button
            label="Rematch"
            pending={actions.pending === 'create'}
            disabled={actions.pending !== null}
            onPress={() => void rematch()}
          />
        ) : null}
        <Button label="Back home" variant={d.result ? 'ghost' : 'primary'} onPress={home} />
      </View>
    </Screen>
  );
}

function bannerText(d: DuelView): string {
  const r = d.result!;
  if (r.endReason === 'EXPIRED') return 'This duel expired';
  if (r.endReason === 'CANCELLED') return 'This duel was cancelled';
  if (r.endReason === 'ABANDONED') return 'Both players left';
  if (!r.winnerId) return 'A draw. Evenly matched.';
  if (r.winnerId === d.me.id) return r.endReason === 'FORFEIT' ? 'You win by default' : 'You win';
  const name = d.rival?.username ?? 'rival';
  return `@${name} wins${r.endReason === 'FORFEIT' ? ' by default' : ''}`;
}

/** After the face-off clash, the score lands and the winner's 勝 seal strikes (motion 6). */
function Result({ duel }: { duel: DuelView }) {
  const r = { ...duel.result!, ...duelLines(duel) };
  const reduce = useReduceMotion();
  const land = useSharedValue(reduce ? 1 : 0);
  const seal = useSharedValue(reduce ? 1 : 0);
  const iWon = r.winnerId === duel.me.id;
  const someoneWon = r.winnerId !== null;
  useEffect(() => {
    if (!reduce) {
      land.value = withDelay(420, withTiming(1, { duration: 320 }));
      seal.value = withDelay(760, withSpring(1, { damping: 12, stiffness: 240 }));
    }
    const t = setTimeout(() => (iWon ? haptic.heavy() : haptic.light()), reduce ? 0 : 760);
    return () => clearTimeout(t);
  }, [reduce, land, seal, iWon]);
  const scoreIn = useAnimatedStyle(() => ({
    opacity: land.value,
    transform: [{ translateY: (1 - land.value) * 10 }],
  }));
  const sealIn = useAnimatedStyle(() => ({
    opacity: seal.value > 0 ? 1 : 0,
    transform: [{ scale: 1.6 - 0.6 * seal.value }],
  }));

  return (
    <View style={styles.result}>
      <Animated.View style={[styles.scoreRow, scoreIn]}>
        <View style={styles.sealSlot}>
          {iWon ? (
            <Animated.View style={sealIn}>
              <WinSeal size={44} label="You won" />
            </Animated.View>
          ) : null}
        </View>
        <AppText
          variant="number"
          accessibilityLabel={`Score ${r.mine?.correct ?? 0} to ${r.rivals?.correct ?? 0}`}
        >
          {r.mine?.correct ?? '–'} – {r.rivals?.correct ?? '–'}
        </AppText>
        <View style={styles.sealSlot}>
          {someoneWon && !iWon ? (
            <Animated.View style={sealIn}>
              <WinSeal size={44} label="Rival won" />
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
      <AppText
        variant="title"
        color={iWon ? 'primary' : 'text'}
        style={styles.centerText}
        accessibilityLiveRegion="polite"
      >
        {bannerText(duel)}
      </AppText>
      {iWon && r.winBonusXP > 0 ? (
        <AppText color="primary" style={styles.centerText}>
          +{r.winBonusXP} XP win bonus
        </AppText>
      ) : null}
      {r.mine?.perQuestion || r.rivals?.perQuestion ? (
        <Breakdown mine={r.mine} rivals={r.rivals} rivalName={duel.rival?.username ?? 'rival'} />
      ) : null}
    </View>
  );
}

type BreakdownProps = {
  mine: PlayerLine | null;
  rivals: PlayerLine | null;
  rivalName: string;
};
type Q = { isCorrect: boolean; timedOut: boolean; timeTakenMs: number } | undefined;

/**
 * One stamp per answer: 正 in seal ink, 誤 in grey sumi, with the server-measured time under it;
 * a dash where the run never reached.
 */
function Mark({ q }: { q: Q }) {
  if (!q)
    return (
      <AppText color="muted" style={styles.bCell}>
        –
      </AppText>
    );
  return (
    <View style={[styles.bCell, styles.mark]}>
      <HankoStamp glyph={q.isCorrect ? '正' : '誤'} size={24} tone={q.isCorrect ? 'seal' : 'ink'} />
      <AppText variant="code" color="muted">
        {answerTime({ ...q, responseMs: q.timeTakenMs })}
      </AppText>
    </View>
  );
}

/** Per-question results for both players, then total times (the tie-breaker). */
function Breakdown({ mine, rivals, rivalName }: BreakdownProps) {
  const rows = Math.max(mine?.perQuestion?.length ?? 0, rivals?.perQuestion?.length ?? 0);
  const said = (q: Q) =>
    !q
      ? 'not reached'
      : q.timedOut
        ? 'timed out'
        : `${q.isCorrect ? 'correct' : 'wrong'} in ${(q.timeTakenMs / 1000).toFixed(1)} seconds`;
  return (
    <View style={styles.breakdown}>
      <View style={styles.bRow}>
        <AppText variant="label" color="muted" style={styles.bCell}>
          Q
        </AppText>
        <AppText variant="label" color="muted" style={styles.bCell}>
          You
        </AppText>
        <AppText variant="label" color="muted" style={styles.bCell} numberOfLines={1}>
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
            <AppText variant="code" color="muted" style={styles.bCell}>
              {i + 1}
            </AppText>
            <Mark q={a} />
            <Mark q={b} />
          </View>
        );
      })}
      <View style={[styles.bRow, styles.bTime]}>
        <AppText variant="label" color="muted" style={styles.bCell}>
          Time
        </AppText>
        <AppText variant="code" style={styles.bCell}>
          {mine ? formatClock(mine.totalTimeMs) : '–'}
        </AppText>
        <AppText variant="code" style={styles.bCell}>
          {rivals ? formatClock(rivals.totalTimeMs) : '–'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  inner: { paddingHorizontal: layout.screenPadding, marginTop: spacing.lg, gap: spacing.lg },
  center: { flex: 1, justifyContent: 'center', gap: spacing.md },
  centerText: { textAlign: 'center' },
  result: { gap: spacing.md },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sealSlot: { width: 72, alignItems: 'center' },
  breakdown: {
    marginTop: spacing.sm,
    backgroundColor: colors.tatami,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bRow: { flexDirection: 'row', alignItems: 'center', minHeight: 30 },
  bTime: { borderTopWidth: 1, borderTopColor: colors.wood, paddingTop: spacing.sm },
  bCell: { flex: 1, textAlign: 'center', alignItems: 'center' },
  mark: { gap: 2 },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg, paddingHorizontal: layout.screenPadding },
});
