import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, Screen } from '../../components';
import { spacing } from '../../theme';

type Props = {
  title: string;
  submitLabel: string;
  pending: boolean;
  formError: string | null;
  onSubmit: () => void;
  footer: ReactNode;
  children: ReactNode;
};

/** Shared layout for Login and Register: title, fields, form-level error, one primary button. */
export function AuthForm({
  title,
  submitLabel,
  pending,
  formError,
  onSubmit,
  footer,
  children,
}: Props) {
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="display">{title}</AppText>
          <View style={styles.fields}>{children}</View>
          {formError ? (
            <AppText color="primary" accessibilityRole="alert">
              {formError}
            </AppText>
          ) : null}
          <Button label={submitLabel} onPress={onSubmit} pending={pending} />
          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.xl, paddingVertical: spacing.xxl },
  fields: { gap: spacing.lg },
});
