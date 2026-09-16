import { CORE_IMAGE_STORAGE_KEY } from '@domains/wheel/settings/ui/CoreImage/CoreImage';

export const defaultWheelSettings: Wheel.Settings = {
  spinTime: 30,
  randomSpinConfig: { min: 20, max: 60 },
  randomSpinEnabled: false,
  coreImage: typeof localStorage === 'undefined' ? null : localStorage.getItem(CORE_IMAGE_STORAGE_KEY),
  wheelStyles: 'genshinImpact',
};
