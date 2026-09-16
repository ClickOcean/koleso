import type { WheelItem, WheelItemWithAngle } from '@models/wheel.model';

export type ID = WheelItem['id'];

export interface SpinParams {
  duration: number;
  distance?: number;
  winnerId: ID;
}

export interface SpinResult {
  changedDistance: number;
  initialDistance: number;
  duration: number;
  animate: () => Promise<void>;
}

export interface WheelController {
  getItems: () => WheelItemWithAngle[];

  clearWinner: () => void;
  spin: (params: SpinParams) => SpinResult;
  resetPosition: () => void;

  highlight: (id: ID) => void;
  resetStyles: () => void;
  eatAnimation: (id: ID, duration?: number) => Promise<void>;
}
