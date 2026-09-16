import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import HighSocietyBackground from './HighSocietyBackground';
import HighSocietyEffects from './HighSocietyEffects';
import HighSocietyPointer from './HighSocietyPointer';
import HighSocietyWheel from './HighSocietyWheel';
import { HS_GOLD, HS_IVORY, HS_SERIF } from './highSocietyTokens';

/** 1920s art-deco champagne elegance: ivory and black satin, gold sunburst rim, a bottle for a pointer. */
const theme: ThemeDefinition = {
  id: 'highSociety',
  parts: {
    spinningWheel: HighSocietyWheel,
    pointer: HighSocietyPointer,
    effects: HighSocietyEffects,
    coreImage: '/themes/highSociety/core.png',
  },
  background: HighSocietyBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: HS_GOLD,
    headingFont: HS_SERIF,
    headingColor: HS_IVORY,
    headingGlow: '0 0 14px rgba(201, 162, 39, 0.55)',
    panelBackground: 'rgba(10, 8, 4, 0.82)',
    panelBorder: 'rgba(201, 162, 39, 0.45)',
    panelBlur: '8px',
    buttonRadius: '999px',
    buttonGlow: '0 0 18px rgba(201, 162, 39, 0.35)',
  },
  select: {
    background: 'linear-gradient(135deg, #050505 0%, #1a1408 55%, #c9a227 100%)',
    color: HS_IVORY,
    borderColor: 'rgba(201, 162, 39, 0.6)',
    fontFamily: HS_SERIF,
    icon: '🥂',
  },
};

export default theme;
