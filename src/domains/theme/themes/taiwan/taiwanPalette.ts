import tinycolor from 'tinycolor2';

import type { WheelItem } from '@models/wheel.model';

/** Lacquer families the sectors are mapped onto, repeating in wheel order */
export type Family = 'red' | 'cream' | 'gold';

/** Glyph treatment: cream glyphs on red, ink on cream and gold, muted on dimmed sectors */
export type TextStyle = 'cream' | 'ink' | 'muted';

export interface SliceColors {
  fill: string;
  sheen: string;
  edge: string;
  /** Participant hue as a jewel tone for the thin inlay under the cat ring */
  inlay: string;
  text: TextStyle;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Below this saturation an input color is the base wheel's greyscale (another sector is highlighted) */
const GREY_THRESHOLD = 0.05;
const FAMILY_ORDER: Family[] = ['red', 'cream', 'gold'];

const LACQUER: Record<Family, Hsl> = {
  red: { h: 355, s: 0.78, l: 0.36 },
  cream: { h: 40, s: 0.6, l: 0.86 },
  gold: { h: 42, s: 0.68, l: 0.5 },
};

/** Every sector but the highlighted one sinks into unlit lacquer */
const DIMMED: Record<Family, Hsl> = {
  red: { h: 355, s: 0.06, l: 0.15 },
  cream: { h: 40, s: 0.04, l: 0.3 },
  gold: { h: 42, s: 0.05, l: 0.22 },
};

/** The highlighted sector reads brighter than any dimmed one */
const LIT: Record<Family, Hsl> = {
  red: { h: 355, s: 0.9, l: 0.47 },
  cream: { h: 42, s: 0.8, l: 0.93 },
  gold: { h: 44, s: 0.85, l: 0.6 },
};

const hex = ({ h, s, l }: Hsl): string => tinycolor({ h, s, l: Math.min(1, Math.max(0, l)) }).toHexString();

export const isGreyscale = (color: string): boolean => tinycolor(color).toHsl().s < GREY_THRESHOLD;

/**
 * Red, cream and gold repeat in wheel order. A count one past a multiple of three would
 * put red next to red across the wrap-around, so the last sector turns cream there.
 */
export const sectorFamilies = (count: number): Family[] => {
  const families = Array.from({ length: count }, (_, index) => FAMILY_ORDER[index % FAMILY_ORDER.length]);

  if (count > 3 && count % 3 === 1) {
    families[count - 1] = 'cream';
  }

  return families;
};

/**
 * Maps a participant color onto its lacquer family. The hue survives only in `inlay`.
 * Greyscale input (the base wheel greys the other sectors while one is highlighted) is
 * dimmed; with `spotlight` on, the coloured sector is lit.
 */
const toLacquerColors = (color: string, family: Family, spotlight: boolean): SliceColors => {
  const hsl = tinycolor(color).toHsl();
  const grey = hsl.s < GREY_THRESHOLD;
  const dimmed = spotlight && grey;
  const base = dimmed ? DIMMED[family] : spotlight ? LIT[family] : LACQUER[family];
  const range = family === 'cream' ? 0.06 : 0.09;

  const inlay: Hsl = dimmed
    ? { h: 0, s: 0.02, l: 0.14 }
    : grey
    ? { h: 42, s: 0.3, l: 0.4 }
    : spotlight
    ? { h: hsl.h, s: 0.8, l: 0.52 }
    : { h: hsl.h, s: 0.65, l: 0.42 };

  return {
    fill: hex(base),
    sheen: hex({ ...base, l: base.l + range }),
    edge: hex({ ...base, l: base.l - range }),
    inlay: hex(inlay),
    text: dimmed ? 'muted' : family === 'red' ? 'cream' : 'ink',
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
 * next to the removed one; that partial pass keeps the current layout.
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

      const family = families.get(item.id) ?? FAMILY_ORDER[Math.max(0, passItems.indexOf(item)) % FAMILY_ORDER.length];
      const colors = toLacquerColors(getColor(item), family, spotlight);
      resolved.set(item.id, colors);

      return colors;
    },
    textFor(item) {
      return resolved.get(item.id)?.text ?? 'ink';
    },
  };
};
