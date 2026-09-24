import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import FlightSprite from './FlightSprite';
import { AIRBUS_ASPECT, PLANE_ASPECT, TW_ASSETS } from './taiwanTokens';

import type { RefObject } from 'react';
import type { WheelFrame } from './useWheelFrame';

const FIRST_FLIGHT_MS = 6000;
const MIN_PAUSE_MS = 45000;
const MAX_PAUSE_MS = 75000;
const FLIGHT_MS = 9000;
/** The airliner comes in this long after the government jet has gone behind the wheel */
const FOLLOW_GAP_MS = 2000;
/** Plane width at the end of the approach, share of the window width, capped in px */
const PLANE_WIDTH = 0.22;
const PLANE_MAX_WIDTH = 420;
const START_SCALE = 0.5;

interface FlightRefs {
  box: RefObject<HTMLDivElement | null>;
  caption: RefObject<HTMLDivElement | null>;
  aspect: number;
}

/**
 * Every minute or so the government jet comes in from the top right, grows as it approaches
 * and descends behind the wheel, towards Taipei, with the date of Pelosi's landing (2 August
 * 2022) under it. Two seconds after it, a plain Airbus follows the same path with a passenger's
 * portrait on the fuselage and the date of the passenger's arrival (27 September 2026). Off with
 * reduced motion.
 */
const PlaneFlyover = ({ frame }: { frame: WheelFrame }) => {
  const { t } = useTranslation();
  const jetBox = useRef<HTMLDivElement>(null);
  const jetCaption = useRef<HTMLDivElement>(null);
  const airbusBox = useRef<HTMLDivElement>(null);
  const airbusCaption = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const jet: FlightRefs = { box: jetBox, caption: jetCaption, aspect: PLANE_ASPECT };
    const airbus: FlightRefs = { box: airbusBox, caption: airbusCaption, aspect: AIRBUS_ASPECT };
    const timers = new Set<number>();
    const animations: Animation[] = [];

    const later = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
    };

    const fly = ({ box, caption, aspect }: FlightRefs) => {
      const plane = box.current;
      const { width, height, contentRight, wheel } = frameRef.current;
      if (!plane || !caption.current) {
        return;
      }

      const planeWidth = Math.min(PLANE_MAX_WIDTH, width * PLANE_WIDTH);
      const startX = contentRight - planeWidth * 0.2;
      const startY = -planeWidth / aspect;
      const endX = wheel ? wheel.right - wheel.size * 0.22 : width * 0.5;
      const endY = height * 0.36;

      plane.style.width = `${planeWidth}px`;
      animations.push(
        plane.animate(
          [
            { transform: `translate(${startX}px, ${startY}px) scale(${START_SCALE})`, opacity: 0 },
            { opacity: 1, offset: 0.08 },
            { opacity: 1, offset: 0.86 },
            { transform: `translate(${endX}px, ${endY}px) scale(1)`, opacity: 0 },
          ],
          { duration: FLIGHT_MS, easing: 'cubic-bezier(0.3, 0.1, 0.55, 1)', fill: 'both' },
        ),
        caption.current.animate(
          [
            { opacity: 0 },
            { opacity: 0, offset: 0.22 },
            { opacity: 1, offset: 0.3 },
            { opacity: 1, offset: 0.62 },
            { opacity: 0, offset: 0.72 },
            { opacity: 0 },
          ],
          { duration: FLIGHT_MS, fill: 'both' },
        ),
      );
      // only the latest pair of animations per plane is kept for cleanup
      if (animations.length > 4) {
        animations.splice(0, animations.length - 4);
      }
    };

    const flyPair = () => {
      fly(jet);
      later(() => fly(airbus), FLIGHT_MS + FOLLOW_GAP_MS);
      later(flyPair, 2 * FLIGHT_MS + FOLLOW_GAP_MS + MIN_PAUSE_MS + Math.random() * (MAX_PAUSE_MS - MIN_PAUSE_MS));
    };

    later(flyPair, FIRST_FLIGHT_MS);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return (
    <>
      <FlightSprite
        boxRef={jetBox}
        captionRef={jetCaption}
        plane={TW_ASSETS.plane}
        caption={t('themes.taiwan.landing')}
      />
      <FlightSprite
        boxRef={airbusBox}
        captionRef={airbusCaption}
        plane={TW_ASSETS.airbus}
        caption={t('themes.taiwan.arrival')}
        passenger={TW_ASSETS.passenger}
      />
    </>
  );
};

export default PlaneFlyover;
