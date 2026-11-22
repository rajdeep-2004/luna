import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import type { AvatarId } from '@luna/shared';
import { colors } from '../theme';
import { YokaiMask } from './YokaiMask';

type Props = { avatarId: AvatarId; width: number };

/** The player's mask resting on a wooden stand under the window: the master is home. 92 × 156 grid. */
export function MaskStand({ avatarId, width }: Props) {
  const s = width / 92;
  return (
    <View style={{ width, height: 156 * s }}>
      <Svg width={width} height={156 * s} viewBox="0 0 92 156" style={{ position: 'absolute' }}>
        <Rect x={32} y={100} width={28} height={46} fill={colors.wood} />
        <Rect x={16} y={146} width={60} height={8} fill={colors.tatami} />
      </Svg>
      <YokaiMask id={avatarId} size={92 * s} />
    </View>
  );
}
