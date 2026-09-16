/**
 * Palette, fonts and rim geometry shared by the beer party wheel, effects and pointer.
 * Geometry values are tuned for an 800px wheel and must go through `scale()`.
 */
export const BEER_FONT = '"Arial Black", Impact, Arial, sans-serif';
export const BEER_AMBER = '#d97706';
export const BEER_CREAM = '#fff2cc';
export const BEER_DARK = '#2b1606';
export const FOAM_WHITE = '#fffdf6';
export const FOAM_CREAM = '#f7ead0';
export const FOAM_LINE = '#fff4dc';

/** Dark wood "bar counter" ring: starts this many px inside the wheel radius... */
export const WOOD_INNER = 8;
/** ...and ends this many px outside it */
export const WOOD_OUTER = 10;

/** Solid foam annulus under the bubbles, so the bumpy ring never shows holes */
export const FOAM_BASE_INNER = 6;
export const FOAM_BASE_OUTER = 27;
/** Foam bubbles are centred this far outside the wheel radius */
export const FOAM_RING_OFFSET = 17;
export const FOAM_BUBBLE_MIN = 6.5;
export const FOAM_BUBBLE_MAX = 14.5;
export const FOAM_BUBBLE_COUNT = 120;

export const CAP_COUNT = 8;
export const CAP_RADIUS = 11.5;
export const CAP_RING_OFFSET = 16;
export const CAP_COLORS = ['#c8102e', '#e0a526', '#1f5fa8', '#2e7d32'];

/** Rising bubbles in the effects layer live in this band, measured inwards from the wheel radius */
export const BUBBLE_BAND_INNER = 36;
export const BUBBLE_BAND_OUTER = 12;

/** Angle of cap `index`; caps sit half an octant off 12 o'clock so none hides under the pointer at rest */
export const capAngle = (index: number): number =>
  -Math.PI / 2 + Math.PI / CAP_COUNT + (index * 2 * Math.PI) / CAP_COUNT;
