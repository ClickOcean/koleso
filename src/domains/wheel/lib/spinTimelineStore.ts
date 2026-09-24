import { useSyncExternalStore } from 'react';

type Listener = () => void;

export interface SpinTimeline {
  /** Grows with every spin, so a consumer can tell two spins apart */
  spinId: number;
  isSpinning: boolean;
  /** `performance.now()` when the current or last spin started, null before the first one */
  startedAt: number | null;
  /** Length of the current or last spin, seconds */
  duration: number;
}

let timeline: SpinTimeline = { spinId: 0, isSpinning: false, startedAt: null, duration: 0 };
const listeners = new Set<Listener>();

const update = (next: SpinTimeline): void => {
  timeline = next;
  listeners.forEach((listener) => listener());
};

/**
 * When the wheel spins and for how long. `WheelBoard` writes it; app-level parts that do not live
 * inside the wheel (a theme background timing its scenes to the spin) read it.
 */
export const spinTimelineStore = {
  get: (): SpinTimeline => timeline,
  start: (duration: number): void =>
    update({ spinId: timeline.spinId + 1, isSpinning: true, startedAt: performance.now(), duration }),
  stop: (): void => {
    if (timeline.isSpinning) {
      update({ ...timeline, isSpinning: false });
    }
  },
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useSpinTimeline = (): SpinTimeline =>
  useSyncExternalStore(spinTimelineStore.subscribe, spinTimelineStore.get, spinTimelineStore.get);
