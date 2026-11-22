import { StyleSheet, View } from 'react-native';
import { HankoStamp } from '../../art/HankoStamp';
import { AppText, PressableSink } from '../../components';
import { colors, layout, radii, spacing } from '../../theme';

type Props = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** `radio` for pick-one lists, `checkbox` for pick-many. */
  kind: 'radio' | 'checkbox';
};

/** Selectable row: tatami when idle, shoji with a 正 stamp when chosen (never colour alone). */
export function ChoiceRow({ title, description, selected, onPress, kind }: Props) {
  return (
    <PressableSink
      onPress={onPress}
      accessibilityRole={kind}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      style={[styles.row, selected && styles.selected]}
    >
      <View style={styles.text}>
        <AppText variant="button" color={selected ? 'onShoji' : 'text'}>
          {title}
        </AppText>
        {description ? <AppText color={selected ? 'wood' : 'muted'}>{description}</AppText> : null}
      </View>
      <View style={styles.marker}>
        {selected ? <HankoStamp glyph="正" size={28} /> : <View style={styles.empty} />}
      </View>
    </PressableSink>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.buttonHeight,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.tatami,
  },
  selected: { backgroundColor: colors.shoji },
  text: { flex: 1, gap: spacing.xs },
  marker: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  empty: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.wallLight,
  },
});
