import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { sessionsApi, userMessage } from '../../api';
import { AppText, Button, Card, ErrorState, Screen } from '../../components';
import { answeredCount, findStep, progressOf } from '../../lib/session';
import type { AppStackParams } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { BugHuntBody } from './BugHuntBody';
import { ChoiceBody } from './ChoiceBody';
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
  const rootCause = useRef<string | undefined>(undefined);

  const allDone = !!session && session.items.length > 0 && session.items.every((i) => i.isComplete);
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
    } finally {
      setAdvancing(false);
    }
  }

  function confirmHint() {
    Alert.alert('Use a hint?', 'Using a hint halves the XP for this question.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Show hint', onPress: () => void flow.revealHint() },
    ]);
  }

  if (query.isPending) return <Centered>{<ActivityIndicator color={colors.moon} />}</Centered>;
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
  if (!step) return <Centered>{<ActivityIndicator color={colors.moon} />}</Centered>;

  const type = step.item.challenge.type;
  const body = {
    step,
    selected: flow.selected,
    result: flow.result,
    onSelect: flow.setSelected,
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
        clock={<ElapsedClock key={stepKey} />}
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
          <Card>
            <AppText variant="label" color="moon">
              Hint
            </AppText>
            <AppText>{flow.hint}</AppText>
          </Card>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        {flow.error ? (
          <AppText color="emberSoft" accessibilityRole="alert">
            {flow.error}
          </AppText>
        ) : null}
        {step.hasHint && !flow.hint ? (
          <Button label="Need a hint?" variant="ghost" onPress={confirmHint} />
        ) : null}
        <Button
          label="Strike"
          onPress={() => void flow.submit()}
          disabled={!flow.selected}
          pending={flow.submitting}
        />
      </View>

      {flow.result ? (
        <FeedbackSheet
          result={flow.result}
          options={step.options}
          nextLabel={flow.result.sessionReadyToComplete ? 'Finish' : 'Next'}
          advancing={advancing}
          onNext={() => void next()}
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
  content: { gap: spacing.lg, paddingVertical: spacing.xl },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg },
  center: { flex: 1, justifyContent: 'center', gap: spacing.md },
});
