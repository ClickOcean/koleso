import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import SolarSystemBackground from './SolarSystemBackground';
import SolarSystemEffects from './SolarSystemEffects';
import SolarSystemPointer from './SolarSystemPointer';
import SolarSystemWheel from './SolarSystemWheel';
import { SOLAR_ACCENT, SOLAR_HEADING_FONT } from './solarTokens';

/** The wheel is the Sun: blazing plasma sectors under a corona, with the planets orbiting it in deep space. */
const HUB_PLASMA =
  'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22g%22%20cx%3D%2245%25%22%20cy%3D%2242%25%22%20r%3D%2260%25%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23fff7d6%22%2F%3E%3Cstop%20offset%3D%220.45%22%20stop-color%3D%22%23ffd45c%22%2F%3E%3Cstop%20offset%3D%220.8%22%20stop-color%3D%22%23ff9a1f%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23e8600a%22%2F%3E%3C%2FradialGradient%3E%3C%2Fdefs%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%22100%22%20fill%3D%22url%28%23g%29%22%2F%3E%3C%2Fsvg%3E';

const theme: ThemeDefinition = {
  id: 'solarSystem',
  parts: {
    spinningWheel: SolarSystemWheel,
    pointer: SolarSystemPointer,
    effects: SolarSystemEffects,
    // the hottest spot of the photosphere: a plain plasma disc, deliberately not a second Sun
    coreImage: HUB_PLASMA,
  },
  background: SolarSystemBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: SOLAR_ACCENT,
    headingFont: SOLAR_HEADING_FONT,
    headingColor: '#fff1c2',
    headingGlow: '0 0 14px rgba(245, 158, 11, 0.7)',
    panelBackground: 'rgba(6, 8, 22, 0.84)',
    panelBorder: 'rgba(245, 158, 11, 0.35)',
    panelBlur: '8px',
    buttonGlow: '0 0 18px rgba(245, 158, 11, 0.45)',
  },
  select: {
    background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 50%, #f59e0b 100%)',
    color: '#fff7ed',
    borderColor: 'rgba(245, 158, 11, 0.5)',
    icon: '☀',
  },
};

export default theme;
