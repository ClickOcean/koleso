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
  /** Cat paw reaching down, the top fades out so it emerges from nothing */
  pointer: '/themes/taiwan/pointer.png',
  /** Mirrored so she faces right, towards the wheel */
  pelosi: '/themes/taiwan/pelosi.webp',
  /** Looks up and to the left, at her */
  buffett: '/themes/taiwan/buffett.webp',
  /** Three-quarter front view, descending towards the lower left */
  plane: '/themes/taiwan/plane.webp',
  /** A plain white Airbus in the same view and framing as the jet, for the second flight */
  airbus: '/themes/taiwan/airbus.webp',
  /** Round portrait shown on the Airbus */
  passenger: '/themes/taiwan/passenger.webp',
  /** Round portrait of Pelosi shown on the government jet */
  pelosiBadge: '/themes/taiwan/pelosi-badge.webp',
  /** Ginger kitten jumping in with its paws up, faces right, towards the wheel */
  catLeft: '/themes/taiwan/cat-left.webp',
  /** Tabby peeking in from behind the right edge, faces left, towards the wheel */
  catRight: '/themes/taiwan/cat-right.webp',
};

/** Room between the winner title and the rim, px: the paw sticks out only a little, so the wheel can be bigger */
export const TW_TITLE_GAP = 30;
/** How far the paw may stick out over the rim, px (inside `TW_TITLE_GAP`) */
export const TW_PAW_PROTRUSION = 26;
/** News ticker height, px; it rolls in over the bottom of the wheel, no room is reserved for it */
export const TW_TICKER_HEIGHT = 30;

/** One flight across the screen, seconds */
export const PLANE_FLIGHT_S = 9;
const JET_AT = 9;
/**
 * The Airbus comes in this long after the jet: by then the jet is going behind the wheel and its
 * date has faded (at 0.62 of the flight), so the two captions never meet
 */
const AIRBUS_AFTER_JET = 5;

/** A stretch of a spin in seconds from its start: something is on stage from `from` to `to` */
export interface SpinWindow {
  from: number;
  to: number;
}

/**
 * The show, in seconds from the start of a spin; it replays on every spin. Planes fly at their
 * second (the Airbus as the jet goes behind the wheel), everyone else rolls in at `from` and out
 * at `to`. A spin that stops before `from` skips that number.
 */
export const SPIN_PROGRAM = {
  jet: JET_AT,
  airbus: JET_AT + AIRBUS_AFTER_JET,
  catLeft: { from: 34, to: 42 },
  // the wheel starts in the centre, drifts to the left third, the kitten pushes it to the right third,
  // and the tabby pushes it back to the centre, where it stays until the next spin
  wheelLeft: 1,
  wheelRight: 34,
  wheelCentre: 39,
  catRight: { from: 39, to: 42 },
  pelosi: { from: 42, to: 54 },
  buffett: { from: 48, to: 54 },
  ticker: { from: 50, to: 54 },
} satisfies Record<string, number | SpinWindow>;
/** How long the characters and the ticker take to roll in */
export const ENTER_MS = 900;
/** The kitten on the left jumps in quickly */
export const CAT_POP_MS = 320;
/** Off centre the wheel's centre sits at a third (or two thirds) of the wheel area: this share of its width */
export const WHEEL_SIDE_SHIFT = 1 / 6;
/** Off centre the wheel keeps at least this much room from the window edge on narrow windows */
export const WHEEL_SIDE_MARGIN = 16;

/** Sectors end and the thin gold rim begins here */
export const RIM_INNER = 0.955;
/** Gold studs in the rim's lacquer groove */
export const RIM_STUDS = 36;
/** Names end here, clear of the rim */
export const LABEL_OUTER = 0.915;
/** Names may start here at the earliest, just outside the hub (the hub is 0.2 R) */
export const LABEL_INNER = 0.26;
/** Thin inlay in the participant hue, just inside the rim */
export const INLAY_INNER = 0.934;
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
export const AIRBUS_ASPECT = 1000 / 405;
export const CAT_LEFT_ASPECT = 585 / 640;
export const CAT_RIGHT_ASPECT = 461 / 640;
