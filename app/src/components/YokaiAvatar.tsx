import type { ReactNode } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { AvatarId } from '@luna/shared';
import { colors } from '../theme';

/**
 * Eight yokai masks, drawn on a 64x64 grid with the app's own palette (no borders, one accent).
 * Each mask is a face shape plus a few features, so they stay light and crisp at any size.
 */
const stroke = {
  stroke: colors.bg,
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  fill: 'none',
};
const eyes = (y = 30) => (
  <>
    <Circle cx={24} cy={y} r={3} fill={colors.bg} />
    <Circle cx={40} cy={y} r={3} fill={colors.bg} />
  </>
);

const MASKS: Record<AvatarId, ReactNode> = {
  kitsune: (
    <>
      <Path d="M10 8l14 10h16L54 8l-4 28-18 20-18-20z" fill={colors.moon} />
      <Path d="M20 30l6 3M44 30l-6 3M28 46h8" {...stroke} />
    </>
  ),
  tanuki: (
    <>
      <Circle cx={14} cy={14} r={7} fill={colors.textSoft} />
      <Circle cx={50} cy={14} r={7} fill={colors.textSoft} />
      <Circle cx={32} cy={34} r={22} fill={colors.textSoft} />
      <Path d="M16 30q8-6 8 2M48 30q-8-6-8 2" {...stroke} />
      <Circle cx={32} cy={38} r={3} fill={colors.bg} />
    </>
  ),
  oni: (
    <>
      <Path d="M14 18L18 4l8 12M50 18L46 4l-8 12" fill={colors.emberSoft} />
      <Circle cx={32} cy={34} r={22} fill={colors.emberSoft} />
      <Path d="M18 26l8 4M46 26l-8 4M22 46l4-4 6 4 6-4 4 4" {...stroke} />
    </>
  ),
  tengu: (
    <>
      <Circle cx={30} cy={32} r={22} fill={colors.textSoft} />
      <Path d="M32 34h22l-22 8z" fill={colors.emberSoft} />
      <Path d="M14 22l10 4M42 22l-8 4" {...stroke} />
      <Circle cx={24} cy={32} r={3} fill={colors.bg} />
    </>
  ),
  neko: (
    <>
      <Path d="M10 24V6l14 10h16L54 6v18l-4 20-18 10-18-10z" fill={colors.moon} />
      <Path d="M22 34v-2M42 34v-2M32 40l-4 4M32 40l4 4M14 40l8-2M50 40l-8-2" {...stroke} />
    </>
  ),
  ryu: (
    <>
      <Path d="M10 10l12 8h20l12-8-4 22-18 24-18-24z" fill={colors.textSoft} />
      <Path d="M18 30l8 4M46 30l-8 4M26 46q6 4 12 0" {...stroke} />
    </>
  ),
  usagi: (
    <>
      <Path d="M18 28V4l10 24M46 28V4L36 28" fill={colors.textSoft} />
      <Circle cx={32} cy={38} r={20} fill={colors.textSoft} />
      {eyes(36)}
      <Path d="M30 44l2 2 2-2" {...stroke} />
    </>
  ),
  kappa: (
    <>
      <Circle cx={32} cy={36} r={22} fill={colors.moonDeep} />
      <Path d="M16 20q16-14 32 0z" fill={colors.surfaceRaised} />
      {eyes(34)}
      <Path d="M24 46h16l-8 6z" fill={colors.bg} />
    </>
  ),
};

type Props = { id: AvatarId; size?: number };

export function YokaiAvatar({ id, size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel={`${id} avatar`}>
      <Circle cx={32} cy={32} r={32} fill={colors.surfaceRaised} />
      {MASKS[id]}
    </Svg>
  );
}
