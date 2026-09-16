import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import CasinoBackground from './CasinoBackground';
import CasinoEffects from './CasinoEffects';
import CasinoPointer from './CasinoPointer';
import CasinoWheel from './CasinoWheel';
import { CASINO_GOLD_LIGHT, CASINO_RUBY, CASINO_SERIF } from './casinoTokens';

/** Retro roulette hall: red/black felt, gold rim with chasing marquee bulbs, burgundy velvet. */
const theme: ThemeDefinition = {
  id: 'casino',
  parts: {
    spinningWheel: CasinoWheel,
    pointer: CasinoPointer,
    effects: CasinoEffects,
    coreImage: '/themes/casino/core.png',
  },
  background: CasinoBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    // ruby reads clearly under white button text; gold carries the headings and borders
    accent: CASINO_RUBY,
    headingFont: CASINO_SERIF,
    headingColor: CASINO_GOLD_LIGHT,
    headingGlow: '0 0 14px rgba(212, 160, 23, 0.55), 0 2px 3px rgba(0, 0, 0, 0.7)',
    panelBackground: 'rgba(40, 8, 18, 0.84)',
    panelBorder: 'rgba(212, 160, 23, 0.45)',
    panelBlur: '6px',
    buttonRadius: '6px',
    buttonGlow: '0 0 18px rgba(225, 29, 72, 0.5), inset 0 0 0 1px rgba(255, 220, 140, 0.35)',
  },
  select: {
    background: 'linear-gradient(135deg, #2b0912 0%, #7a1024 55%, #b8860b 100%)',
    color: '#ffe8a3',
    borderColor: 'rgba(212, 160, 23, 0.6)',
    fontFamily: CASINO_SERIF,
    icon: '♠',
  },
};

export default theme;
