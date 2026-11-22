import { StyleSheet, View } from 'react-native';
import type { AvatarId } from '@luna/shared';
import { YokaiMask } from '../art/YokaiMask';
import { colors } from '../theme';

type Props = { id: AvatarId; size?: number };

/**
 * A player's mask on a round lacquer-wood plate: the compact form used in rows and headers.
 * Scenes draw `YokaiMask` directly, without the plate.
 */
export function YokaiAvatar({ id, size = 64 }: Props) {
  return (
    <View
      style={[styles.plate, { width: size, height: size, borderRadius: size / 2 }]}
      accessible
      accessibilityLabel={`${id} mask`}
    >
      <YokaiMask id={id} size={size * 0.82} />
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { backgroundColor: colors.wood, alignItems: 'center', justifyContent: 'center' },
});
