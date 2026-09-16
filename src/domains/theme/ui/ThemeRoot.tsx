import { useEffect } from 'react';

import { resolveTheme } from '../config/themes';
import { useActiveWheelStyle } from '../model/activeWheelStyleStore';

/**
 * Renders the background of the active theme and mirrors its UI tokens onto
 * <html>: `data-wheel-style` plus `--theme-*` custom properties consumed by
 * `theme.css` (panels, headings, spin button).
 */
const ThemeRoot = () => {
  const style = useActiveWheelStyle();
  const theme = resolveTheme(style);
  const Background = theme.background;

  useEffect(() => {
    const root = document.documentElement;
    const { ui } = theme;

    root.dataset.wheelStyle = style;
    root.style.setProperty('--theme-accent', ui.accent);
    root.style.setProperty('--theme-heading-font', ui.headingFont);
    root.style.setProperty('--theme-heading-color', ui.headingColor);
    root.style.setProperty('--theme-heading-glow', ui.headingGlow);
    root.style.setProperty('--theme-ui-font', ui.uiFont ?? 'inherit');
    root.style.setProperty('--theme-panel-bg', ui.panelBackground);
    root.style.setProperty('--theme-panel-border', ui.panelBorder);
    root.style.setProperty('--theme-panel-blur', ui.panelBlur ?? '0px');
    root.style.setProperty('--theme-button-radius', ui.buttonRadius ?? 'var(--mantine-radius-default)');
    root.style.setProperty('--theme-button-glow', ui.buttonGlow ?? 'none');
  }, [style, theme]);

  return <Background key={style} />;
};

export default ThemeRoot;
