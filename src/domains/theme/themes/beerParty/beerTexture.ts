import { createImageAsset, useImageAsset } from './imageAsset';

/**
 * Macro photo of backlit lager filling the frame (1024 × 1024): rising carbonation, bubble
 * clusters and swirls. The wheel lays it over every sector so the beer has real grain instead
 * of a flat gradient. Missing file — the sectors stay purely procedural.
 */
export const BEER_TEXTURE = '/themes/beerParty/beer.jpg';

export const beerTexture = createImageAsset(BEER_TEXTURE);

export const useBeerTexture = (): HTMLImageElement | null => useImageAsset(beerTexture);

/**
 * The photo is golden, but sectors are poured in four brews — and while one is highlighted the
 * rest are greyed out by the base wheel. Blending the colour photo in would paint the gold back
 * onto them, so only its luminance is used: the picture supplies texture, the palette the colour.
 */
const CONTRAST = 0.9;
/** Luminance canvases are cached per rounded size, so a draw pass builds at most one */
const SIZE_STEP = 64;
const MAX_SIZE = 1024;
/** The mean is measured on a thumbnail this wide; the average does not need every pixel */
const SAMPLE_SIZE = 64;

let cached: { size: number; canvas: HTMLCanvasElement } | null = null;

/** Mean brightness of a greyscale canvas, 0..1 */
const meanBrightness = (canvas: HTMLCanvasElement): number => {
  const sample = document.createElement('canvas');
  sample.width = SAMPLE_SIZE;
  sample.height = SAMPLE_SIZE;
  const ctx = sample.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return 0.5;
  }

  ctx.drawImage(canvas, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  let total = 0;
  for (let index = 0; index < data.length; index += 4) {
    total += data[index];
  }

  return total / (data.length / 4) / 255;
};

/**
 * Greyscale, contrast-softened copy of the beer photo, sized to the wheel. Built once per size:
 * the wheel canvas redraws every sector in one pass, and rebuilding this per sector would cost
 * a full repaint each time.
 */
export const beerLuminance = (image: HTMLImageElement, diameter: number): HTMLCanvasElement | null => {
  const size = Math.min(MAX_SIZE, Math.max(SIZE_STEP, Math.ceil(diameter / SIZE_STEP) * SIZE_STEP));
  if (cached?.size === size) {
    return cached.canvas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.drawImage(image, 0, 0, size, size);

  // 'saturation' takes the saturation of the source and the luminosity of what is below:
  // a flat grey source strips the colour and keeps every bubble and swirl
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = 'hsl(0, 0%, 50%)';
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'source-over';

  // soften the contrast a little; at full strength the photo's swirls swallow the sector colour
  ctx.fillStyle = `rgba(128, 128, 128, ${1 - CONTRAST})`;
  ctx.fillRect(0, 0, size, size);

  // 'overlay' leaves the backdrop alone only where the source is exactly mid grey, so re-centre
  // the mean on 0.5. Backlit beer averages far brighter than that, and without this every sector
  // came out lightened — the pale, washed-out wheel instead of texture on top of the poured colour.
  const mean = meanBrightness(canvas);
  if (mean > 0.5) {
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - 0.5 / mean})`;
  } else {
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.5 - mean) / (1 - mean)})`;
  }
  ctx.fillRect(0, 0, size, size);

  cached = { size, canvas };

  return canvas;
};
