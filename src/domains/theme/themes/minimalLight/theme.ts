import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import MinimalLightBackground from './MinimalLightBackground';
import MinimalLightPointer from './MinimalLightPointer';
import MinimalLightWheel from './MinimalLightWheel';

const SANS = "'Inter', 'Segoe UI', sans-serif";

/** Calm, bright and effect-free: pastel sectors on white, dark-grey type, a slim grey pointer. */
const theme: ThemeDefinition = {
  id: 'minimalLight',
  parts: {
    spinningWheel: MinimalLightWheel,
    pointer: MinimalLightPointer,
    effects: null,
    coreImage: '/themes/minimalLight/core.png',
  },
  background: MinimalLightBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'light',
    accent: '#2563eb',
    headingFont: SANS,
    headingColor: '#111827',
    headingGlow: 'none',
    uiFont: SANS,
    panelBackground: 'rgba(255, 255, 255, 0.9)',
    panelBorder: '#e5e7eb',
    panelBlur: '8px',
    buttonRadius: '10px',
    buttonGlow: '0 6px 18px rgba(37, 99, 235, 0.22)',
  },
  select: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)',
    color: '#1f2937',
    borderColor: '#e5e7eb',
    fontFamily: SANS,
    icon: '○',
  },
};

export default theme;
