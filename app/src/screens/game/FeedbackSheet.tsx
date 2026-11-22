import { ScrollView, StyleSheet, View } from 'react-native';
import type { AnswerResult, PublicOption } from '@luna/shared';
import { AppText, Button } from '../../components';
import { colors, radii, spacing } from '../../theme';

type Props = {
  result: AnswerResult;
  options: PublicOption[];
  nextLabel: string;
  advancing: boolean;
  onNext: () => void;
};

/** Verdict panel pinned to the bottom after every answer. Animation, stamp and haptics are layered on in feedback polish. */
export function FeedbackSheet({ result, options, nextLabel, advancing, onNext }: Props) {
  const worse = options.filter(
    (o) => o.id !== result.correctAnswer && result.optionFeedback?.[o.id],
  );
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.sheet} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.head}>
            <AppText variant="title" color={result.isCorrect ? 'moon' : 'emberSoft'}>
              {result.isCorrect ? 'Correct' : 'Not quite'}
            </AppText>
            <AppText variant="button" color="moon">
              +{result.xpEarned} XP
            </AppText>
          </View>
          <AppText>{result.explanation}</AppText>
          {result.misconception ? (
            <View style={styles.block}>
              <AppText variant="label" color="emberSoft">
                Common misconception
              </AppText>
              <AppText color="textSoft">{result.misconception}</AppText>
            </View>
          ) : null}
          {worse.length > 0 ? (
            <View style={styles.block}>
              <AppText variant="label" color="textMuted">
                Why the others are worse
              </AppText>
              {worse.map((o) => (
                <AppText key={o.id} color="textSoft">
                  • {o.text}: {result.optionFeedback?.[o.id]}
                </AppText>
              ))}
            </View>
          ) : null}
        </ScrollView>
        <Button label={nextLabel} onPress={onNext} pending={advancing} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10,13,26,0.7)',
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radii.cardLg,
    borderTopRightRadius: radii.cardLg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  content: { gap: spacing.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  block: { gap: spacing.xs },
});
