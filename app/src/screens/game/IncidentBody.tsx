import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { colors, radii, spacing } from '../../theme';
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
      <AppText variant="label" color="muted">
        Incident Room · Stage {stage.index + 1} of {step.item.challenge.stageCount}
      </AppText>
      <AppText variant="title">{step.item.challenge.title}</AppText>

      {earlier.map((s) => (
        <View key={s.index} style={styles.earlier}>
          <AppText variant="label" color="muted">
            {s.title}
          </AppText>
          <AppText color="muted" numberOfLines={3}>
            {s.evidence}
          </AppText>
        </View>
      ))}

      {/* The evidence for this stage, pinned like a report slip on the incident board. */}
      <View style={styles.evidence}>
        <AppText variant="label" color="primary">
          {stage.title}
        </AppText>
        <AppText>{stage.evidence}</AppText>
      </View>
      <AppText variant="question">{stage.prompt}</AppText>
      <OptionList {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  evidence: {
    backgroundColor: colors.night,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  earlier: { gap: spacing.xs, opacity: 0.8 },
});
