import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import StadiumBackground from './StadiumBackground';
import StadiumEffects from './StadiumEffects';
import StadiumPointer from './StadiumPointer';
import StadiumWheel, { STADIUM_FONT } from './StadiumWheel';

const OUTLINE = '#0b0f14';

/** Evening football stadium: floodlit pitch sectors, chalk lines, a referee's flag and confetti. */
const theme: ThemeDefinition = {
  id: 'stadium',
  parts: {
    spinningWheel: StadiumWheel,
    pointer: StadiumPointer,
    effects: StadiumEffects,
    coreImage: '/themes/stadium/core.png',
  },
  background: StadiumBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: '#22c55e',
    headingFont: STADIUM_FONT,
    headingColor: '#ffffff',
    headingGlow: [
      `-1px -1px 0 ${OUTLINE}`,
      `1px -1px 0 ${OUTLINE}`,
      `-1px 1px 0 ${OUTLINE}`,
      `1px 1px 0 ${OUTLINE}`,
      `0 2px 0 ${OUTLINE}`,
      '0 4px 12px rgba(0, 0, 0, 0.6)',
    ].join(', '),
    panelBackground: 'rgba(22, 24, 29, 0.9)',
    panelBorder: 'rgba(255, 255, 255, 0.6)',
    panelBlur: '6px',
    buttonRadius: '6px',
    buttonGlow: '0 0 0 2px rgba(255, 255, 255, 0.35), 0 0 18px rgba(34, 197, 94, 0.5)',
  },
  select: {
    background: 'linear-gradient(135deg, #0b1220 0%, #14532d 55%, #166534 100%)',
    color: '#ffffff',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    fontFamily: STADIUM_FONT,
    icon: '⚽',
  },
};

export default theme;
