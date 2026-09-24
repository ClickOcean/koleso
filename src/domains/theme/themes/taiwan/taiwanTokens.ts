/**
 * Palette, fonts, asset paths, geometry and timings shared by the Taiwan theme.
 * Wheel geometry is a fraction of the wheel radius unless it says px; px values are
 * tuned for an 800px wheel and must go through `scale()`.
 */
export const TW_RED = '#b3121f';
export const TW_RED_DEEP = '#5e0910';
export const TW_GOLD = '#d4a93c';
export const TW_GOLD_LIGHT = '#f3d98b';
export const TW_GOLD_DARK = '#7d5a12';
export const TW_CREAM = '#f3e6c8';
export const TW_INK = '#2a1208';
export const TW_JADE = '#35d07f';
export const TW_SERIF = 'Georgia, "Times New Roman", "Noto Serif", serif';

export const TW_ASSETS = {
  core: '/themes/taiwan/core.png',
  /** Thin lacquer rim with 54 sleeping kittens, composed from generated kitten sprites (see docs) */
  catRing: '/themes/taiwan/cat-ring.webp',
  /** Cat paw reaching down, the top fades out so it emerges from nothing */
  pointer: '/themes/taiwan/pointer.png',
  /** Mirrored so she faces right, towards the wheel */
  pelosi: '/themes/taiwan/pelosi.webp',
  /** Looks up and to the left, at her */
  buffett: '/themes/taiwan/buffett.webp',
  /** Three-quarter front view, descending towards the lower left */
  plane: '/themes/taiwan/plane.webp',
};

/** Room between the winner title and the rim, px: the paw sticks out only a little, so the wheel can be bigger */
export const TW_TITLE_GAP = 30;
/** How far the paw may stick out over the rim, px (inside `TW_TITLE_GAP`) */
export const TW_PAW_PROTRUSION = 26;
/** News ticker height, px; the theme reserves room for it under the wheel (see taiwan.css) */
export const TW_TICKER_HEIGHT = 24;

/** The cat ring starts here: its gold line on the sector side (there is no outer wall over the cats) */
export const CAT_RING_INNER = 0.895;
/** The ring picture spans this many wheel radii from the centre: the kittens peek over the edge a little */
export const CAT_RING_EXTENT = 1.03;
/** Names end here, clear of the ring */
export const LABEL_OUTER = 0.865;
/** Names may start here at the earliest, just outside the hub (the hub is 0.2 R) */
export const LABEL_INNER = 0.26;
/** Thin inlay in the participant hue, just inside the ring */
export const INLAY_INNER = 0.872;
/** Gold ring around the hub */
export const HUB_RING = 0.205;

/** Photos in rotation; `anchorX` is the share of the photo width that should land in the gap right of the wheel */
export interface TaiwanSlide {
  src: string;
  anchorX: number;
}

export const SLIDES: TaiwanSlide[] = [
  // night Taipei, Taipei 101 over the lights
  { src: '/themes/taiwan/bg-a.jpg', anchorX: 0.677 },
  // two systems across the strait: red sky and warships on the left, Taipei 101 and the chip fab on the right
  { src: '/themes/taiwan/bg-b.jpg', anchorX: 0.84 },
  // night market, the big signboards on the right
  { src: '/themes/taiwan/bg-d.jpg', anchorX: 0.72 },
];
export const SLIDE_ASPECT = 1920 / 1086;
/** Photos are drawn this much larger than cover so there is room to slide the anchor into the gap */
export const SLIDE_ZOOM = 1.12;
export const SLIDE_INTERVAL_MS = 20000;
export const SLIDE_FADE_MS = 2500;
/** Slow push-in while a photo is on screen */
export const KEN_BURNS_SCALE = 1.05;

export const PELOSI_ASPECT = 1022 / 1400;
/** Where her face is, as a share of the (mirrored) picture width */
export const PELOSI_FACE_X = 0.45;
export const BUFFETT_ASPECT = 712 / 900;
export const PLANE_ASPECT = 1000 / 406;
