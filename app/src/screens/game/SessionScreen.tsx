import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { DUEL_FORMAT_RULES } from '@luna/shared';
import { sessionsApi, userMessage } from '../../api';
import { AppText, Button, ErrorState, Screen } from '../../components';
import { haptic } from '../../lib/haptics';
import { answeredCount, DUEL_VERDICT_MS, findStep, progressOf } from '../../lib/session';
import type { AppStackParams } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import { BugHuntBody } from './BugHuntBody';
import { ChoiceBody } from './ChoiceBody';
import { DuelCountdown } from './DuelCountdown';
import { CorrectCelebration } from './CorrectCelebration';
import { DuelVerdict } from './DuelVerdict';
import { ElapsedClock } from './ElapsedClock';
import { FeedbackSheet } from './FeedbackSheet';
import { IncidentBody } from './IncidentBody';
import { SessionHeader } from './SessionHeader';
import { useAnswerFlow } from './useAnswerFlow';

type Props = NativeStackScreenProps<AppStackParams, 'Session'>;

/**
 * Plays one session. The server holds the position: every load (and every "Next") refetches
 * `GET /sessions/:id`, so closing the app mid-session and returning resumes at the right question.
 */
export function SessionScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const query = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionsApi.get(sessionId),
    staleTime: 0,
    gcTime: 0,
  });
  const session = query.data;
  const step = session ? findStep(session) : null;
  const flow = useAnswerFlow(sessionId, step);
  const [advancing, setAdvancing] = useState(false);
  // A correct answer celebrates first; "Why it works" swaps in the full sheet for that answer.
  const [explain, setExplain] = useState(false);
  const rootCause = useRef<string | undefined>(undefined);

  const isDuel = session?.type === 'DUEL';
  const rules = DUEL_FORMAT_RULES[session?.duelFormat ?? 'CLASSIC'];
  // Blitz's 10 s clock restarts at each answer on the server, so its verdict is shorter.
  const verdictMs = session?.duelFormat === 'BLITZ' ? DUEL_VERDICT_MS / 2 : DUEL_VERDICT_MS;
  // A Sudden Death run that ended at a miss is finished even though questions are left.
  const allDone =
    !!session &&
    session.items.length > 0 &&
    (session.endedEarly === true || session.items.every((i) => i.isComplete));
  const goToSummary = () =>
    navigation.replace('Summary', { sessionId, rootCause: rootCause.current });

  // Resuming a session whose answers are all in (e.g. the app closed before "Finish"): go straight to the summary.
  useEffect(() => {
    if (allDone && !flow.result)
      navigation.replace('Summary', { sessionId, rootCause: rootCause.current });
  }, [allDone, flow.result, navigation, sessionId]);

  async function next() {
    if (!flow.result || advancing) return;
    if (flow.result.rootCause) rootCause.current = flow.result.rootCause;
    if (flow.result.sessionReadyToComplete) return goToSummary();
    setAdvancing(true);
    try {
      await query.refetch();
      flow.reset();
      setExplain(false);
    } finally {
      setAdvancing(false);
    }
  }

  // Duels have no feedback sheet: the server's clock runs from the last answer, so reading time
  // would eat the next 60 s. Show the verdict briefly, then move on by itself.
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });
  useEffect(() => {
    if (!isDuel || !flow.result) return;
    const t = setTimeout(() => void nextRef.current(), verdictMs);
    return () => clearTimeout(t);
  }, [isDuel, flow.result, verdictMs]);

  function confirmHint() {
    Alert.alert('Use a hint?', 'Using a hint halves the XP for this question.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Show hint', onPress: () => void flow.revealHint() },
    ]);
  }

  if (query.isPending) return <Centered>{<ActivityIndicator color={colors.primary} />}</Centered>;
  if (query.isError || !session || (!step && !allDone)) {
    return (
      <Centered>
        <ErrorState
          message={query.isError ? userMessage(query.error) : 'This session could not be loaded.'}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
        <Button label="Leave" variant="ghost" onPress={() => navigation.goBack()} />
      </Centered>
    );
  }
  if (!step) return <Centered>{<ActivityIndicator color={colors.primary} />}</Centered>;

  const type = step.item.challenge.type;
  const body = {
    step,
    selected: flow.selected,
    result: flow.result,
    onSelect: (answer: string) => {
      haptic.selection();
      flow.setSelected(answer);
    },
    locked: flow.submitting || !!flow.result,
  };
  const stepKey = `${step.item.challenge.id}:${step.stageIndex}`;

  return (
    <Screen>
      <SessionHeader
        progress={progressOf(session)}
        position={answeredCount(session) + 1}
        total={session.totalAnswers}
        onLeave={() => navigation.goBack()}
        leaveMessage={
          isDuel
            ? `Your answers are saved, but the ${rules.timerMs / 1000}-second clock keeps running on the server.`
            : undefined
        }
        clock={
          isDuel ? (
            <DuelCountdown
              key={stepKey}
              remainingMs={rules.timerMs - (session.stepElapsedMs ?? 0)}
              totalMs={rules.timerMs}
              paused={flow.submitting || !!flow.result}
              onExpire={() => void flow.submitTimeout()}
            />
          ) : (
            <ElapsedClock key={stepKey} />
          )
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {type === 'BUG_HUNT' ? (
          <BugHuntBody {...body} />
        ) : type === 'INCIDENT' ? (
          <IncidentBody {...body} />
        ) : (
          <ChoiceBody {...body} />
        )}
        {flow.hint ? (
          <View style={styles.hint} accessibilityLiveRegion="polite">
            <AppText variant="label" color="wood">
              Hint
            </AppText>
            <AppText color="onShoji">{flow.hint}</AppText>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        {flow.error ? (
          <AppText color="primary" accessibilityRole="alert">
            {flow.error}
          </AppText>
        ) : null}
        {isDuel && flow.result ? (
          <DuelVerdict
            result={flow.result}
            timerMs={rules.timerMs}
            endsRun={rules.endsOnMiss && !flow.result.isCorrect}
          />
        ) : null}
        {step.hasHint && !flow.hint && !isDuel ? (
          <Button label="Need a hint?" variant="ghost" onPress={confirmHint} />
        ) : null}
        <Button
          label="Strike"
          onPress={() => void flow.submit()}
          disabled={!flow.selected}
          pending={flow.submitting}
        />
      </View>

      {flow.result && !isDuel && flow.result.isCorrect && !explain ? (
        <CorrectCelebration
          xpEarned={flow.result.xpEarned}
          nextLabel={flow.result.sessionReadyToComplete ? 'Finish' : 'Next'}
          advancing={advancing}
          onNext={() => void next()}
          onExplain={() => setExplain(true)}
        />
      ) : flow.result && !isDuel ? (
        <FeedbackSheet
          result={flow.result}
          options={step.options}
          nextLabel={flow.result.sessionReadyToComplete ? 'Finish' : 'Next'}
          advancing={advancing}
          onNext={() => void next()}
          startOpen={explain}
        />
      ) : null}
    </Screen>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Screen>
      <View style={styles.center}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    backgroundColor: colors.shoji,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  content: { gap: spacing.lg, paddingVertical: spacing.xl },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg },
  center: { flex: 1, justifyContent: 'center', gap: spacing.md },
});
