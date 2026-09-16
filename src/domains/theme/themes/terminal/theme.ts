import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import { MONO } from './palette';
import TerminalBackground from './TerminalBackground';
import TerminalEffects from './TerminalEffects';
import TerminalPointer from './TerminalPointer';
import TerminalWheel from './TerminalWheel';

/** Amber monochrome CRT terminal: a warm sibling of the green Matrix theme. */
const theme: ThemeDefinition = {
  id: 'terminal',
  parts: {
    spinningWheel: TerminalWheel,
    pointer: TerminalPointer,
    effects: TerminalEffects,
    coreImage: '/themes/terminal/core.png',
  },
  background: TerminalBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: '#f59e0b',
    headingFont: MONO,
    headingColor: '#ffb000',
    headingGlow: '0 0 8px rgba(255, 176, 0, 0.75), 0 0 22px rgba(255, 176, 0, 0.35)',
    uiFont: MONO,
    panelBackground: 'rgba(24, 14, 4, 0.86)',
    panelBorder: 'rgba(255, 176, 0, 0.35)',
    panelBlur: '4px',
    buttonRadius: '2px',
    buttonGlow: '0 0 16px rgba(255, 176, 0, 0.4)',
  },
  select: {
    background: 'linear-gradient(135deg, #120a00 0%, #2a1800 60%, #4a2a00 100%)',
    color: '#ffb000',
    borderColor: 'rgba(255, 176, 0, 0.45)',
    fontFamily: MONO,
    icon: '▌',
  },
};

export default theme;
