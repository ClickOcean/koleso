import { generateColors } from '@mantine/colors-generator';
import {
  alpha,
  createTheme,
  CSSVariablesResolver,
  DEFAULT_THEME,
  defaultVariantColorsResolver,
  MantineColorsTuple,
  MantineProvider as MantineBaseProvider,
  rem,
  VariantColorsResolver,
} from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { ReactNode, useMemo } from 'react';

import { resolveTheme } from '@domains/theme/config/themes';
import { useActiveWheelStyle } from '@domains/theme/model/activeWheelStyleStore';
import ExtendedCheckbox from '@shared/mantine/ui/Checkbox';
import CloseButtonExtended from '@shared/mantine/ui/CloseButton';
import ExtendedTextInput from '@shared/mantine/ui/Input';
import ModalExtended from '@shared/mantine/ui/Modal';
import ExtendedSegmentedControl from '@shared/mantine/ui/SegmentedControl';
import ExtendedSlider from '@shared/mantine/ui/Slider';
import ExtendedSwitch from '@shared/mantine/ui/Switch';

const shadowOpacityMain = 0.12;
const shadowOpacitySecondary = 0.09;
const shadowOpacityXs = 0.2;

const darkPalette = [
  '#a0a0a0',
  '#868686',
  '#727272',
  '#606060',
  '#3e3e3e',
  '#363636',
  '#303030',
  '#282828',
  '#212121',
  '#1b1b1b',
] as const;

const UI_OPACITY = 0.8;

const cssResolver: CSSVariablesResolver = () => ({
  variables: {},
  dark: {
    '--mantine-color-text': '#eeeeee',
    '--mantine-shadow-xs': `0 calc(0.0625rem * var(--mantine-scale)) calc(0.1875rem * var(--mantine-scale)) rgba(0, 0, 0, ${shadowOpacityMain}), 0 calc(0.0625rem * var(--mantine-scale)) calc(0.125rem * var(--mantine-scale)) rgba(0, 0, 0, ${shadowOpacityXs})`,
    '--mantine-shadow-sm': `0 calc(0.0625rem * var(--mantine-scale)) calc(0.1875rem * var(--mantine-scale)) rgba(0, 0, 0, ${shadowOpacityMain}), rgba(0, 0, 0, ${shadowOpacityMain}) 0 calc(0.625rem * var(--mantine-scale)) calc(0.9375rem * var(--mantine-scale)) calc(-0.3125rem * var(--mantine-scale)), rgba(0, 0, 0, ${shadowOpacitySecondary}) 0 calc(0.4375rem * var(--mantine-scale)) calc(0.4375rem * var(--mantine-scale)) calc(-0.3125rem * var(--mantine-scale))`,
    '--mantine-shadow-md': `0 calc(0.0625rem * var(--mantine-scale)) calc(0.1875rem * var(--mantine-scale)) rgba(0, 0, 0, ${shadowOpacityMain}), rgba(0, 0, 0, ${shadowOpacityMain}) 0 calc(1.25rem * var(--mantine-scale)) calc(1.5625rem * var(--mantine-scale)) calc(-0.3125rem * var(--mantine-scale)), rgba(0, 0, 0, ${shadowOpacitySecondary}) 0 calc(0.625rem * var(--mantine-scale)) calc(0.625rem * var(--mantine-scale)) calc(-0.3125rem * var(--mantine-scale))`,
  },
  light: {},
});

const variantColorResolver: VariantColorsResolver = (input) => {
  const defaultResolvedColors = defaultVariantColorsResolver(input);

  if (input.variant === 'subtle' && input.color === 'white') {
    return {
      ...defaultResolvedColors,
      hover: 'var(--mantine-color-dark-5)',
    };
  }

  return defaultResolvedColors;
};

/**
 * Mantine theme follows the active visual theme: accent color, color scheme
 * and default radius come from its UI tokens.
 */
const MantineProvider = ({ children }: { children: ReactNode }) => {
  const style = useActiveWheelStyle();
  const { ui } = resolveTheme(style);

  const theme = useMemo(
    () =>
      createTheme({
        variantColorResolver,
        cursorType: 'pointer',
        primaryColor: 'primary',
        defaultRadius: 'sm',
        spacing: {
          ...DEFAULT_THEME.spacing,
          xxs: rem(6),
        },
        fontFamily: 'Inter, sans-serif',
        colors: {
          dark: darkPalette,
          darkTransparent: darkPalette.map((color) => alpha(color, UI_OPACITY)) as unknown as MantineColorsTuple,
          primary: generateColors(ui.accent),
        },
        components: {
          TextInput: ExtendedTextInput,
          Slider: ExtendedSlider,
          Button: { defaultProps: { size: 'md' } },
          Checkbox: ExtendedCheckbox,
          SegmentedControl: ExtendedSegmentedControl,
          Switch: ExtendedSwitch,
          Select: {
            defaultProps: {
              size: 'md',
              comboboxProps: { transitionProps: { transition: 'pop', duration: 100 } },
            },
          },
          Modal: ModalExtended,
          Tooltip: { defaultProps: { color: 'gray' } },
          Divider: { defaultProps: { color: 'dark.5' } },
          CloseButton: CloseButtonExtended,
        },
      }),
    [ui.accent],
  );

  return (
    <MantineBaseProvider
      theme={theme}
      defaultColorScheme={ui.colorScheme}
      forceColorScheme={ui.colorScheme}
      cssVariablesResolver={cssResolver}
    >
      <ModalsProvider>{children}</ModalsProvider>
    </MantineBaseProvider>
  );
};

export default MantineProvider;
