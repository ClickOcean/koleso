import tinycolor from 'tinycolor2';

import type { WheelItem } from '@models/wheel.model';

/** Satin families the sectors are mapped onto: ivory and black alternate, gold breaks an odd count */
export type Family = 'ivory' | 'black' | 'gold';

/** Glyph treatment chosen by satin family: gold glyphs on black, charcoal on ivory and gold */
export type TextStyle = 'charcoal' | 'gold' | 'muted';

export interface SliceColors {
  family: Family;
  fill: string;
  sheen: string;
  edge: string;
  /** Participant hue as a jewel tone for the inlay band under the sunburst rays */
  tint: string;
  text: TextStyle;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Below this saturation an input color is the base wheel's greyscale (another sector is highlighted) */
const GREY_THRESHOLD = 0.05;

/** Satin fills in normal mode; the participant hue never enters them */
const SATIN: Record<Family, Hsl> = {
  ivory: { h: 40, s: 0.55, l: 0.88 },
  black: { h: 30, s: 0.16, l: 0.08 },
  gold: { h: 43, s: 0.68, l: 0.47 },
};

/** Every sector but the highlighted one sinks into unlit satin */
const DIMMED: Record<Family, Hsl> = {
  ivory: { h: 40, s: 0.04, l: 0.28 },
  black: { h: 30, s: 0.02, l: 0.06 },
  gold: { h: 43, s: 0.06, l: 0.17 },
};

/** The highlighted sector reads brighter than any dimmed one; black becomes lamp-lit charcoal */
const LIT: Record<Family, Hsl> = {
  ivory: { h: 40, s: 0.6, l: 0.95 },
  black: { h: 38, s: 0.14, l: 0.36 },
  gold: { h: 43, s: 0.8, l: 0.6 },
};

const hex = ({ h, s, l }: Hsl): string => tinycolor({ h, s, l: Math.min(1, Math.max(0, l)) }).toHexString();

/**
 * Only black satin (unlit or lamp-lit) carries the gold glyphs. The gold family is
 * itself a mid-tone gold, so like ivory it takes the charcoal glyphs with the ivory outline.
 */
const textFor = (family: Family, dimmed: boolean): TextStyle => {
  if (dimmed) {
    return 'muted';
  }

  return family === 'black' ? 'gold' : 'charcoal';
};

export const isGreyscale = (color: string): boolean => tinycolor(color).toHsl().s < GREY_THRESHOLD;

/**
 * Family layout for `count` sectors in wheel order: ivory and black alternate and an odd
 * count ends on gold, so the wrap-around pair (last, first) never shares a family.
 */
export const sectorFamilies = (count: number): Family[] => {
  const families: Family[] = Array.from({ length: count }, (_, index) => (index % 2 === 0 ? 'ivory' : 'black'));

  if (count > 2 && count % 2 === 1) {
    families[count - 1] = 'gold';
  }

  return families;
};

/**
 * Maps a participant color onto its satin family. The hue survives only in `tint`,
 * the inlay band near the rim. Greyscale input (the base wheel greys the other sectors
 * while one is highlighted) is dimmed; with `spotlight` on, the coloured sector is lit.
 */
export const toSatinColors = (color: string, family: Family, spotlight: boolean): SliceColors => {
  const hsl = tinycolor(color).toHsl();
  const grey = hsl.s < GREY_THRESHOLD;
  const dimmed = spotlight && grey;
  const base = dimmed ? DIMMED[family] : spotlight ? LIT[family] : SATIN[family];
  const range = family === 'black' ? 0.06 : 0.08;

  const tint: Hsl = dimmed
    ? { h: 0, s: 0.02, l: 0.12 }
    : grey
    ? { h: 40, s: 0.08, l: 0.22 }
    : spotlight
    ? { h: hsl.h, s: 0.7, l: 0.44 }
    : { h: hsl.h, s: 0.52, l: 0.3 };

  return {
    family,
    fill: hex(base),
    sheen: hex({ ...base, l: base.l + range }),
    edge: hex({ ...base, l: base.l - range }),
    tint: hex(tint),
    text: textFor(family, dimmed),
  };
};

export interface SectorPalette {
  /** Call from `beforeDraw`: fixes the family layout for the sectors of this pass */
  beginPass(items: WheelItem[]): void;
  /** Colors of one sector; `getColor` is the base wheel's resolver (grey for every sector but the highlighted one) */
  colorsFor(item: WheelItem, getColor: (item: WheelItem) => string): SliceColors;
  /** Glyph style resolved by the last `colorsFor` call for this sector (text is drawn after every slice) */
  textFor(item: WheelItem): TextStyle;
}

/**
 * Families are assigned by sector order, so the layout is recomputed whenever the
 * roster (or its order) changes. The dropout animation redraws just the two sectors
 * next to the removed one; that partial pass keeps the current layout so they
 * collapse in the colors they already had.
 */
export const createSectorPalette = (): SectorPalette => {
  const families = new Map<WheelItem['id'], Family>();
  const resolved = new Map<WheelItem['id'], SliceColors>();
  let signature = '';
  let passItems: WheelItem[] = [];
  let spotlight: boolean | null = null;

  const assign = (items: WheelItem[]) => {
    const nextSignature = JSON.stringify(items.map((item) => item.id));
    if (nextSignature === signature) {
      return;
    }

    const isPartial = items.length === 2 && families.size > 2 && items.every((item) => families.has(item.id));
    if (isPartial) {
      return;
    }

    const layout = sectorFamilies(items.length);
    families.clear();
    items.forEach((item, index) => families.set(item.id, layout[index]));
    signature = nextSignature;
  };

  const familyOf = (item: WheelItem): Family => {
    const known = families.get(item.id);
    if (known) {
      return known;
    }

    // only for a sector drawn without a preceding beforeDraw; the base wheel never does that
    return passItems.indexOf(item) % 2 === 0 ? 'ivory' : 'black';
  };

  return {
    beginPass(items) {
      passItems = items;
      spotlight = null;
      assign(items);
    },
    colorsFor(item, getColor) {
      if (spotlight === null) {
        // highlight mode greys every sector but one; a single grey participant is not a spotlight
        const greyCount = passItems.filter((other) => isGreyscale(getColor(other))).length;
        spotlight = passItems.length >= 2 && greyCount >= passItems.length - 1;
      }

      const colors = toSatinColors(getColor(item), familyOf(item), spotlight);
      resolved.set(item.id, colors);

      return colors;
    },
    textFor(item) {
      return resolved.get(item.id)?.text ?? 'charcoal';
    },
  };
};
