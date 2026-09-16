import tinycolor from 'tinycolor2';

export const PIXEL_FONT = '"Lucida Console", Monaco, "Courier New", Courier, monospace';

/** One source pixel for the outline plus one of breathing room */
const PADDING = 2;
/**
 * Anti-aliased coverage above this counts as a solid glyph pixel. High enough that
 * the faint half-covered pixels along a stem do not merge two strokes into a blob.
 */
const ALPHA_THRESHOLD = 120;
const CACHE_LIMIT = 300;
/** Upscale factor and source font size for a 800px wheel */
const REFERENCE_PIXEL = 2;
const REFERENCE_FONT_SIZE = 20;
/** Below this the glyph counters close up even at normal weight */
const MIN_FONT_SIZE = 10;

export interface PixelTextMetrics {
  /** Integer upscale factor: every sprite pixel becomes a `pixel` x `pixel` block on the canvas */
  pixel: number;
  /** Source font size in sprite pixels */
  fontSize: number;
}

/**
 * Sprite sizing for a wheel with the given `layout.scale`. The upscale factor is an
 * integer so all sprite pixels stay the same size; the source size is floored so
 * the drawn glyphs never exceed 20px per 800px of wheel, the width the sector text
 * geometry is proven for with 24-character labels (rounding up would push a long
 * label under the core image on 1000px wheels). Below 800px the factor is 1 and
 * the text is crisp aliased glyphs rather than blocks.
 */
export const getPixelTextMetrics = (scale: number): PixelTextMetrics => {
  const pixel = Math.max(1, Math.floor(scale * REFERENCE_PIXEL));
  const fontSize = Math.max(MIN_FONT_SIZE, Math.floor((scale * REFERENCE_FONT_SIZE) / pixel));

  return { pixel, fontSize };
};

export interface PixelTextOptions {
  /** Font size in sprite pixels; keep it small, the sprite is meant to be upscaled without smoothing */
  fontSize: number;
  fill: string;
  outline: string;
}

export interface PixelTextSprite {
  canvas: HTMLCanvasElement;
  /** Sprite size including the outline padding, in sprite pixels */
  width: number;
  height: number;
  /** Advance width of the glyph run without padding, in sprite pixels */
  textWidth: number;
  padding: number;
}

const cache = new Map<string, PixelTextSprite>();

const toRgb = (color: string): [number, number, number] => {
  const { r, g, b } = tinycolor(color).toRgb();

  return [r, g, b];
};

const hasSolidNeighbour = (mask: Uint8Array, x: number, y: number, width: number, height: number): boolean => {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }
      if (mask[ny * width + nx]) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Renders text at a tiny size, snaps every pixel to either solid or empty and
 * grows a one pixel outline around the glyphs. Drawn scaled up with
 * `imageSmoothingEnabled = false` the result reads as a bitmap font.
 * Sprites are cached by text and style; returns null when canvas is unavailable.
 */
export const renderPixelText = (text: string, options: PixelTextOptions): PixelTextSprite | null => {
  const key = `${options.fontSize}|${options.fill}|${options.outline}|${text}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  // normal weight: the monospace faces have no real bold, and the synthesised
  // double-strike fills the counters at these sizes. The outline gives the heft.
  const font = `normal ${options.fontSize}px ${PIXEL_FONT}`;
  ctx.font = font;
  const textWidth = Math.ceil(ctx.measureText(text).width);
  const width = textWidth + PADDING * 2;
  const height = Math.ceil(options.fontSize * 1.4) + PADDING * 2;
  canvas.width = width;
  canvas.height = height;

  // resizing resets the context state
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, PADDING, Math.floor(height / 2));

  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const mask = new Uint8Array(width * height);
  for (let index = 0; index < mask.length; index++) {
    mask[index] = data[index * 4 + 3] >= ALPHA_THRESHOLD ? 1 : 0;
  }

  const fill = toRgb(options.fill);
  const outline = toRgb(options.outline);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const offset = index * 4;
      const color = mask[index] ? fill : hasSolidNeighbour(mask, x, y, width, height) ? outline : null;

      if (color) {
        data[offset] = color[0];
        data[offset + 1] = color[1];
        data[offset + 2] = color[2];
        data[offset + 3] = 255;
      } else {
        data[offset + 3] = 0;
      }
    }
  }
  ctx.putImageData(image, 0, 0);

  const sprite: PixelTextSprite = { canvas, width, height, textWidth, padding: PADDING };
  if (cache.size >= CACHE_LIMIT) {
    cache.clear();
  }
  cache.set(key, sprite);

  return sprite;
};
