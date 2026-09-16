import GenshinEffects from '@domains/wheel/BaseWheel/parts/effects/GenshinEffects';
import GenshinPointer from '@domains/wheel/BaseWheel/parts/pointer/GenshinPointer';
import GenshinSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/GenshinSpinningWheel';

import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import GeometryBackground from './GeometryBackground';

/** "Deep space": the team's everyday look. Wheel parts live in the legacy BaseWheel/parts folders. */
const theme: ThemeDefinition = {
  id: 'genshinImpact',
  parts: {
    spinningWheel: GenshinSpinningWheel,
    pointer: GenshinPointer,
    effects: GenshinEffects,
  },
  background: GeometryBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    accent: '#3b82f6',
    headingGlow: '0 0 18px rgba(96, 165, 250, 0.55)',
    panelBackground: 'rgba(16, 18, 32, 0.82)',
    panelBorder: 'rgba(147, 197, 253, 0.18)',
    panelBlur: '8px',
    buttonGlow: '0 0 18px rgba(59, 130, 246, 0.45)',
  },
  select: {
    background: 'linear-gradient(135deg, #0a0a1a 0%, #16213e 30%, #0f3460 50%, #533483 70%, #9d4edd 100%)',
    color: '#ffffff',
    borderColor: 'rgba(255, 215, 0, 0.45)',
    icon: '✦',
  },
};

export default theme;
