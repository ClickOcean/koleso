import type { WheelPartLayout } from './types';

export interface FitSectorTextOptions {
  /** Where the label must end, as a fraction of the wheel radius (leave room for the rim) */
  outerRatio?: number;
  /** Where the label may start at the earliest (hub + margin), as a fraction of the wheel radius */
  innerRatio?: number;
  /** Smallest allowed font size in unscaled px (multiplied by layout.scale) */
  minFontPx?: number;
}

export interface SectorTextPlacement {
  /** Distance from the wheel center where the label starts (left edge with textAlign 'left') */
  startRadius: number;
  width: number;
  fontPx: number;
}

const FONT_SIZE_PATTERN = /(\d+(?:\.\d+)?)px/;

/**
 * Places a sector label along the radius so that it never runs into the rim:
 * the label is right-aligned to `outerRatio * wheelRadius`, and when it is wider
 * than the space between `innerRatio` and `outerRatio` the current `ctx.font`
 * is shrunk (only its px size changes) down to `minFontPx`.
 *
 * Call after `ctx.font` is set and before translating/rotating; draw with
 * `textAlign = 'left'` at x = 0 after translating to `startRadius` along the sector angle.
 */
export const fitSectorText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  layout: WheelPartLayout,
  { outerRatio = 0.9, innerRatio = 0.3, minFontPx = 10 }: FitSectorTextOptions = {},
): SectorTextPlacement => {
  const outer = layout.wheelRadius * outerRatio;
  const available = Math.max(1, layout.wheelRadius * (outerRatio - innerRatio));
  const match = ctx.font.match(FONT_SIZE_PATTERN);
  let fontPx = match ? parseFloat(match[1]) : 16;
  let width = ctx.measureText(text).width;

  if (width > available && match) {
    const minPx = Math.max(6, minFontPx * layout.scale);
    fontPx = Math.max(minPx, fontPx * (available / width));
    ctx.font = ctx.font.replace(FONT_SIZE_PATTERN, `${fontPx.toFixed(2)}px`);
    width = ctx.measureText(text).width;
  }

  return { startRadius: outer - width, width, fontPx };
};
