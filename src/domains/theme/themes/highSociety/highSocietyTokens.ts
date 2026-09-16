/**
 * Palette and rim geometry shared by the high-society wheel, effects and pointer.
 * Geometry values are tuned for an 800px wheel and must go through `scale()`.
 */
export const HS_GOLD = '#c9a227';
export const HS_GOLD_LIGHT = '#f2d77a';
export const HS_GOLD_PALE = '#fbeec4';
export const HS_GOLD_DARK = '#7a5a0a';
export const HS_IVORY = '#f5e6c8';
export const HS_CHARCOAL = '#2a1f14';
export const HS_BLACK = '#0b0907';
export const HS_SERIF = 'Georgia, "Times New Roman", "Noto Serif", serif';

/** Sectors stop this many px inside the wheel radius; the rim is drawn over the edge */
export const SECTOR_INSET = 2;
/** Sunburst band (participant inlay under radiating gold rays) starts this many px inside the wheel radius... */
export const BAND_INNER = 14;
/** ...and ends this many px outside it */
export const BAND_OUTER = 4;
/** The black band with gold tick marks ends this many px outside the wheel radius */
export const TICK_OUTER = 22;
/** The soft gold glow reaches this far outside the wheel radius */
export const GLOW_REACH = 48;
