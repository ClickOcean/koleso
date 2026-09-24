import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import FlightSprite from './FlightSprite';
import { AIRBUS_ASPECT, PLANE_ASPECT, PLANE_FLIGHT_S, SPIN_PROGRAM, TW_ASSETS } from './taiwanTokens';
import { useSpinMoment } from './useSpinCue';

import type { RefObject } from 'react';
import type { WheelFrame } from './useWheelFrame';

const FLIGHT_MS = PLANE_FLIGHT_S * 1000;
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
 * The government jet comes in from the top right at its second of every spin (`SPIN_PROGRAM`),
 * grows as it approaches and descends behind the wheel, towards Taipei, with Pelosi's portrait over
 * the fuselage and the date of her landing (2 August 2022) under it. Two seconds after it has gone
 * a plain Airbus takes the same path with another passenger's portrait and the date of that
 * arrival (27 September 2026). A spin shorter than the cue has no flight. Off with reduced motion.
 */
const PlaneFlyover = ({ frame }: { frame: WheelFrame }) => {
  const { t } = useTranslation();
  const jetBox = useRef<HTMLDivElement>(null);
  const jetCaption = useRef<HTMLDivElement>(null);
  const airbusBox = useRef<HTMLDivElement>(null);
  const airbusCaption = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);
  // the running flight of each plane, so a new one replaces it and unmount cancels it
  const flightsRef = useRef(new Map<HTMLElement, Animation[]>());

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    const flights = flightsRef.current;

    return () => flights.forEach((animations) => animations.forEach((animation) => animation.cancel()));
  }, []);

  const fly = useCallback(({ box, caption, aspect }: FlightRefs) => {
    const plane = box.current;
    if (!plane || !caption.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const { width, height, contentRight, wheel } = frameRef.current;
    const planeWidth = Math.min(PLANE_MAX_WIDTH, width * PLANE_WIDTH);
    const startX = contentRight - planeWidth * 0.2;
    const startY = -planeWidth / aspect;
    const endX = wheel ? wheel.right - wheel.size * 0.22 : width * 0.5;
    const endY = height * 0.36;

    plane.style.width = `${planeWidth}px`;
    flightsRef.current.get(plane)?.forEach((animation) => animation.cancel());
    flightsRef.current.set(plane, [
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
    ]);
  }, []);

  useSpinMoment(SPIN_PROGRAM.jet, () => fly({ box: jetBox, caption: jetCaption, aspect: PLANE_ASPECT }));
  useSpinMoment(SPIN_PROGRAM.airbus, () => fly({ box: airbusBox, caption: airbusCaption, aspect: AIRBUS_ASPECT }));

  return (
    <>
      <FlightSprite
        boxRef={jetBox}
        captionRef={jetCaption}
        plane={TW_ASSETS.plane}
        caption={t('themes.taiwan.landing')}
        passenger={TW_ASSETS.pelosiBadge}
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
