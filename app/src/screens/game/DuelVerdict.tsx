import { StyleSheet, View } from 'react-native';
import type { AnswerResult } from '@luna/shared';
import { AppText, Stamp } from '../../components';
import { DUEL_TIMER_MS } from '../../lib/session';
import { spacing } from '../../theme';

/** The short duel verdict: the stamp and one word. Explanations wait for practice. */
export function DuelVerdict({ result }: { result: AnswerResult }) {
  const timedOut = !result.isCorrect && result.timeTakenMs >= DUEL_TIMER_MS;
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Stamp correct={result.isCorrect} />
      <AppText color={result.isCorrect ? 'moon' : 'emberSoft'}>
        {result.isCorrect ? 'Correct' : timedOut ? "Time's up" : 'Wrong'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
