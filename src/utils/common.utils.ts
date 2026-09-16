import { COLORS } from '../constants/color.constants';
import { WheelItem } from '../models/wheel.model';

export const getWheelColor = (excludeColors: string[] = []): string => {
  let color;

  while (color === undefined || excludeColors?.includes(color)) {
    color = COLORS.WHEEL[Math.floor(Math.random() * COLORS.WHEEL.length)];
  }

  return color;
};

export const shuffle = <T>(_a: T[]): T[] => {
  const a = [..._a];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const getTotalSize = (items: WheelItem[]): number => items.reduce((acc, { amount }) => acc + (amount || 0), 0);

// generates random number in range [0, 1) using the browser CSPRNG
const getRandomValue = (): number => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

export const getRandomIntInclusive = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getRandomInclusive = (
  min: number,
  max: number,
  attemptsCount: number = 1,
  attemptSide: 'max' | 'min' = 'max',
): number => {
  const random = () => Math.random() * (max - min) + min;
  const attempts = new Array(attemptsCount).fill(0).map(random);

  return attemptSide === 'max' ? Math.max(...attempts) : Math.min(...attempts);
};

export const random = {
  getInt: getRandomIntInclusive,
  getFloat: getRandomInclusive,
  value: getRandomValue,
};

export const fitText = (text: string, maxLength: number): string =>
  text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

export const getTotal = <T>(items: T[], selectValue: (item: T) => number): number =>
  items.reduce((acc, value) => acc + selectValue(value), 0);
