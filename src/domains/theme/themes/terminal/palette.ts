/** Shared colours and font of the amber CRT theme. Keep in sync with the UI tokens in theme.ts. */
export const AMBER = '#ffb000';
export const AMBER_BRIGHT = '#ffd27a';
export const AMBER_HOT = '#ffe4b0';
export const SCREEN_BLACK = '#0b0703';
export const MONO = '"Courier New", Courier, "Lucida Console", monospace';

/** Amber with the given alpha, e.g. for glows and grids */
export const amber = (alpha: number): string => `rgba(255, 176, 0, ${alpha})`;
