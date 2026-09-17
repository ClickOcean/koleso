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

/**
 * Photo foam head (effects layer, `foamRing.ts`): an annulus from `wheelRadius - FOAM_HEAD_INNER`
 * to `wheelRadius + FOAM_HEAD_OUTER`, with both edges perturbed by smooth per-angle noise.
 */
export const FOAM_HEAD_INNER = 6;
export const FOAM_HEAD_OUTER = 30;
export const FOAM_HEAD_OUTER_NOISE = 6;
export const FOAM_HEAD_INNER_NOISE = 2.5;
/** The 1024 px foam tile is scaled down to this many px so its bubbles read as bubbles */
export const FOAM_TILE_SIZE = 220;
export const FOAM_DRIP_COUNT = 6;
export const FOAM_DRIP_MIN = 10;
export const FOAM_DRIP_MAX = 20;

/**
 * Bottle pointer: how far its base may rise above the rim (px, capped so it never reaches
 * the winner title 72 px above) and how deep the crown cap dips past the wheel edge. Подписи
 * кончаются на 0.84·R (64·scale от обода), так что пробка на 44·scale ещё не лезет на имена, а бутылка
 * получается заметной: ~108 px на колесе 800.
 */
export const BOTTLE_PROTRUSION_RATIO = 0.085;
export const BOTTLE_PROTRUSION_MAX = 64;
export const BOTTLE_DIP = 44;
/** Width / height of `bottle.png` (238 × 900) */
export const BOTTLE_ASPECT = 238 / 900;
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
