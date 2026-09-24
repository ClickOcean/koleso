import { createImageAsset } from '../beerParty/imageAsset';

import {
  CAT_RING_EXTENT,
  CAT_RING_INNER,
  TW_ASSETS,
  TW_GOLD,
  TW_GOLD_DARK,
  TW_GOLD_LIGHT,
  TW_RED,
  TW_RED_DEEP,
} from './taiwanTokens';

import type { WheelPartLayout } from '@domains/wheel/BaseWheel/parts/types';

export const catRingAsset = createImageAsset(TW_ASSETS.catRing);

/** Red lacquer band with gold edges where the cats would lie: what shows until the photo arrives */
const drawFallbackRim = (ctx: CanvasRenderingContext2D, layout: WheelPartLayout): void => {
  const { center, wheelRadius, scale } = layout;
  const inner = wheelRadius * CAT_RING_INNER;

  const band = ctx.createRadialGradient(center, center, inner, center, center, wheelRadius);
  band.addColorStop(0, TW_RED_DEEP);
  band.addColorStop(0.5, TW_RED);
  band.addColorStop(1, TW_RED_DEEP);

  ctx.save();
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.arc(center, center, wheelRadius, 0, 2 * Math.PI);
  ctx.arc(center, center, inner, 0, 2 * Math.PI, true);
  ctx.fill();

  const gold = ctx.createLinearGradient(
    center - wheelRadius,
    center - wheelRadius,
    center + wheelRadius,
    center + wheelRadius,
  );
  gold.addColorStop(0, TW_GOLD_LIGHT);
  gold.addColorStop(0.5, TW_GOLD);
  gold.addColorStop(1, TW_GOLD_DARK);
  ctx.strokeStyle = gold;
  [inner + 3 * scale, wheelRadius - 3 * scale].forEach((radius) => {
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.stroke();
  });
  ctx.restore();
};

/**
 * Draws the rim of sleeping cats over the sectors, into the cached wheel canvas, so the cats spin
 * with the wheel. The picture is centred on the wheel and spans `CAT_RING_EXTENT` radii, so the
 * kittens that peek over the edge are not cut off.
 */
export const drawCatRing = (
  ctx: CanvasRenderingContext2D,
  layout: WheelPartLayout,
  image: HTMLImageElement | null,
): void => {
  if (!image) {
    drawFallbackRim(ctx, layout);

    return;
  }

  const radius = layout.wheelRadius * CAT_RING_EXTENT;
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, layout.center - radius, layout.center - radius, radius * 2, radius * 2);
  ctx.restore();
};
