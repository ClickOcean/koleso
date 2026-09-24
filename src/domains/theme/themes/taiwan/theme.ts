import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import TaiwanBackground from './TaiwanBackground';
import TaiwanEffects from './TaiwanEffects';
import TaiwanPointer from './TaiwanPointer';
import TaiwanWheel from './TaiwanWheel';
import { TW_ASSETS, TW_CREAM, TW_RED, TW_SERIF, TW_TITLE_GAP } from './taiwanTokens';

import './taiwan.css';

/**
 * Taiwan: temple-lacquer wheel with a ring of sleeping Houtong cats, a cat paw for a pointer,
 * photos of Taipei and the strait in rotation, Pelosi and a weeping Buffett, the government
 * jet of 2 August 2022 and a news crawl at the bottom.
 */
const theme: ThemeDefinition = {
  id: 'taiwan',
  parts: {
    spinningWheel: TaiwanWheel,
    pointer: TaiwanPointer,
    effects: TaiwanEffects,
    coreImage: TW_ASSETS.core,
    titleGap: TW_TITLE_GAP,
  },
  background: TaiwanBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: TW_RED,
    headingFont: TW_SERIF,
    headingColor: TW_CREAM,
    headingGlow: '0 0 14px rgba(212, 169, 60, 0.6), 0 2px 4px rgba(0, 0, 0, 0.8)',
    panelBackground: 'rgba(20, 7, 7, 0.84)',
    panelBorder: 'rgba(212, 169, 60, 0.45)',
    panelBlur: '8px',
    buttonRadius: '10px',
    buttonGlow: '0 0 18px rgba(179, 18, 31, 0.5)',
  },
  select: {
    background: 'linear-gradient(135deg, #5e0910 0%, #b3121f 55%, #d4a93c 100%)',
    color: TW_CREAM,
    borderColor: 'rgba(212, 169, 60, 0.6)',
    fontFamily: TW_SERIF,
    icon: '🐈',
  },
};

export default theme;
