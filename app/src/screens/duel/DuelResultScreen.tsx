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
import { formatClock, formatRemaining } from '../../lib/duration';
import { bladeOf, formatOrClassic, rulesLine } from '../../lib/duelFormats';
import { duelLines, type PlayerLine } from '../../lib/duelScore';
import { haptic } from '../../lib/haptics';
import { useReduceMotion } from '../../lib/motion';
import type { AppStackParams } from '../../navigation/types';
import { colors, layout, radii, spacing } from '../../theme';
import { shareDuelCode, useDuelActions } from './useDuelActions';

type Props = NativeStackScreenProps<AppStackParams, 'DuelResult'>;

/**
 * competition.md §2 "Result screen", or the lobby until the match is played. The live match screen
 * arrives in P14 (D-052).
 */
export function DuelResultScreen({ route, navigation }: Props) {
  const { duelId } = route.params;
  const query = useQuery({ queryKey: ['duel', duelId], queryFn: () => duelsApi.get(duelId) });
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

  async function rematch() {
    await actions.create(formatOrClassic(query.data?.format));
  }

  const d = query.data;
  if (query.isPending)
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
        <View style={styles.inner}>{d.result ? <Result duel={d} /> : <Waiting duel={d} />}</View>
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

function Waiting({ duel }: { duel: DuelView }) {
  return (
    <View style={styles.waiting}>
      <AppText variant="title" style={styles.centerText}>
        {duel.rival ? `@${duel.rival.username} has joined` : 'Waiting for someone to join…'}
      </AppText>
      <AppText color="muted" style={styles.centerText}>
        {rulesLine(duel.format)} No hints.
        {duel.lobbyExpiresAt
          ? ` The invite closes in ${formatRemaining(duel.lobbyExpiresAt)}.`
          : ''}
      </AppText>
      {!duel.rival ? (
        <View style={styles.codeSlip}>
          <AppText variant="label" color="wood">
            Duel code
          </AppText>
          <AppText
            variant="display"
            color="onShoji"
            style={styles.codeText}
            accessibilityLabel={duel.code.split('').join(' ')}
          >
            {duel.code}
          </AppText>
          <Button
            label="Share code"
            variant="ghost"
            onPress={() => void shareDuelCode(duel.code, duel.format)}
          />
        </View>
      ) : null}
    </View>
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
type Q = { isCorrect: boolean; timedOut: boolean } | undefined;

/** One stamp per answer: 正 in seal ink, 誤 in grey sumi; a dash where the run never reached. */
function Mark({ q }: { q: Q }) {
  if (!q)
    return (
      <AppText color="muted" style={styles.bCell}>
        –
      </AppText>
    );
  return (
    <View style={styles.bCell}>
      <HankoStamp glyph={q.isCorrect ? '正' : '誤'} size={24} tone={q.isCorrect ? 'seal' : 'ink'} />
    </View>
  );
}

/** Per-question results for both players, then total times (the tie-breaker). */
function Breakdown({ mine, rivals, rivalName }: BreakdownProps) {
  const rows = Math.max(mine?.perQuestion?.length ?? 0, rivals?.perQuestion?.length ?? 0);
  const said = (q: Q) =>
    !q ? 'not reached' : q.isCorrect ? 'correct' : q.timedOut ? 'timed out' : 'wrong';
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
  waiting: { alignItems: 'center', gap: spacing.md },
  codeSlip: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.shoji,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  codeText: { letterSpacing: 6 },
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
  actions: { gap: spacing.sm, paddingBottom: spacing.lg, paddingHorizontal: layout.screenPadding },
});
