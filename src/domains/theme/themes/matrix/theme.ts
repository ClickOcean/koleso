import { ThemeDefinition } from '../../model/types';
import { DEFAULT_UI_TOKENS } from '../default/theme';

import MatrixEffects from './MatrixEffects';
import MatrixPointer from './MatrixPointer';
import MatrixRainBackground from './MatrixRainBackground';
import MatrixWheel, { MATRIX_TITLE_FONT } from './MatrixWheel';

import './matrix.css';

const MONO = '"Courier New", Courier, "Lucida Console", monospace';

/**
 * Phosphor-green terminal look with digital rain. Reference implementation for new themes.
 * Титульный шрифт фильма стоит только в `headingFont` (имя победителя, кнопка «Крутить») и в
 * подписях секторов: в нём нет кириллицы и цифр, поэтому русский интерфейс остаётся на MONO.
 */
const theme: ThemeDefinition = {
  id: 'matrix',
  parts: {
    spinningWheel: MatrixWheel,
    pointer: MatrixPointer,
    effects: MatrixEffects,
    coreImage: '/themes/matrix/core.png',
  },
  background: MatrixRainBackground,
  ui: {
    ...DEFAULT_UI_TOKENS,
    accent: '#00ff41',
    headingFont: MATRIX_TITLE_FONT,
    headingColor: '#c6ffc6',
    headingGlow: '0 0 10px rgba(0, 255, 65, 0.8), 0 0 24px rgba(0, 255, 65, 0.45)',
    uiFont: MONO,
    panelBackground: 'rgba(1, 12, 4, 0.84)',
    panelBorder: 'rgba(0, 255, 65, 0.35)',
    panelBlur: '4px',
    buttonRadius: '2px',
    buttonGlow: '0 0 16px rgba(0, 255, 65, 0.45)',
  },
  select: {
    background: 'linear-gradient(135deg, #010b04 0%, #02150a 55%, #04240f 100%)',
    color: '#b6ffb6',
    borderColor: 'rgba(0, 255, 65, 0.45)',
    fontFamily: MONO,
    icon: '▮',
  },
};

export default theme;
