import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import NauticalBackground from './NauticalBackground';
import NauticalEffects from './NauticalEffects';
import NauticalPointer from './NauticalPointer';
import NauticalWheel, { NAUTICAL_FONT, NAUTICAL_INK } from './NauticalWheel';

/** Old sea chart: parchment sectors, compass-rose rim, compass-needle pointer, ink-brown serif type. */
const theme: ThemeDefinition = {
  id: 'nautical',
  parts: {
    spinningWheel: NauticalWheel,
    pointer: NauticalPointer,
    effects: NauticalEffects,
    coreImage: '/themes/nautical/core.png',
  },
  background: NauticalBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'light',
    accent: '#0e7490',
    headingFont: NAUTICAL_FONT,
    headingColor: NAUTICAL_INK,
    headingGlow: 'none',
    panelBackground: 'rgba(240, 228, 200, 0.92)',
    panelBorder: 'rgba(74, 48, 20, 0.45)',
    panelBlur: '4px',
    buttonRadius: '6px',
  },
  select: {
    background: 'linear-gradient(135deg, #efe3c4 0%, #d6c090 60%, #9a7743 100%)',
    color: NAUTICAL_INK,
    borderColor: 'rgba(74, 48, 20, 0.55)',
    fontFamily: NAUTICAL_FONT,
    icon: '✵',
  },
};

export default theme;
