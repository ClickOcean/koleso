import tinycolor from 'tinycolor2';

import type { WheelItem } from '@models/wheel.model';

/** Beer styles the sectors are poured as */
export type Brew = 'lager' | 'amber' | 'copper' | 'stout' | 'foam';

export interface SliceColors {
  fill: string;
  sheen: string;
  shade: string;
  /** Dark glyphs read better than cream ones on this fill */
  isLight: boolean;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

interface Tone {
  hue: number;
  s: number;
  l: number;
  /** Lightness added per variant so neighbouring glasses of one brew still differ */
  step: number;
  /** Lightness of the highlighted sector while the others are greyed out */
  lit: number;
}

const VARIANTS = 3;
/** Below this saturation an input color is the base wheel's greyscale (another sector is highlighted) */
const GREY_THRESHOLD = 0.05;
/** How much of the participant's own hue bleeds into the brew, so two lagers are not identical */
const HUE_PULL = 0.04;
/** Fills at or above this lightness get dark brown glyphs */
const LIGHT_FILL = 0.44;

const BREWS: Record<Brew, Tone> = {
  lager: { hue: 45, s: 0.9, l: 0.47, step: 0.07, lit: 0.6 },
  amber: { hue: 32, s: 0.85, l: 0.38, step: 0.07, lit: 0.53 },
  copper: { hue: 20, s: 0.72, l: 0.29, step: 0.06, lit: 0.46 },
  stout: { hue: 24, s: 0.5, l: 0.12, step: 0.06, lit: 0.34 },
  foam: { hue: 42, s: 0.6, l: 0.74, step: 0.06, lit: 0.86 },
};

/** Ten 36° hue bands cycle through the brews twice, so a rainbow roster keeps alternating light and dark glasses */
const BREW_BY_BAND: Brew[] = ['lager', 'amber', 'copper', 'stout', 'foam', 'lager', 'amber', 'copper', 'stout', 'foam'];

const normalizeHue = (hue: number): number => ((hue % 360) + 360) % 360;

const shortestHueDelta = (from: number, to: number): number => ((to - from + 540) % 360) - 180;

export const brewFromHue = (hue: number): Brew =>
  BREW_BY_BAND[Math.floor(normalizeHue(hue) / 36) % BREW_BY_BAND.length];

export const isGreyscale = (color: string): boolean => tinycolor(color).toHsl().s < GREY_THRESHOLD;

const buildSlice = ({ h, s, l }: Hsl): SliceColors => {
  const hue = normalizeHue(h);

  return {
    fill: tinycolor({ h: hue, s, l }).toHexString(),
    sheen: tinycolor({ h: hue, s: Math.min(1, s + 0.05), l: Math.min(1, l + 0.09) }).toHexString(),
    shade: tinycolor({ h: hue, s, l: Math.max(0, l - 0.07) }).toHexString(),
    isLight: l >= LIGHT_FILL,
  };
};

/**
 * Lightness variants in wheel order: 0, 1, 2, 0, ... so neighbours always differ, and the
 * last sector is bumped when it would otherwise match the first one across the seam.
 */
export const brewVariants = (count: number): number[] => {
  const variants = Array.from({ length: count }, (_, index) => index % VARIANTS);

  if (count > 1 && variants[count - 1] === variants[0]) {
    const previous = variants[count - 2];
    const candidate = (previous + 1) % VARIANTS;
    variants[count - 1] = candidate === variants[0] ? (previous + 2) % VARIANTS : candidate;
  }

  return variants;
};

/**
 * Maps a participant color onto a beer. The hue picks the brew, the variant nudges the
 * lightness. Greyscale input (the base wheel greys the other sectors while one is
 * highlighted) becomes flat stale beer; with `spotlight` on, the coloured sector is
 * poured brighter than any greyed glass so it always reads as the lit one.
 */
export const toBeerColor = (color: string, variant: number, spotlight: boolean): SliceColors => {
  const hsl = tinycolor(color).toHsl();

  if (hsl.s < GREY_THRESHOLD) {
    return buildSlice({ h: 32, s: 0.07, l: 0.11 + hsl.l * 0.06 });
  }

  const tone = BREWS[brewFromHue(hsl.h)];
  const hue = tone.hue + shortestHueDelta(tone.hue, normalizeHue(hsl.h)) * HUE_PULL;

  return buildSlice({ h: hue, s: tone.s, l: spotlight ? tone.lit : tone.l + variant * tone.step });
};

export interface SectorPalette {
  /** Call from `beforeDraw`: fixes the lightness variants for the sectors of this pass */
  beginPass(items: WheelItem[]): void;
  /** Colors of one sector; `getColor` is the base wheel's resolver (grey for every sector but the highlighted one) */
  colorsFor(item: WheelItem, getColor: (item: WheelItem) => string): SliceColors;
  /** Whether the sector was last poured light; `drawText` has no color resolver of its own */
  isLightFor(id: WheelItem['id']): boolean;
}

/**
 * Variants are assigned by sector order, so the layout is recomputed whenever the
 * roster (or its order) changes. The dropout animation redraws just the two sectors
 * next to the removed one; that partial pass keeps the current layout so they
 * collapse in the colors they already had.
 */
export const createSectorPalette = (): SectorPalette => {
  const variants = new Map<WheelItem['id'], number>();
  const poured = new Map<WheelItem['id'], SliceColors>();
  let signature = '';
  let passItems: WheelItem[] = [];
  let spotlight: boolean | null = null;

  const assign = (items: WheelItem[]) => {
    const nextSignature = items.map((item) => String(item.id)).join('|');
    if (nextSignature === signature) {
      return;
    }

    const isPartial = items.length === 2 && variants.size > 2 && items.every((item) => variants.has(item.id));
    if (isPartial) {
      return;
    }

    const layout = brewVariants(items.length);
    variants.clear();
    items.forEach((item, index) => variants.set(item.id, layout[index]));
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

      const colors = toBeerColor(getColor(item), variants.get(item.id) ?? 0, spotlight);
      poured.set(item.id, colors);

      return colors;
    },
    isLightFor(id) {
      return poured.get(id)?.isLight ?? false;
    },
  };
};
