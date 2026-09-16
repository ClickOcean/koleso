/**
 * Palette and rim geometry shared by the casino wheel, effects and pointer.
 * Geometry values are tuned for an 800px wheel and must go through `scale()`.
 */
export const CASINO_GOLD = '#d4a017';
export const CASINO_GOLD_LIGHT = '#f6dd8f';
export const CASINO_GOLD_DARK = '#7a5a0a';
export const CASINO_RUBY = '#e11d48';
export const CASINO_CREAM = '#fff3d6';
export const CASINO_SERIF = 'Georgia, "Times New Roman", "Noto Serif", serif';

/** Gold ring: starts this many px inside the wheel radius... */
export const RIM_INNER = 3;
/** ...and ends this many px outside it */
export const RIM_OUTER = 26;
/** Bulb centers sit on a recessed channel this far outside the wheel radius */
export const BULB_RING_OFFSET = 11;
export const BULB_COUNT = 48;
export const BULB_RADIUS = 4.4;
export const SOCKET_RADIUS = 6.6;
/** Width of the dark marquee channel the sockets sit in */
export const TRACK_WIDTH = SOCKET_RADIUS * 2 + 3;

/** Angle of bulb `index`; the first bulb sits at 12 o'clock, under the pointer */
export const bulbAngle = (index: number): number => -Math.PI / 2 + (index * 2 * Math.PI) / BULB_COUNT;
