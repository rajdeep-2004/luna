import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, layout, radii } from '../theme';
import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  pending?: boolean;
  disabled?: boolean;
};

/** Primary (moon pill) or ghost (text). While `pending` it ignores taps, so a double tap never submits twice. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  pending = false,
  disabled = false,
}: Props) {
  const inactive = pending || disabled;
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: pending }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary && {
          backgroundColor: pressed ? colors.moonDeep : colors.moon,
          height: layout.buttonHeight,
        },
        !primary && styles.ghost,
        inactive && { opacity: pending ? 1 : 0.5 },
      ]}
    >
      {pending ? (
        <ActivityIndicator color={primary ? colors.onMoon : colors.textMuted} />
      ) : (
        <AppText variant="button" color={primary ? 'onMoon' : 'textSoft'}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  ghost: { minHeight: layout.touchTarget },
});
