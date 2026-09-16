import DefaultPointer from '@domains/wheel/BaseWheel/parts/pointer/DefaultPointer';
import DefaultSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/DefaultSpinningWheel';

import { ThemeDefinition, ThemeUiTokens } from '../../model/types';
import GeometryBackground from '../genshinImpact/GeometryBackground';

/** Baseline tokens other themes can spread and override */
export const DEFAULT_UI_TOKENS: ThemeUiTokens = {
  colorScheme: 'dark',
  accent: '#228be6',
  headingFont: 'Inter, sans-serif',
  headingColor: '#ffffff',
  headingGlow: 'none',
  panelBackground: 'rgba(33, 33, 33, 0.86)',
  panelBorder: 'rgba(255, 255, 255, 0.08)',
  panelBlur: '6px',
};

const theme: ThemeDefinition = {
  id: 'default',
  parts: {
    spinningWheel: DefaultSpinningWheel,
    pointer: DefaultPointer,
    effects: null,
  },
  background: GeometryBackground,
  ui: DEFAULT_UI_TOKENS,
};

export default theme;
