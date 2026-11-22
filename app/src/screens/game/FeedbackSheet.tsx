import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { AnswerResult, PublicOption } from '@luna/shared';
import { AppText, Button, Stamp } from '../../components';
import { haptic } from '../../lib/haptics';
import { useCountUp } from '../../lib/useCountUp';
import { colors, radii, spacing } from '../../theme';

type Props = {
  result: AnswerResult;
  options: PublicOption[];
  nextLabel: string;
  advancing: boolean;
  onNext: () => void;
};

const RISE_MS = 500;
const RISE_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const START_OFFSET = 320;

/**
 * Verdict panel after every answer: stamp, XP count-up, explanation, misconception, and (Engineer's Choice)
 * why each wrong option is worse. It rises from the bottom while the board dims; with Reduce Motion it fades instead.
 */
export function FeedbackSheet({ result, options, nextLabel, advancing, onNext }: Props) {
  const reduce = useReducedMotion();
  const progress = useSharedValue(0);
  const xp = useCountUp(result.xpEarned, 600, reduce);

  useEffect(() => {
    progress.value = withTiming(1, { duration: reduce ? 150 : RISE_MS, easing: RISE_EASING });
    if (result.isCorrect) haptic.success();
    else haptic.error();
  }, [progress, reduce, result.isCorrect]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheet = useAnimatedStyle(() => ({
    opacity: reduce ? progress.value : 1,
    transform: [{ translateY: reduce ? 0 : (1 - progress.value) * START_OFFSET }],
  }));

  const worse = options.filter(
    (o) => o.id !== result.correctAnswer && result.optionFeedback?.[o.id],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]} />
      <View style={styles.bottom} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, sheet]} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.head}>
              <Stamp correct={result.isCorrect} />
              <View style={styles.headText}>
                <AppText variant="title" color={result.isCorrect ? 'moon' : 'emberSoft'}>
                  {result.isCorrect ? 'Correct' : 'Not quite'}
                </AppText>
                <AppText
                  variant="button"
                  color="moon"
                  accessibilityLabel={`${result.xpEarned} experience points earned`}
                >
                  +{xp} XP
                </AppText>
              </View>
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
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(10,13,26,0.7)' },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radii.cardLg,
    borderTopRightRadius: radii.cardLg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  content: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headText: { flex: 1, gap: spacing.xs },
  block: { gap: spacing.xs },
});
