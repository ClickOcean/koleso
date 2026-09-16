import tinycolor from 'tinycolor2';

import type { WheelItem } from '@models/wheel.model';

/** Roulette pocket families the sectors are mapped onto */
export type Family = 'red' | 'black' | 'green';

/** What a sector renders as: its family plus a lightness variant that cycles within the family */
export interface Pocket {
  family: Family;
  variant: number;
}

export interface SliceColors {
  fill: string;
  sheen: string;
  shade: string;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** How a family renders: the felt hue is pulled `pull` of the way from `hue` towards the participant's own hue */
interface Tone {
  hue: number;
  pull: number;
  s: number;
  l: number;
  /** Lightness added per variant so consecutive pockets of one family still differ */
  step: number;
}

/** Every Nth pocket is green, like the zero on a roulette wheel */
const GREEN_EVERY = 6;
const VARIANTS = 4;
/** Below this saturation an input color is the base wheel's greyscale (another sector is highlighted) */
const GREY_THRESHOLD = 0.05;

/** Felt colors in normal mode; `pull: 1` keeps the participant's own hue as the tint of the black pockets */
const FELT: Record<Family, Tone> = {
  red: { hue: 352, pull: 0.08, s: 0.72, l: 0.23, step: 0.045 },
  black: { hue: 0, pull: 1, s: 0.2, l: 0.08, step: 0.045 },
  green: { hue: 150, pull: 0.1, s: 0.55, l: 0.16, step: 0.045 },
};

/** The highlighted sector while the others are greyed: brighter than any felt, black becomes warm lit charcoal */
const LIT: Record<Family, Tone> = {
  red: { hue: 352, pull: 0.08, s: 0.86, l: 0.44, step: 0 },
  black: { hue: 38, pull: 0.08, s: 0.16, l: 0.36, step: 0 },
  green: { hue: 150, pull: 0.1, s: 0.66, l: 0.38, step: 0 },
};

const normalizeHue = (hue: number): number => ((hue % 360) + 360) % 360;

const shortestHueDelta = (from: number, to: number): number => ((to - from + 540) % 360) - 180;

const toneHue = (tone: Tone, hue: number): number => tone.hue + shortestHueDelta(tone.hue, hue) * tone.pull;

const buildSlice = ({ h, s, l }: Hsl): SliceColors => {
  const hue = normalizeHue(h);

  return {
    fill: tinycolor({ h: hue, s, l }).toHexString(),
    sheen: tinycolor({ h: hue, s, l: Math.min(1, l + 0.07) }).toHexString(),
    shade: tinycolor({ h: hue, s, l: Math.max(0, l - 0.05) }).toHexString(),
  };
};

export const isGreyscale = (color: string): boolean => tinycolor(color).toHsl().s < GREY_THRESHOLD;

/**
 * Pocket layout for `count` sectors in wheel order: red and black alternate, every
 * GREEN_EVERY-th pocket is green, and an odd count ends on green so the wrap-around
 * pair (last, first) never shares a family. Neighbouring sectors therefore always differ.
 */
export const rouletteFamilies = (count: number): Family[] => {
  const families: Family[] = [];

  for (let index = 0; index < count; index++) {
    families.push((index + 1) % GREEN_EVERY === 0 ? 'green' : index % 2 === 0 ? 'red' : 'black');
  }

  if (count > 2 && count % 2 === 1) {
    families[count - 1] = 'green';
    if (families[count - 2] === 'green') {
      // count - 2 is odd, so black keeps it apart from the red pocket before it
      families[count - 2] = 'black';
    }
  }

  return families;
};

/** Families in wheel order, each with the variant cycling through its own family's pockets */
export const roulettePockets = (count: number): Pocket[] => {
  const seen: Record<Family, number> = { red: 0, black: 0, green: 0 };

  return rouletteFamilies(count).map((family) => ({ family, variant: seen[family]++ % VARIANTS }));
};

/** Only for a sector drawn without a preceding beforeDraw; the base wheel never does that */
const pocketFromHue = (color: string): Pocket => {
  const hue = normalizeHue(tinycolor(color).toHsl().h);

  if (hue < 40 || hue >= 320) {
    return { family: 'red', variant: 0 };
  }

  return { family: hue >= 90 && hue < 170 ? 'green' : 'black', variant: 0 };
};

/**
 * Maps a participant color onto its roulette pocket, keeping the original hue only
 * as a tint. Greyscale input (the base wheel greys the other sectors while one is
 * highlighted) sinks into unlit felt; with `spotlight` on, the coloured sector is
 * lit well above that so it always reads as the brightest pocket.
 */
export const toCasinoColor = (color: string, { family, variant }: Pocket, spotlight: boolean): SliceColors => {
  const hsl = tinycolor(color).toHsl();

  if (hsl.s < GREY_THRESHOLD) {
    return buildSlice({ h: 0, s: 0.02, l: 0.045 + hsl.l * 0.03 });
  }

  const tone = spotlight ? LIT[family] : FELT[family];

  return buildSlice({ h: toneHue(tone, normalizeHue(hsl.h)), s: tone.s, l: tone.l + variant * tone.step });
};

export interface SectorPalette {
  /** Call from `beforeDraw`: fixes the pocket layout for the sectors of this pass */
  beginPass(items: WheelItem[]): void;
  /** Colors of one sector; `getColor` is the base wheel's resolver (grey for every sector but the highlighted one) */
  colorsFor(item: WheelItem, getColor: (item: WheelItem) => string): SliceColors;
}

/**
 * Pockets are assigned by sector order, so the layout is recomputed whenever the
 * roster (or its order) changes. The dropout animation redraws just the two sectors
 * next to the removed one; that partial pass keeps the current layout so they
 * collapse in the colors they already had.
 */
export const createSectorPalette = (): SectorPalette => {
  const pockets = new Map<WheelItem['id'], Pocket>();
  let signature = '';
  let passItems: WheelItem[] = [];
  let spotlight: boolean | null = null;

  const assign = (items: WheelItem[]) => {
    const nextSignature = items.map((item) => String(item.id)).join('\u0000');
    if (nextSignature === signature) {
      return;
    }

    const isPartial = items.length === 2 && pockets.size > 2 && items.every((item) => pockets.has(item.id));
    if (isPartial) {
      return;
    }

    const layout = roulettePockets(items.length);
    pockets.clear();
    items.forEach((item, index) => pockets.set(item.id, layout[index]));
    signature = nextSignature;
  };

  return {
    beginPass(items) {
      passItems = items;
      spotlight = null;
      assign(items);
    },
    colorsFor(item, getColor) {
      if (spotlight === null) {
        spotlight = passItems.some((other) => isGreyscale(getColor(other)));
      }

      const color = getColor(item);

      return toCasinoColor(color, pockets.get(item.id) ?? pocketFromHue(color), spotlight);
    },
  };
};
