import { WheelStyle } from '@models/wheel.model';

import { ThemeDefinition } from '../model/types';
import arcade from '../themes/arcade/theme';
import beerParty from '../themes/beerParty/theme';
import casino from '../themes/casino/theme';
import defaultTheme from '../themes/default/theme';
import genshinImpact from '../themes/genshinImpact/theme';
import highSociety from '../themes/highSociety/theme';
import horror from '../themes/horror/theme';
import matrix from '../themes/matrix/theme';
import minimalLight from '../themes/minimalLight/theme';
import nautical from '../themes/nautical/theme';
import newYear from '../themes/newYear/theme';
import solarSystem from '../themes/solarSystem/theme';
import stadium from '../themes/stadium/theme';
import steampunk from '../themes/steampunk/theme';
import synthwave from '../themes/synthwave/theme';
import taiwan from '../themes/taiwan/theme';
import terminal from '../themes/terminal/theme';

/**
 * Single registry of visual themes. Order here is the order in the style selector.
 * TypeScript enforces that every `WheelStyle` has a definition.
 */
export const THEMES: Record<WheelStyle, ThemeDefinition> = {
  default: defaultTheme,
  genshinImpact,
  matrix,
  casino,
  synthwave,
  arcade,
  horror,
  newYear,
  terminal,
  steampunk,
  nautical,
  stadium,
  minimalLight,
  highSociety,
  beerParty,
  solarSystem,
  taiwan,
};

export const THEME_IDS = Object.keys(THEMES) as WheelStyle[];

export const resolveWheelStyle = (wheelStyle?: WheelStyle | null): WheelStyle =>
  wheelStyle && wheelStyle in THEMES ? wheelStyle : 'default';

export const resolveTheme = (wheelStyle?: WheelStyle | null): ThemeDefinition => THEMES[resolveWheelStyle(wheelStyle)];
