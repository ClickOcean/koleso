/**
 * Palette, fonts and rim geometry shared by the solar wheel, effects and pointer.
 * Geometry values are tuned for an 800px wheel and must go through `scale()`.
 */
export const SOLAR_FONT = "'Arial Black', 'Impact', 'Arial', sans-serif";
export const SOLAR_HEADING_FONT = "'Arial Black', 'Arial', sans-serif";
export const SOLAR_ACCENT = '#f59e0b';
export const SOLAR_TEXT = '#3b1a00';
export const SOLAR_TEXT_OUTLINE = 'rgba(255, 240, 200, 0.9)';
/** Photosphere edge ring */
export const SOLAR_RIM = '#fff3b0';

/** Width of the bright edge ring, drawn just inside the wheel radius */
export const RIM_WIDTH = 5;
/** The static corona glow reaches this fraction of the canvas overscan beyond the wheel radius */
export const CORONA_REACH = 0.8;
/** Overscan around the wheel in unscaled px: the canvas is 1.3x the wheel, so 0.15 x 800 on each side */
export const OVERSCAN = 120;
