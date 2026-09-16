import { WheelItem } from '@models/wheel.model';
import { random } from '@utils/common.utils';

const DEFAULT_SPIN_TIME = 30;

export const getSpinDuration = ({
  randomSpinConfig,
  randomSpinEnabled,
  spinTime,
}: Pick<Wheel.Settings, 'randomSpinConfig' | 'randomSpinEnabled' | 'spinTime'>): number => {
  if (!randomSpinEnabled) {
    return spinTime && spinTime > 0 ? spinTime : DEFAULT_SPIN_TIME;
  }

  const min = Number(randomSpinConfig?.min);
  const max = Number(randomSpinConfig?.max);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
    return spinTime && spinTime > 0 ? spinTime : DEFAULT_SPIN_TIME;
  }

  return random.getInt(Math.min(min, max), Math.max(min, max));
};

/**
 * Every participant has the same weight, so the winner is a uniformly random
 * index drawn from the browser CSPRNG.
 */
export const pickWinner = <T extends WheelItem>(items: T[]): T => {
  if (!items.length) {
    throw new Error('Cannot pick a winner from an empty wheel');
  }

  const index = Math.min(items.length - 1, Math.floor(random.value() * items.length));
  return items[index];
};
