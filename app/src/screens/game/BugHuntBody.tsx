import { StyleSheet, View } from 'react-native';
import { AppText, CodeBlock, type MarkState } from '../../components';
import { spacing } from '../../theme';
import type { BodyProps, ChallengeStep } from './bodyTypes';

/** Bug Hunt: tap the line that contains the bug. The answer is the 1-based line number as a string. */
export function BugHuntBody({ step, selected, result, onSelect, locked }: BodyProps<ChallengeStep>) {
  const { challenge } = step.item;
  const lineStates: Record<number, MarkState> = {};
  if (selected) lineStates[Number(selected)] = 'selected';
  if (result) {
    lineStates[Number(result.correctAnswer)] = 'correct';
    if (!result.isCorrect && selected) lineStates[Number(selected)] = 'wrong';
  }
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="muted">
        Bug Hunt
      </AppText>
      <AppText variant="question">{step.prompt}</AppText>
      <CodeBlock
        code={challenge.codeSnippet ?? ''}
        lineStates={lineStates}
        onSelectLine={locked ? undefined : (line) => onSelect(String(line))}
      />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.lg } });
