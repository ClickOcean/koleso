import { BUFFETT_ASPECT, PELOSI_ASPECT, PELOSI_FACE_X, TW_ASSETS } from './taiwanTokens';

import type { CSSProperties } from 'react';
import type { WheelFrame } from './useWheelFrame';

/** She is as tall as the window; the bottom of her blazer sinks under the ticker */
const PELOSI_HEIGHT = 1.02;
/** Her face centre lands at this share of the gap left of the wheel (it may run on under the wheel) */
const PELOSI_FACE_IN_GAP = 0.5;
/** He is small on purpose, and never wider than the gap right of the wheel allows */
const BUFFETT_HEIGHT = 0.4;
const BUFFETT_MIN_HEIGHT = 170;
const BUFFETT_GAP_FILL = 1.05;
/** He stands just above the ticker */
const TICKER_CLEARANCE = 14;

const imageStyle: CSSProperties = {
  position: 'absolute',
  maxWidth: 'none',
  pointerEvents: 'none',
  userSelect: 'none',
};

/**
 * Nancy Pelosi, huge, at the left edge facing the wheel, and a small Warren Buffett crying in
 * the gap right of it, looking up at her. Both are placed from the measured wheel and sidebar,
 * so they move with the wheel when the sidebar is shown or hidden.
 */
const TaiwanCharacters = ({ frame }: { frame: WheelFrame }) => {
  const { width, height, contentRight, wheel } = frame;
  if (!wheel) {
    return null;
  }

  const pelosiHeight = height * PELOSI_HEIGHT;
  const pelosiWidth = pelosiHeight * PELOSI_ASPECT;
  const pelosiLeft = wheel.left * PELOSI_FACE_IN_GAP - pelosiWidth * PELOSI_FACE_X;

  const gap = Math.max(0, contentRight - wheel.right);
  const buffettHeight = Math.max(
    BUFFETT_MIN_HEIGHT,
    Math.min(height * BUFFETT_HEIGHT, (gap * BUFFETT_GAP_FILL) / BUFFETT_ASPECT),
  );
  const buffettWidth = buffettHeight * BUFFETT_ASPECT;
  const buffettLeft = Math.min(width - buffettWidth, wheel.right + (gap - buffettWidth) / 2);

  return (
    <>
      <img
        src={TW_ASSETS.pelosi}
        alt=''
        draggable={false}
        style={{
          ...imageStyle,
          left: pelosiLeft,
          top: height - pelosiHeight,
          height: pelosiHeight,
          width: pelosiWidth,
          // her blazer dissolves into the bottom of the scene instead of ending at a hard cut
          maskImage: 'linear-gradient(180deg, #000 78%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 78%, transparent 100%)',
          filter: 'drop-shadow(0 0 28px rgba(255, 190, 90, 0.18))',
        }}
      />
      <img
        src={TW_ASSETS.buffett}
        alt=''
        draggable={false}
        style={{
          ...imageStyle,
          left: buffettLeft,
          top: height - TICKER_CLEARANCE - buffettHeight,
          height: buffettHeight,
          width: buffettWidth,
          maskImage: 'linear-gradient(180deg, #000 82%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 82%, transparent 100%)',
        }}
      />
    </>
  );
};

export default TaiwanCharacters;
