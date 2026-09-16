import tinycolor from 'tinycolor2';

/** Flat, saturated cabinet colors ordered by hue; every sector snaps to one of these */
export const ARCADE_PALETTE = [
  '#ff3b3b',
  '#ff6b35',
  '#ff9500',
  '#ffc300',
  '#e8e337',
  '#a8e02a',
  '#3ddc3d',
  '#1fd6a0',
  '#22d3ee',
  '#38a5ff',
  '#4f6dff',
  '#7c5cff',
  '#a855f7',
  '#d946ef',
  '#ff3fb3',
  '#ff5c7a',
];

/** Greys for de-highlighted sectors, darkest first */
export const ARCADE_GREYS = ['#2b2f44', '#454a63', '#5f6582', '#7a80a0'];

export const ARCADE_YELLOW = '#facc15';
export const ARCADE_WHITE = '#fff8e1';
export const ARCADE_OUTLINE = '#0b0f2b';

/** Palette steps between colliding neighbours: co-prime with 16, so it jumps a third of the hue wheel */
export const NUDGE_STEP = 5;
/** How many alternatives a sector tries before giving up on differing from its neighbours */
export const NUDGE_LIMIT = 4;

const PALETTE_HUES = ARCADE_PALETTE.map((hex) => tinycolor(hex).toHsl().h);

const hueDistance = (a: number, b: number): number => {
  const delta = Math.abs(a - b) % 360;

  return delta > 180 ? 360 - delta : delta;
};

export const isGreyish = (color: string): boolean => tinycolor(color).toHsl().s < 0.08;

/** Index of the palette entry closest in hue to the given color */
export const quantizeIndex = (color: string): number => {
  const { h } = tinycolor(color).toHsl();
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  PALETTE_HUES.forEach((hue, index) => {
    const distance = hueDistance(hue, h);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });

  return best;
};

export const paletteIndexWithNudge = (base: number, nudge: number): number =>
  (base + nudge * NUDGE_STEP) % ARCADE_PALETTE.length;

export interface SectorTones {
  /** Flat body color */
  fill: string;
  /** Darker tone for the recessed hub disc */
  shade: string;
}

/**
 * Flat sector colors derived from whatever `getColor` returned. Saturated input
 * snaps to the palette (shifted by `nudge` so neighbours differ); greyscale input,
 * which is what de-highlighted sectors get, stays on the grey ramp.
 */
export const toArcadeTones = (color: string, nudge: number): SectorTones => {
  if (isGreyish(color)) {
    const { l } = tinycolor(color).toHsl();
    const step = Math.min(ARCADE_GREYS.length - 1, Math.floor(l * ARCADE_GREYS.length));
    const fill = ARCADE_GREYS[(step + nudge) % ARCADE_GREYS.length];

    return { fill, shade: tinycolor(fill).darken(7).toHexString() };
  }

  const fill = ARCADE_PALETTE[paletteIndexWithNudge(quantizeIndex(color), nudge)];

  return { fill, shade: tinycolor(fill).darken(14).toHexString() };
};
