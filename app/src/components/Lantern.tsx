import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';

/** Streak lantern. Lit (moon gold) when the streak is above zero. */
export function Lantern({ streak }: { streak: number }) {
  const lit = streak > 0;
  const fill = lit ? colors.moon : colors.track;
  return (
    <View accessible accessibilityLabel={`${streak} day streak`} style={styles.row}>
      <Svg width={20} height={26} viewBox="0 0 20 26">
        <Rect x={8} y={0} width={4} height={4} fill={colors.textMuted} />
        <Path d="M4 4h12l2 4v10l-2 4H4l-2-4V8z" fill={fill} />
        <Rect x={6} y={22} width={8} height={3} fill={colors.textMuted} />
      </Svg>
      <AppText variant="button" color={lit ? 'moon' : 'textMuted'}>
        {streak}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
