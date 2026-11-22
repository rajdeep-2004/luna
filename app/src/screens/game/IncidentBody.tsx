import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '../../components';
import { spacing } from '../../theme';
import type { BodyProps } from './bodyTypes';
import { OptionList } from './OptionList';

/** Incident Room: earlier stages shown as a quiet timeline, then the current stage's evidence, question and options. */
export function IncidentBody(props: BodyProps) {
  const { step } = props;
  const earlier = step.item.revealedStages.slice(0, step.stageIndex);
  const stage = step.stage;
  if (!stage) return null;
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="textMuted">
        Incident Room · Stage {stage.index + 1} of {step.item.challenge.stageCount}
      </AppText>
      <AppText variant="title">{step.item.challenge.title}</AppText>

      {earlier.map((s) => (
        <View key={s.index} style={styles.earlier}>
          <AppText variant="label" color="textMuted">
            {s.title}
          </AppText>
          <AppText color="textMuted" numberOfLines={3}>
            {s.evidence}
          </AppText>
        </View>
      ))}

      <Card>
        <AppText variant="label" color="moon">
          {stage.title}
        </AppText>
        <AppText>{stage.evidence}</AppText>
      </Card>
      <AppText variant="question">{stage.prompt}</AppText>
      <OptionList {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  earlier: { gap: spacing.xs, opacity: 0.8 },
});
