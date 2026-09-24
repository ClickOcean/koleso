import { useEffect, useRef, useState } from 'react';

import { spinTimelineStore, useSpinTimeline } from '@domains/wheel/lib/spinTimelineStore';

import type { SpinWindow } from './taiwanTokens';

/**
 * Calls `onMoment` when a spin reaches `atSeconds` from its start, once per spin. A spin that
 * ends earlier never reaches it, and the pending call is dropped.
 */
export const useSpinMoment = (atSeconds: number, onMoment: () => void) => {
  const { spinId, isSpinning, startedAt } = useSpinTimeline();
  const callbackRef = useRef(onMoment);

  useEffect(() => {
    callbackRef.current = onMoment;
  });

  useEffect(() => {
    if (!isSpinning || startedAt == null) {
      return;
    }

    const wait = atSeconds * 1000 - (performance.now() - startedAt);
    if (wait < 0) {
      return;
    }

    const timer = window.setTimeout(() => callbackRef.current(), wait);

    return () => window.clearTimeout(timer);
  }, [atSeconds, isSpinning, spinId, startedAt]);
};

/**
 * True while the current spin is inside `window` (seconds from its start). It opens only if the
 * wheel is still spinning at `from`, and closes at `to` even if the wheel has stopped by then, so a
 * number that has started always plays to its end. A new spin starts the program over.
 */
export const useSpinWindow = ({ from, to }: SpinWindow): boolean => {
  const { spinId, startedAt } = useSpinTimeline();
  const [openSpinId, setOpenSpinId] = useState<number | null>(null);

  useEffect(() => {
    if (startedAt == null) {
      return;
    }

    const elapsed = performance.now() - startedAt;
    if (elapsed >= to * 1000) {
      return;
    }

    const open = window.setTimeout(
      () => {
        const timeline = spinTimelineStore.get();
        if (timeline.spinId === spinId && timeline.isSpinning) {
          setOpenSpinId(spinId);
        }
      },
      Math.max(0, from * 1000 - elapsed),
    );
    const close = window.setTimeout(
      () => setOpenSpinId((current) => (current === spinId ? null : current)),
      to * 1000 - elapsed,
    );

    return () => {
      window.clearTimeout(open);
      window.clearTimeout(close);
    };
  }, [from, to, spinId, startedAt]);

  return openSpinId === spinId;
};
