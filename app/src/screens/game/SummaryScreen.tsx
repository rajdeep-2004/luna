import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SessionSummary } from '@luna/shared';
import { sessionsApi, usersApi, userMessage } from '../../api';
import { PROGRESS_KEY } from '../../lib/useProgress';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  MoonPhase,
  ProgressLine,
  Screen,
  type MoonPhaseName,
} from '../../components';
import { haptic } from '../../lib/haptics';
import { useTopicNames } from '../../lib/useTopicNames';
import type { AppStackParams } from '../../navigation/types';
import { useAuthStore } from '../../store/auth';
import { colors, spacing } from '../../theme';
import { useStartSession } from '../explore/useStartSession';
import { RankUpOverlay } from './RankUpOverlay';
import { CheckpointComparison, ProgressCard } from './SummaryExtras';

type Props = NativeStackScreenProps<AppStackParams, 'Summary'>;

const GRADES: Record<SessionSummary['grade'], { word: string; phase: MoonPhaseName }> = {
  KANPEKI: { word: 'Kanpeki', phase: 'full' },
  SUGOI: { word: 'Sugoi', phase: 'gibbous' },
  YOSHI: { word: 'Yoshi', phase: 'half' },
  MADA_MADA: { word: 'Mada mada', phase: 'crescent' },
};

const HEADING: Partial<Record<SessionSummary['type'], string>> = {
  INCIDENT: 'Incident report',
  DAILY: 'Daily Kata complete',
  BASELINE: 'Baseline complete',
  CHECKPOINT: 'Checkpoint complete',
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
          <ActivityIndicator color={colors.moon} />
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

  const isIncident = summary.type === 'INCIDENT';
  const grade = GRADES[summary.grade];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <GradeMoon phase={grade.phase} />
        <AppText variant="label" color="textMuted" style={styles.centerText}>
          {HEADING[summary.type] ?? 'Session complete'}
        </AppText>
        <AppText variant="display" style={styles.centerText}>
          {grade.word}
        </AppText>

        <View style={styles.stats}>
          <Stat
            label={isIncident ? 'Stages correct' : 'Correct'}
            value={`${summary.correctAnswers} / ${summary.totalAnswers}`}
          />
          <Stat label="XP" value={`+${summary.xpEarned}`} />
          <Stat label="Time" value={formatTime(summary.totalTimeMs)} />
        </View>

        <ProgressCard summary={summary} />
        {summary.type === 'CHECKPOINT' ? (
          <CheckpointComparison
            baseline={progress.data?.assessments.baseline ?? null}
            summary={summary}
          />
        ) : null}
        {summary.type === 'BASELINE' ? (
          <AppText color="textSoft" style={styles.centerText}>
            Your starting difficulty is set for each topic. It keeps adapting as you play.
          </AppText>
        ) : null}

        {isIncident && rootCause ? (
          <Card>
            <AppText variant="label" color="moon">
              Root cause
            </AppText>
            <AppText>{rootCause}</AppText>
          </Card>
        ) : null}

        {!isIncident && summary.perTopic.length > 0 ? (
          <Card>
            <AppText variant="label" color="textMuted">
              By topic
            </AppText>
            {summary.perTopic.map((t) => (
              <View key={t.topicSlug} style={styles.topicRow}>
                <View style={styles.topicHead}>
                  <AppText color="textSoft">{topicName(t.topicSlug)}</AppText>
                  <AppText color="textMuted">
                    {t.correct} / {t.total}
                  </AppText>
                </View>
                <ProgressLine value={t.total > 0 ? t.correct / t.total : 0} />
              </View>
            ))}
          </Card>
        ) : null}

        {summary.weakTopics.length > 0 ? (
          <Card>
            <AppText variant="label" color="emberSoft">
              Worth another look
            </AppText>
            {summary.weakTopics.map((slug) => (
              <Button
                key={slug}
                label={`Practise ${topicName(slug)}`}
                variant="ghost"
                pending={startPractice.pendingKey === slug}
                disabled={startPractice.pendingKey !== null}
                onPress={() =>
                  void startPractice.start(slug, { type: 'PRACTICE', topicSlug: slug })
                }
              />
            ))}
            {startPractice.error ? (
              <AppText color="emberSoft" accessibilityRole="alert">
                {startPractice.error}
              </AppText>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>
      <View style={styles.actions}>
        <Button label="Back to the dojo" onPress={done} />
      </View>
      {summary.rankUp && !rankUpSeen ? (
        <RankUpOverlay rankUp={summary.rankUp} onDone={() => setRankUpSeen(true)} />
      ) : null}
    </Screen>
  );
}

/** The grade moon grows from a smaller size on arrival (700 ms). With Reduce Motion it appears at full size. */
function GradeMoon({ phase }: { phase: MoonPhaseName }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(reduce ? 1 : 0.6);
  useEffect(() => {
    if (!reduce) scale.value = withTiming(1, { duration: 700 });
    haptic.success();
  }, [reduce, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.moon, style]}>
      <MoonPhase phase={phase} size={112} />
    </Animated.View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', gap: spacing.md, textAlign: 'center' },
  centerText: { textAlign: 'center' },
  moon: { alignItems: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: spacing.xs },
  topicRow: { gap: spacing.sm },
  topicHead: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { paddingBottom: spacing.lg },
});
