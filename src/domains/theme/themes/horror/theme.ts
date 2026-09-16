import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import HorrorBackground from './HorrorBackground';
import HorrorEffects from './HorrorEffects';
import HorrorPointer from './HorrorPointer';
import HorrorWheel from './HorrorWheel';

const SERIF = 'Georgia, "Times New Roman", Times, serif';

/** Cosmic horror: crushed crimson sectors, bone rim, fog and a throbbing red aura. */
const theme: ThemeDefinition = {
  id: 'horror',
  parts: {
    spinningWheel: HorrorWheel,
    pointer: HorrorPointer,
    effects: HorrorEffects,
    coreImage: '/themes/horror/core.png',
  },
  background: HorrorBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: '#9f1239',
    headingFont: SERIF,
    headingColor: '#ece3c4',
    headingGlow: '0 0 10px rgba(225, 30, 55, 0.8), 0 0 26px rgba(159, 18, 57, 0.55)',
    panelBackground: 'rgba(8, 3, 6, 0.86)',
    panelBorder: 'rgba(159, 18, 57, 0.55)',
    panelBlur: '6px',
    buttonRadius: '4px',
    buttonGlow: '0 0 18px rgba(159, 18, 57, 0.6), 0 0 4px rgba(255, 40, 70, 0.45)',
  },
  select: {
    background: 'linear-gradient(135deg, #0a0004 0%, #3b0010 60%, #6b0f1a 100%)',
    color: '#f5c6c6',
    borderColor: 'rgba(159, 18, 57, 0.7)',
    fontFamily: SERIF,
    icon: '☽',
  },
};

export default theme;
