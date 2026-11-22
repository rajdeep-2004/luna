import { StyleSheet, View } from 'react-native';
import { DUEL_TIMER_MS, type AnswerResult } from '@luna/shared';
import { HankoStrike } from '../../art/HankoStrike';
import { AppText } from '../../components';
import { spacing } from '../../theme';

/** The short duel verdict: the hanko strike and one word. Explanations wait for practice. */
export function DuelVerdict({ result }: { result: AnswerResult }) {
  const timedOut = !result.isCorrect && result.timeTakenMs >= DUEL_TIMER_MS;
  const word = result.isCorrect ? 'Correct' : timedOut ? "Time's up" : 'Wrong';
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
