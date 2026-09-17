import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import BeerPartyBackground from './BeerPartyBackground';
import BeerPartyEffects from './BeerPartyEffects';
import BeerPartyPointer from './BeerPartyPointer';
import BeerPartyWheel from './BeerPartyWheel';
import { BEER_AMBER, BEER_CREAM, BEER_FONT } from './beerPartyTokens';

import './beerParty.css';

/**
 * Trashy beer party: sectors poured as lager, amber, copper and stout, a foam rim with
 * bottle caps stuck in it, a beer bottle for a pointer, flies, and a living room that
 * has seen better nights.
 */
const theme: ThemeDefinition = {
  id: 'beerParty',
  parts: {
    spinningWheel: BeerPartyWheel,
    pointer: BeerPartyPointer,
    effects: BeerPartyEffects,
    coreImage: '/themes/beerParty/core.png',
  },
  background: BeerPartyBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    colorScheme: 'dark',
    accent: BEER_AMBER,
    headingFont: BEER_FONT,
    headingColor: BEER_CREAM,
    headingGlow: '1px 1px 0 rgba(0, 0, 0, 0.7), 0 0 12px rgba(217, 119, 6, 0.4)',
    panelBackground: 'rgba(30, 22, 12, 0.86)',
    panelBorder: 'rgba(217, 119, 6, 0.5)',
    panelBlur: '4px',
    buttonRadius: '6px',
    buttonGlow: '0 0 14px rgba(217, 119, 6, 0.35)',
  },
  select: {
    background: 'linear-gradient(135deg, #2b1a0a 0%, #5a3a12 55%, #f0b429 100%)',
    color: BEER_CREAM,
    borderColor: 'rgba(217, 119, 6, 0.6)',
    fontFamily: BEER_FONT,
    icon: '🍺',
  },
};

export default theme;
