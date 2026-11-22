import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { AnswerResult, PublicOption } from '@luna/shared';
import { HankoStrike } from '../../art/HankoStrike';
import { AppText, Button, PressableSink } from '../../components';
import { useReduceMotion } from '../../lib/motion';
import { useCountUp } from '../../lib/useCountUp';
import { colors, radii, spacing } from '../../theme';

type Props = {
  result: AnswerResult;
  options: PublicOption[];
  nextLabel: string;
  advancing: boolean;
  onNext: () => void;
};

const RISE_MS = 420;
const RISE_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const START_OFFSET = 320;

/** The text of the right answer: an option's text, or the line number for Bug Hunt. */
function answerText(result: AnswerResult, options: PublicOption[]): string {
  const option = options.find((o) => o.id === result.correctAnswer);
  return option ? option.text : `Line ${result.correctAnswer}`;
}

/**
 * The verdict after every answer, as a slip of shoji paper rising over the board (DESIGN.md): the
 * hanko strike, one word, the XP, and the right answer when you missed. The explanation is folded
 * behind "Why?" so the game keeps moving (DESIGN.md: paragraphs only here, collapsed by default).
 * With Reduce Motion it fades in instead of rising.
 */
export function FeedbackSheet({ result, options, nextLabel, advancing, onNext }: Props) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(0);
  const xp = useCountUp(result.xpEarned, 600, reduce);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    progress.value = withDelay(
      reduce ? 0 : 120,
      withTiming(1, { duration: reduce ? 150 : RISE_MS, easing: RISE_EASING }),
    );
  }, [progress, reduce]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheet = useAnimatedStyle(() => ({
    opacity: reduce ? progress.value : 1,
    transform: [{ translateY: reduce ? 0 : (1 - progress.value) * START_OFFSET }],
  }));

  const worse = options.filter(
    (o) => o.id !== result.correctAnswer && result.optionFeedback?.[o.id],
  );
  const word = result.isCorrect ? 'Correct' : 'Not quite';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]} />
      <View style={styles.bottom} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, sheet]} accessibilityViewIsModal>
          <View style={styles.head}>
            <HankoStrike correct={result.isCorrect} size={64} label={word} />
            <View style={styles.headText}>
              <AppText variant="display" color="onShoji">
                {word}
              </AppText>
              <AppText
                variant="title"
                color="wood"
                accessibilityLabel={`${result.xpEarned} experience points earned`}
              >
                +{xp} XP
              </AppText>
            </View>
          </View>

          {!result.isCorrect ? (
            <AppText color="onShoji">
              <AppText color="wood" style={styles.strong}>
                Answer:{' '}
              </AppText>
              {answerText(result, options)}
            </AppText>
          ) : null}

          <PressableSink
            onPress={() => setOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={open ? 'Hide the explanation' : 'Why? Show the explanation'}
            style={styles.why}
          >
            <AppText variant="label" color="wood">
              {open ? 'Hide' : 'Why?'}
            </AppText>
            <AppText color="wood">{open ? '▴' : '▾'}</AppText>
          </PressableSink>

          {open ? (
            <ScrollView style={styles.more} contentContainerStyle={styles.moreContent}>
              <AppText color="onShoji">{result.explanation}</AppText>
              {result.misconception ? (
                <View style={styles.block}>
                  <AppText variant="label" color="wood">
                    The trap
                  </AppText>
                  <AppText color="onShoji">{result.misconception}</AppText>
                </View>
              ) : null}
              {worse.length > 0 ? (
                <View style={styles.block}>
                  <AppText variant="label" color="wood">
                    Why the others are worse
                  </AppText>
                  {worse.map((o) => (
                    <AppText key={o.id} color="onShoji">
                      {o.text}: {result.optionFeedback?.[o.id]}
                    </AppText>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          ) : null}

          <Button label={nextLabel} onPress={onNext} pending={advancing} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(42,25,16,0.72)' },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '82%',
    backgroundColor: colors.shoji,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headText: { flex: 1, gap: 2 },
  strong: { fontWeight: '700' },
  why: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  more: { maxHeight: 260 },
  moreContent: { gap: spacing.md },
  block: { gap: spacing.xs },
});
