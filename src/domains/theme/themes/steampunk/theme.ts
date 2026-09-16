import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import SteampunkBackground from './SteampunkBackground';
import SteampunkEffects from './SteampunkEffects';
import SteampunkPointer from './SteampunkPointer';
import SteampunkWheel from './SteampunkWheel';

const SERIF = 'Georgia, "Times New Roman", Times, serif';

/** Brass, copper and gears: riveted metal plates with a gear rim over an aged blueprint. */
const theme: ThemeDefinition = {
  id: 'steampunk',
  parts: {
    spinningWheel: SteampunkWheel,
    pointer: SteampunkPointer,
    effects: SteampunkEffects,
    coreImage: '/themes/steampunk/core.png',
  },
  background: SteampunkBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: '#b45309',
    headingFont: SERIF,
    headingColor: '#f3e3c3',
    headingGlow: '0 1px 0 rgba(43, 26, 14, 0.9), 0 0 16px rgba(180, 83, 9, 0.45)',
    panelBackground: 'rgba(40, 25, 12, 0.86)',
    panelBorder: 'rgba(196, 148, 62, 0.45)',
    panelBlur: '6px',
    buttonRadius: '6px',
    buttonGlow: '0 0 16px rgba(180, 83, 9, 0.45), inset 0 1px 0 rgba(255, 224, 170, 0.35)',
  },
  select: {
    background: 'linear-gradient(135deg, #2b1a0e 0%, #6b3f1d 55%, #b8862e 100%)',
    color: '#f3e3c3',
    borderColor: 'rgba(214, 168, 78, 0.55)',
    fontFamily: SERIF,
    icon: '⚙',
  },
};

export default theme;
