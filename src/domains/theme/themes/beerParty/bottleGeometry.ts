import { BOTTLE_DIP, BOTTLE_PROTRUSION_MAX, BOTTLE_PROTRUSION_RATIO } from './beerPartyTokens';

import type { WheelPartLayout } from '@domains/wheel/BaseWheel/parts/types';

export interface BottleGeometry {
  /** How far the bottle base rises above the top of the wheel box, px */
  protrusion: number;
  /** How far the crown cap dips below the top of the wheel box (past the wheel edge), px */
  dip: number;
  /** Full bottle height from base to cap tip, px */
  height: number;
}

/**
 * The bottle hangs cap-down over the rim: the base rises into the title gap by at most
 * ~0.08 of the wheel size (never more than 64 px, the gap is 72 px), and the cap overlaps
 * the wood counter and the beer edge by a few px. Shared by the photo and the drawn pointer
 * so swapping one for the other does not move the bottle.
 */
export const bottleGeometry = (layout: WheelPartLayout): BottleGeometry => {
  const protrusion = Math.min(BOTTLE_PROTRUSION_MAX, Math.round(layout.targetWheelSize * BOTTLE_PROTRUSION_RATIO));
  const dip = Math.round(layout.scale * BOTTLE_DIP);

  return { protrusion, dip, height: protrusion + dip };
};
