import { useWindowDimensions } from 'react-native';
import { layout } from '../theme';

/**
 * Scenes are drawn on a 390-wide grid (DESIGN.md: Layout) and scale to the screen width.
 * `u(n)` turns grid units into points for the current screen.
 */
export function useSceneScale(): { scale: number; u: (n: number) => number; width: number } {
  const { width } = useWindowDimensions();
  const scale = width / layout.sceneWidth;
  return { scale, width, u: (n: number) => n * scale };
}

/**
 * The Dojo room: the grid height wanted, and the shortest the floor band may shrink to. Below
 * `minHeight` the table would float above the floor line, so shorter screens scale the whole room
 * down instead (see the Dojo screen).
 */
export const DOJO = {
  height: 714,
  minHeight: 656,
  /** Where the tatami floor starts; everything above is the back wall. */
  floorY: 460,
  /** The low table's top edge, measured up from the bottom of the room. */
  tableFromBottom: 166,
} as const;

/** Positions of the Dojo's interactive objects on the grid (top-left x, y, width, height). */
export const DOJO_ANCHORS = {
  scroll: { x: 24, y: 86, w: 72, h: 224 },
  window: { x: 112, y: 78, w: 168, h: 178 },
  lantern: { x: 282, y: 40, w: 88, h: 252 },
  mask: { x: 150, y: 250, w: 92, h: 156 },
  ema: { x: 18, y: 362, w: 68, h: 88 },
} as const;
