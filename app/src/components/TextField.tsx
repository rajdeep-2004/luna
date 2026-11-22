import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontFamily, layout, radii, spacing } from '../theme';
import { AppText } from './AppText';

type Props = TextInputProps & { label: string; error?: string | null };

/**
 * Labelled input on a tatami block with an amber underline when focused (DESIGN.md: Components).
 * The label doubles as the accessibility label.
 */
export function TextField({ label, error, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="muted">
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxFontSizeMultiplier={1.3}
        style={[styles.input, focused && styles.focused, !!error && styles.errored, style]}
        {...rest}
      />
      {error ? (
        <AppText variant="body" color="primary" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  input: {
    minHeight: layout.buttonHeight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.tatami,
    color: colors.text,
    fontFamily: fontFamily.sansMedium,
    fontSize: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  focused: { borderBottomColor: colors.primary },
  errored: { borderBottomColor: colors.seal },
});
