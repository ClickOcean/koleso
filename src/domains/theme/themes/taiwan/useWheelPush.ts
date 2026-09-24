import { useEffect, useLayoutEffect, useState } from 'react';

import { spinTimelineStore, useSpinTimeline } from '@domains/wheel/lib/spinTimelineStore';

import { SPIN_PROGRAM, WHEEL_SIDE_MARGIN, WHEEL_SIDE_SHIFT } from './taiwanTokens';

import type { WheelFrame } from './useWheelFrame';

type WheelPlace = 'centre' | 'left' | 'right';

/**
 * How far the wheel moves off centre, px: a sixth of the wheel area, but never closer than the margin
 * to the window edge. Measured from where the wheel stands when centred, so it does not change while
 * the wheel moves.
 */
export const wheelSideShift = ({ contentRight, wheel }: WheelFrame): number => {
  const size = wheel?.size ?? 0;
  const centredLeft = (contentRight - size) / 2;

  return Math.max(0, Math.min(contentRight * WHEEL_SIDE_SHIFT, centredLeft - WHEEL_SIDE_MARGIN));
};

const MOVES: [number, WheelPlace][] = [
  [SPIN_PROGRAM.wheelLeft, 'left'],
  [SPIN_PROGRAM.wheelRight, 'right'],
  [SPIN_PROGRAM.wheelCentre, 'centre'],
];

/**
 * Where the wheel stands in the Taiwan show. It starts in the centre, drifts to the left third a
 * second into the spin, the kitten pushes it to the right third and the tabby pushes it back to the
 * centre (`SPIN_PROGRAM`), where it stays until the next spin. The moves to the sides happen only
 * while the wheel spins; a spin that stops before the kitten comes sends it back to the centre. The
 * theme CSS moves the wheel area (`taiwan.css`, `data-taiwan-wheel` on <html>).
 */
export const useWheelPush = (frame: WheelFrame): void => {
  const { spinId, isSpinning, startedAt } = useSpinTimeline();
  const [place, setPlace] = useState<WheelPlace>('centre');

  useEffect(() => {
    if (startedAt == null) {
      return;
    }

    const elapsed = performance.now() - startedAt;
    const timers = MOVES.filter(([at]) => at * 1000 > elapsed).map(([at, next]) =>
      window.setTimeout(
        () => {
          const timeline = spinTimelineStore.get();
          if (timeline.spinId === spinId && (timeline.isSpinning || next === 'centre')) {
            setPlace(next);
          }
        },
        at * 1000 - elapsed,
      ),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [spinId, startedAt]);

  useEffect(() => {
    if (!isSpinning) {
      setPlace((previous) => (previous === 'left' ? 'centre' : previous));
    }
  }, [isSpinning]);

  const shift = wheelSideShift(frame);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.taiwanWheel = place;
    root.style.setProperty('--taiwan-wheel-shift', `${shift}px`);
  }, [place, shift]);

  useEffect(
    () => () => {
      const root = document.documentElement;
      delete root.dataset.taiwanWheel;
      root.style.removeProperty('--taiwan-wheel-shift');
    },
    [],
  );
};
