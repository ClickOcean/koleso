import { useSyncExternalStore } from 'react';

import { resolveWheelStyle } from '@domains/theme/config/themes';
import { defaultWheelSettings } from '@domains/wheel/lib/hooks/useSavedWheelSettings';
import { WheelStyle } from '@models/wheel.model';

type Listener = () => void;

// При hot-reload модуль выполняется заново, и стор сбрасывался бы на стиль по умолчанию, пока форма
// колеса помнит выбранный: фон и панели одной темы, колесо — другой. Vite даёт пережить обновление
// через import.meta.hot.data; в сборке этого кода нет.
let currentStyle: WheelStyle =
  (import.meta.hot?.data.currentStyle as WheelStyle | undefined) ??
  resolveWheelStyle(defaultWheelSettings.wheelStyles);
const listeners = new Set<Listener>();

import.meta.hot?.dispose((data) => {
  data.currentStyle = currentStyle;
});

/**
 * Tiny external store with the wheel style currently selected in the settings
 * form. Lets app-level parts (background, root data attribute) follow the
 * style without living inside the form.
 */
export const activeWheelStyleStore = {
  get: (): WheelStyle => currentStyle,
  set: (style: WheelStyle | null | undefined): void => {
    const next = resolveWheelStyle(style);
    if (next === currentStyle) return;
    currentStyle = next;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useActiveWheelStyle = (): WheelStyle =>
  useSyncExternalStore(activeWheelStyleStore.subscribe, activeWheelStyleStore.get, activeWheelStyleStore.get);
