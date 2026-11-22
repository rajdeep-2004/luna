import { StyleSheet, View } from 'react-native';
import { AppText, CodeBlock } from '../../components';
import { spacing } from '../../theme';
import type { BodyProps } from './bodyTypes';
import { OptionList } from './OptionList';

const LABEL = { TRACE: 'Trace the Stack', ENGINEER_CHOICE: "Engineer's Choice" } as const;

/** Trace the Stack and Engineer's Choice: a prompt, an optional snippet, four options. */
export function ChoiceBody(props: BodyProps) {
  const { challenge } = props.step.item;
  const label = challenge.type === 'TRACE' ? LABEL.TRACE : LABEL.ENGINEER_CHOICE;
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
      <AppText variant="question">{props.step.prompt}</AppText>
      {challenge.codeSnippet ? <CodeBlock code={challenge.codeSnippet} /> : null}
      <OptionList {...props} />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.lg } });
