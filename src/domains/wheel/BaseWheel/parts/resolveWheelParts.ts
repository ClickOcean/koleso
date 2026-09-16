import { resolveTheme, resolveWheelStyle } from '@domains/theme/config/themes';

import type { WheelStyle } from '@models/wheel.model';
import type { ResolvedWheelParts } from './types';

/**
 * Wheel parts (canvas renderer, pointer, effects, default hub image) come from
 * the theme registry in `domains/theme/config/themes.ts`.
 */
export { resolveWheelStyle };

export const resolveWheelParts = (wheelStyle?: WheelStyle | null): ResolvedWheelParts => resolveTheme(wheelStyle).parts;
