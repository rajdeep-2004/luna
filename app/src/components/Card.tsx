import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';

/** Surface card. No border: depth comes from `surface` vs `bg` (ui-design.md §4). */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.cardLg,
    padding: spacing.xl,
    gap: spacing.md,
  },
});
