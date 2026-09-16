/** Shared colors and typography of the synthwave theme (1980s outrun poster). */

export const SYNTH_PINK = '#ff2d95';
export const SYNTH_CYAN = '#1ef2ff';
export const SYNTH_PURPLE = '#9d4edd';
export const SYNTH_NAVY = '#0d0b2e';

/** RGB triplets for building rgba() strings without allocations in animation loops */
export const SYNTH_PINK_RGB = '255, 45, 149';
export const SYNTH_CYAN_RGB = '30, 242, 255';
export const SYNTH_PURPLE_RGB = '199, 125, 255';
export const SYNTH_WHITE_RGB = '255, 255, 255';

/**
 * Heavy sans. The wheel canvas sets `italic 900` itself (the browser synthesises
 * the slant where the face has none); DOM headings receive only this family via
 * `ui.headingFont`, see the note in theme.ts.
 */
export const SYNTH_FONT = '"Arial Black", "Segoe UI", Arial, Helvetica, sans-serif';
