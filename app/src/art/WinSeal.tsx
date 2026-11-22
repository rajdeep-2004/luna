import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { colors } from '../theme';

/**
 * The winner's seal: 勝 ("victory") in a red square, rotated like a hand-pressed hanko. The brush
 * font's 勝 is a broken composite glyph (D-039), so this one is set in Dela Gothic One.
 */
export function WinSeal({ size, label }: { size: number; label?: string }) {
  return (
    <View
      style={[
        styles.seal,
        {
          width: size,
          height: size,
          borderWidth: Math.max(2, size * 0.06),
          borderRadius: size * 0.1,
        },
      ]}
      accessible={!!label}
      accessibilityLabel={label}
    >
      <AppText
        variant="display"
        color="seal"
        style={{ fontSize: size * 0.62, lineHeight: size * 0.8 }}
        importantForAccessibility="no"
      >
        勝
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  seal: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.seal,
    transform: [{ rotate: '-6deg' }],
  },
});
