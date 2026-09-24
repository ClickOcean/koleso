import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { PLANE_ASPECT, TW_ASSETS, TW_CREAM, TW_GOLD, TW_SERIF } from './taiwanTokens';

import type { WheelFrame } from './useWheelFrame';

const FIRST_FLIGHT_MS = 6000;
const MIN_PAUSE_MS = 45000;
const MAX_PAUSE_MS = 75000;
const FLIGHT_MS = 9000;
/** Plane width at the end of the approach, share of the window width, capped in px */
const PLANE_WIDTH = 0.22;
const PLANE_MAX_WIDTH = 420;
const START_SCALE = 0.5;

/**
 * Every minute or so the government jet comes in from the top right, grows as it approaches
 * and descends behind the wheel, towards Taipei. Halfway through, a small caption with the
 * date of the landing (2 August 2022) fades in under it and out again. Off with reduced motion.
 */
const PlaneFlyover = ({ frame }: { frame: WheelFrame }) => {
  const { t } = useTranslation();
  const planeRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let timer: number | null = null;
    let flight: Animation | null = null;
    let caption: Animation | null = null;

    const fly = () => {
      const plane = planeRef.current;
      const { width, height, contentRight, wheel } = frameRef.current;

      if (plane && captionRef.current) {
        const planeWidth = Math.min(PLANE_MAX_WIDTH, width * PLANE_WIDTH);
        const startX = contentRight - planeWidth * 0.2;
        const startY = -planeWidth / PLANE_ASPECT;
        const endX = wheel ? wheel.right - wheel.size * 0.22 : width * 0.5;
        const endY = height * 0.36;

        plane.style.width = `${planeWidth}px`;
        flight = plane.animate(
          [
            { transform: `translate(${startX}px, ${startY}px) scale(${START_SCALE})`, opacity: 0 },
            { opacity: 1, offset: 0.08 },
            { opacity: 1, offset: 0.86 },
            { transform: `translate(${endX}px, ${endY}px) scale(1)`, opacity: 0 },
          ],
          { duration: FLIGHT_MS, easing: 'cubic-bezier(0.3, 0.1, 0.55, 1)', fill: 'both' },
        );
        caption = captionRef.current.animate(
          [
            { opacity: 0 },
            { opacity: 0, offset: 0.22 },
            { opacity: 1, offset: 0.3 },
            { opacity: 1, offset: 0.62 },
            { opacity: 0, offset: 0.72 },
            { opacity: 0 },
          ],
          { duration: FLIGHT_MS, fill: 'both' },
        );
      }

      timer = window.setTimeout(fly, FLIGHT_MS + MIN_PAUSE_MS + Math.random() * (MAX_PAUSE_MS - MIN_PAUSE_MS));
    };

    timer = window.setTimeout(fly, FIRST_FLIGHT_MS);

    return () => {
      if (timer != null) {
        window.clearTimeout(timer);
      }
      flight?.cancel();
      caption?.cancel();
    };
  }, []);

  return (
    <div
      ref={planeRef}
      aria-hidden='true'
      style={{ position: 'absolute', left: 0, top: 0, opacity: 0, transformOrigin: '0 0', pointerEvents: 'none' }}
    >
      <img
        src={TW_ASSETS.plane}
        alt=''
        draggable={false}
        style={{ width: '100%', maxWidth: 'none', display: 'block' }}
      />
      <div
        ref={captionRef}
        style={{
          display: 'inline-block',
          marginTop: 6,
          marginLeft: '12%',
          opacity: 0,
          whiteSpace: 'nowrap',
          fontFamily: TW_SERIF,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: TW_CREAM,
          borderLeft: `3px solid ${TW_GOLD}`,
          padding: '2px 10px',
          background: 'rgba(12, 5, 5, 0.6)',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
        }}
      >
        {t('themes.taiwan.landing')}
      </div>
    </div>
  );
};

export default PlaneFlyover;
