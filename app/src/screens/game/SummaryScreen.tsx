import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { SessionSummary } from '@luna/shared';
import { HankoStrike } from '../../art/HankoStrike';
import type { KanjiGlyph } from '../../art/kanjiPaths';
import { Lantern } from '../../art/Lantern';
import { sessionsApi, usersApi, userMessage } from '../../api';
import { PROGRESS_KEY } from '../../lib/useProgress';
import { AppText, Button, ErrorState, Screen } from '../../components';
import { useReduceMotion } from '../../lib/motion';
import { useCountUp } from '../../lib/useCountUp';
import { useTopicNames } from '../../lib/useTopicNames';
import type { AppStackParams } from '../../navigation/types';
import { useAuthStore } from '../../store/auth';
import { colors, radii, spacing } from '../../theme';
import { useStartSession } from '../explore/useStartSession';
import { DUELS_KEY } from '../duel/useDuelActions';
import { RankUpOverlay } from './RankUpOverlay';
import { AchievementsCard, CheckpointComparison, ProgressCard } from './SummaryExtras';

type Props = NativeStackScreenProps<AppStackParams, 'Summary'>;

/** The grade is a seal stamped on the result (DESIGN.md): 正 for a strong round, 道 ("the way") otherwise. */
type Grade = { word: string; glyph: KanjiGlyph; tone: 'seal' | 'ink' };
const GRADES: Record<SessionSummary['grade'], Grade> = {
  KANPEKI: { word: 'Kanpeki', glyph: '正', tone: 'seal' },
  SUGOI: { word: 'Sugoi', glyph: '正', tone: 'seal' },
  YOSHI: { word: 'Yoshi', glyph: '道', tone: 'seal' },
  MADA_MADA: { word: 'Mada mada', glyph: '道', tone: 'ink' },
};
const XP_COUNT_MS = 900;
const LANTERN_W = 52;

const HEADING: Partial<Record<SessionSummary['type'], string>> = {
  INCIDENT: 'Incident report',
  DAILY: 'Daily Kata complete',
  BASELINE: 'Baseline complete',
  CHECKPOINT: 'Checkpoint complete',
  DUEL: 'Duel played',
};

