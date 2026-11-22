import { StyleSheet, View } from 'react-native';
import type { AnswerResult } from '@luna/shared';
import { HankoStrike } from '../../art/HankoStrike';
import { AppText } from '../../components';
import { spacing } from '../../theme';

type Props = {
  result: AnswerResult;
  /** The format's per-question timer: an answer that took all of it timed out. */
  timerMs: number;
  /** Sudden Death: this miss ends the run. */
  endsRun?: boolean;
};

/** The short duel verdict: the hanko strike and one word. Explanations wait for practice. */
export function DuelVerdict({ result, timerMs, endsRun = false }: Props) {
  const timedOut = !result.isCorrect && result.timeTakenMs >= timerMs;
  const miss = timedOut ? "Time's up" : 'Wrong';
  const word = result.isCorrect ? 'Correct' : endsRun ? `${miss}. Run over` : miss;
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <HankoStrike correct={result.isCorrect} size={52} label={word} />
      <AppText variant="title" color={result.isCorrect ? 'text' : 'muted'}>
        {word}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
});
