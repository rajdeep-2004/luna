import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { colors, layout, radii, spacing } from '../../theme';

type Props = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** `radio` for pick-one lists, `checkbox` for pick-many. */
  kind: 'radio' | 'checkbox';
};

/** Selectable row. Selected = raised surface + 1 px moon ring + a filled marker (never colour alone). */
export function ChoiceRow({ title, description, selected, onPress, kind }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={kind}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      style={[styles.row, selected && styles.selected]}
    >
      <View style={styles.text}>
        <AppText variant="button">{title}</AppText>
        {description ? <AppText color="textMuted">{description}</AppText> : null}
      </View>
      <View style={[styles.marker, selected && styles.markerOn]}>
        {selected ? <AppText color="onMoon">✓</AppText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.buttonHeight,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: colors.surfaceRaised, borderColor: colors.moon },
  text: { flex: 1, gap: spacing.xs },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.track,
  },
  markerOn: { backgroundColor: colors.moon },
});
