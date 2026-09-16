import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import ArcadeBackground from './ArcadeBackground';
import ArcadeEffects from './ArcadeEffects';
import ArcadePointer from './ArcadePointer';
import ArcadeWheel from './ArcadeWheel';
import { ARCADE_YELLOW } from './palette';
import { PIXEL_FONT } from './pixelText';

/** Hard offset shadow under the yellow spin button; dark yellow so it reads on the dark blue panel */
const BUTTON_SHADOW = '#7a5c00';

/** 8-bit arcade cabinet: flat palette sectors, pixel rim, marquee lights and a scrolling starfield. */
const theme: ThemeDefinition = {
  id: 'arcade',
  parts: {
    spinningWheel: ArcadeWheel,
    pointer: ArcadePointer,
    effects: ArcadeEffects,
    coreImage: '/themes/arcade/core.png',
  },
  background: ArcadeBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: ARCADE_YELLOW,
    headingFont: PIXEL_FONT,
    headingColor: '#fde047',
    headingGlow: '3px 3px 0 #000000',
    uiFont: PIXEL_FONT,
    panelBackground: 'rgba(9, 12, 48, 0.92)',
    panelBorder: 'rgba(255, 255, 255, 0.85)',
    panelBlur: '0px',
    buttonRadius: '0px',
    buttonGlow: `4px 4px 0 ${BUTTON_SHADOW}`,
  },
  select: {
    background: 'linear-gradient(135deg, #070a2a 0%, #1b1f7a 60%, #c81e1e 100%)',
    color: '#fde047',
    borderColor: 'rgba(255, 255, 255, 0.85)',
    fontFamily: PIXEL_FONT,
    icon: '▣',
  },
};

export default theme;
