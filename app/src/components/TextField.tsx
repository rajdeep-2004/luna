import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontFamily, layout, radii, spacing } from '../theme';
import { AppText } from './AppText';

type Props = TextInputProps & { label: string; error?: string | null };

/** Labelled input with an inline error. The label doubles as the accessibility label. */
export function TextField({ label, error, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxFontSizeMultiplier={1.3}
        style={[styles.input, focused && styles.focused, !!error && styles.errored, style]}
        {...rest}
      />
      {error ? (
        <AppText variant="body" color="emberSoft" accessibilityLiveRegion="polite">
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
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fontFamily.sansMedium,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  focused: { borderColor: colors.moon },
  errored: { borderColor: colors.ember },
});
