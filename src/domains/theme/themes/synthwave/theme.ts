import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import { SYNTH_FONT, SYNTH_PINK } from './palette';
import SynthwaveBackground from './SynthwaveBackground';
import SynthwaveEffects from './SynthwaveEffects';
import SynthwavePointer from './SynthwavePointer';
import SynthwaveWheel from './SynthwaveWheel';

/** 1980s outrun poster: neon pink and cyan over deep purple, a striped sun and a scrolling grid. */
const theme: ThemeDefinition = {
  id: 'synthwave',
  parts: {
    spinningWheel: SynthwaveWheel,
    pointer: SynthwavePointer,
    effects: SynthwaveEffects,
    coreImage: '/themes/synthwave/core.png',
  },
  background: SynthwaveBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: SYNTH_PINK,
    // Only reaches the DOM as font-family (theme.css), so the italic of the brief
    // is expressed here through the heavy face plus the cyan/pink split glow;
    // true italics need an integrator-side `headingStyle` token (→ font-style).
    headingFont: SYNTH_FONT,
    headingColor: '#fff4fb',
    headingGlow:
      '-2px 0 0 rgba(30, 242, 255, 0.7), 2px 0 0 rgba(255, 45, 149, 0.7), 0 0 14px rgba(255, 45, 149, 0.75), 0 0 34px rgba(157, 78, 221, 0.55)',
    panelBackground: 'rgba(26, 7, 52, 0.78)',
    panelBorder: 'rgba(255, 45, 149, 0.45)',
    panelBlur: '10px',
    buttonRadius: '4px',
    buttonGlow: '0 0 18px rgba(255, 45, 149, 0.55), 0 0 42px rgba(30, 242, 255, 0.22)',
  },
  select: {
    background: 'linear-gradient(135deg, #1a0b2e 0%, #5b1d8f 50%, #ff2d95 100%)',
    color: '#ffffff',
    borderColor: 'rgba(255, 45, 149, 0.6)',
    fontFamily: SYNTH_FONT,
    icon: '▲',
  },
};

export default theme;
