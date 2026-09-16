import { ComponentType } from 'react';

import { ResolvedWheelParts } from '@domains/wheel/BaseWheel/parts/types';
import { WheelStyle } from '@models/wheel.model';

/**
 * Tokens that theme the UI around the wheel. They are written to CSS custom
 * properties on <html> (see `ui/ThemeRoot.tsx` and `ui/theme.css`) and fed
 * into the Mantine theme (accent, color scheme, radius).
 */
export interface ThemeUiTokens {
  colorScheme: 'dark' | 'light';
  /** Seed for the Mantine primary palette: spin button, active tab, focus rings */
  accent: string;
  /** Font for the winner name above the wheel, the winner overlay and the spin button */
  headingFont: string;
  headingColor: string;
  /** text-shadow for headings, or 'none' */
  headingGlow: string;
  /** Optional font for the rest of the sidebar UI */
  uiFont?: string;
  /** Sidebar cards */
  panelBackground: string;
  panelBorder: string;
  /** backdrop-filter blur radius for cards, e.g. '8px' */
  panelBlur?: string;
  /** e.g. '999px' for pill buttons */
  buttonRadius?: string;
  /** box-shadow for the spin button */
  buttonGlow?: string;
}

/** How the theme looks inside the style selector */
export interface ThemeSelectStyle {
  background: string;
  color: string;
  borderColor?: string;
  fontFamily?: string;
  /** Short decorative glyph shown next to the label */
  icon?: string;
}

export interface ThemeDefinition {
  id: WheelStyle;
  /** Canvas renderer, pointer, effects layer and optional default hub image */
  parts: ResolvedWheelParts;
  /** Full-page background rendered behind everything */
  background: ComponentType;
  ui: ThemeUiTokens;
  select?: ThemeSelectStyle;
}
