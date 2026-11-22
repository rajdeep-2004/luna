import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, BrushMarks, Button, Screen } from '../../components';
import { spacing } from '../../theme';

type Props = {
  step: number;
  total: number;
  title: string;
  subtitle: string;
  actionLabel: string;
  actionDisabled?: boolean;
  actionPending?: boolean;
  error?: string | null;
  onAction: () => void;
  onBack?: () => void;
  children: ReactNode;
};

/** Shared layout: brush-mark steps, title, content, and one primary action in the thumb zone. */
export function OnboardingStep(p: Props) {
  return (
    <Screen>
      <View style={styles.top}>
        <BrushMarks total={p.total} done={p.step - 1} label={`Step ${p.step} of ${p.total}`} />
        <AppText variant="label" color="muted">
          Step {p.step} of {p.total}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="display">{p.title}</AppText>
        <AppText color="muted">{p.subtitle}</AppText>
        <View style={styles.body}>{p.children}</View>
      </ScrollView>
      <View style={styles.actions}>
        {p.error ? (
          <AppText color="primary" accessibilityRole="alert">
            {p.error}
          </AppText>
        ) : null}
        <Button
          label={p.actionLabel}
          onPress={p.onAction}
          disabled={p.actionDisabled}
          pending={p.actionPending}
        />
        {p.onBack ? (
          <Button label="Back" variant="ghost" onPress={p.onBack} disabled={p.actionPending} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { gap: spacing.sm, paddingTop: spacing.lg },
  content: { gap: spacing.md, paddingVertical: spacing.xl },
  body: { gap: spacing.md, paddingTop: spacing.md },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg },
});
