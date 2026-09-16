import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import NewYearBackground from './NewYearBackground';
import NewYearEffects from './NewYearEffects';
import NewYearPointer from './NewYearPointer';
import NewYearWheel from './NewYearWheel';
import { GOLD, ICE_BLUE, NEW_YEAR_FONT } from './palette';

/**
 * Festive winter night: jewel-toned sectors under a garland of twinkling
 * bulbs, an icicle pointer, drifting snow and a deep blue snowfall backdrop.
 * Ice blue is the accent (readable on filled buttons); gold carries the glows.
 */
const theme: ThemeDefinition = {
  id: 'newYear',
  parts: {
    spinningWheel: NewYearWheel,
    pointer: NewYearPointer,
    effects: NewYearEffects,
    coreImage: '/themes/newYear/core.png',
  },
  background: NewYearBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: ICE_BLUE,
    headingFont: NEW_YEAR_FONT,
    headingColor: '#fff7e0',
    headingGlow: '0 0 10px rgba(212, 175, 55, 0.85), 0 0 26px rgba(212, 175, 55, 0.4)',
    panelBackground: 'rgba(8, 22, 48, 0.8)',
    panelBorder: 'rgba(224, 238, 255, 0.3)',
    panelBlur: '8px',
    buttonRadius: '999px',
    buttonGlow: '0 0 18px rgba(96, 165, 250, 0.45), 0 0 36px rgba(212, 175, 55, 0.25)',
  },
  select: {
    background: `linear-gradient(135deg, #071430 0%, #0f2a5e 55%, ${GOLD} 100%)`,
    color: '#fff7e0',
    borderColor: 'rgba(212, 175, 55, 0.55)',
    fontFamily: NEW_YEAR_FONT,
    icon: '❄',
  },
};

export default theme;