const formatTime = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export function SummaryScreen({ route, navigation }: Props) {
  const { sessionId, rootCause } = route.params;
  const setUser = useAuthStore((s) => s.setUser);
  const topicName = useTopicNames();
  const startPractice = useStartSession(true);

  // Completing is idempotent on the server (a second call returns the stored summary), so a remount is safe.
  const query = useQuery({
    queryKey: ['summary', sessionId],
    queryFn: () => sessionsApi.complete(sessionId),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const summary = query.data;
  const queryClient = useQueryClient();
  const [rankUpSeen, setRankUpSeen] = useState(false);
  // The Checkpoint compares against the baseline score, which lives in the progress view.
  const progress = useQuery({
    queryKey: PROGRESS_KEY,
    queryFn: usersApi.progress,
    enabled: summary?.type === 'CHECKPOINT',
  });

  // Pull the new XP / streak into the header and the Dojo. Best effort: a failure here must not hide the summary.
  useEffect(() => {
    if (!summary) return;
    void queryClient.invalidateQueries({ queryKey: PROGRESS_KEY });
    if (summary.duelId) void queryClient.invalidateQueries({ queryKey: DUELS_KEY });
    usersApi
      .me()
      .then(setUser)
      .catch(() => undefined);
  }, [summary, setUser, queryClient]);

  const done = () => navigation.popToTop();

  if (query.isPending)
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  if (query.isError || !summary)
    return (
      <Screen>
        <View style={styles.center}>
          <ErrorState
            message={userMessage(query.error)}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
          <Button label="Back to the dojo" variant="ghost" onPress={done} />
        </View>
      </Screen>
    );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Result summary={summary} />

        <AchievementsCard summary={summary} />
        <ProgressCard summary={summary} />
        {summary.type === 'CHECKPOINT' ? (
          <CheckpointComparison
            baseline={progress.data?.assessments.baseline ?? null}
            summary={summary}
          />
        ) : null}
        {summary.type === 'BASELINE' ? (
          <AppText color="muted" style={styles.centerText}>
            Your starting difficulty is set. It keeps adapting as you play.
          </AppText>
        ) : null}

        {summary.type === 'INCIDENT' && rootCause ? (
          <View style={styles.slip}>
            <AppText variant="label" color="wood">
              Root cause
            </AppText>
            <AppText color="onShoji">{rootCause}</AppText>
          </View>
        ) : null}

        {summary.weakTopics.length > 0 ? (
          <View style={styles.again}>
            <AppText variant="label" color="muted" style={styles.centerText}>
              Train again
            </AppText>
            {summary.weakTopics.map((slug) => (
              <Button
                key={slug}
                label={topicName(slug)}
                variant="ghost"
                pending={startPractice.pendingKey === slug}
                disabled={startPractice.pendingKey !== null}
                onPress={() =>
                  void startPractice.start(slug, { type: 'PRACTICE', topicSlug: slug })
                }
              />
            ))}
            {startPractice.error ? (
              <AppText color="primary" accessibilityRole="alert" style={styles.centerText}>
                {startPractice.error}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.actions}>
        {summary.duelId ? (
          <Button
            label="See the duel"
            onPress={() => navigation.replace('DuelResult', { duelId: summary.duelId! })}
          />
        ) : null}
        <Button
          label="Back to the dojo"
          variant={summary.duelId ? 'ghost' : 'primary'}
          onPress={done}
        />
      </View>
      {summary.rankUp && !rankUpSeen ? (
        <RankUpOverlay rankUp={summary.rankUp} onDone={() => setRankUpSeen(true)} />
      ) : null}
    </Screen>
  );
}

/**
 * The top of the result: the grade seal strikes, the XP counts up in Dela Gothic, and when the
 * Kata grew the streak the lantern relights beside the numbers (DESIGN.md motions 3 and 4).
 */
function Result({ summary }: { summary: SessionSummary }) {
  const reduce = useReduceMotion();
  const grade = GRADES[summary.grade];
  const xp = useCountUp(summary.xpEarned, XP_COUNT_MS, reduce);
  const isIncident = summary.type === 'INCIDENT';
  const streak = summary.streak;

  return (
    <View style={styles.result}>
      <AppText variant="label" color="muted" style={styles.centerText}>
        {HEADING[summary.type] ?? 'Round complete'}
      </AppText>
      <HankoStrike
        correct={summary.grade !== 'MADA_MADA'}
        glyph={grade.glyph}
        tone={grade.tone}
        size={112}
        label={`Grade: ${grade.word}`}
      />
      <AppText variant="display" style={styles.centerText}>
        {grade.word}
      </AppText>
      <AppText
        variant="number"
        color="primary"
        accessibilityLabel={`${summary.xpEarned} experience points earned`}
      >
        +{xp} XP
      </AppText>

      <View style={styles.stats}>
        <Stat
          label={isIncident ? 'Stages' : 'Correct'}
          value={`${summary.correctAnswers}/${summary.totalAnswers}`}
        />
        {streak ? (
          <View
            style={styles.stat}
            accessible
            accessibilityLabel={`Streak: ${streak.current} ${streak.current === 1 ? 'day' : 'days'}${
              streak.extended ? ', lantern relit' : ''
            }`}
          >
            <Lantern
              streak={streak.current}
              state="lit"
              width={LANTERN_W}
              showCaption={false}
              relightKey={streak.extended ? streak.current : null}
            />
          </View>
        ) : null}
        <Stat label="Time" value={formatTime(summary.totalTimeMs)} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="label" color="muted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', gap: spacing.md },
  centerText: { textAlign: 'center' },
  result: { alignItems: 'center', gap: spacing.md },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  stat: { alignItems: 'center', gap: spacing.xs },
  slip: {
    backgroundColor: colors.shoji,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  again: { gap: spacing.sm },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg },
});
