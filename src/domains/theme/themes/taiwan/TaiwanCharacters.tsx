import { BUFFETT_ASPECT, ENTER_MS, PELOSI_ASPECT, PELOSI_FACE_X, SPIN_PROGRAM, TW_ASSETS } from './taiwanTokens';
import { useSpinWindow } from './useSpinCue';

import type { CSSProperties } from 'react';
import type { WheelFrame } from './useWheelFrame';

/** She is as tall as the window; the bottom of her blazer dissolves into the bottom edge */
const PELOSI_HEIGHT = 1.02;
/** Her face centre lands at this share of the gap left of the wheel (it may run on under the wheel) */
const PELOSI_FACE_IN_GAP = 0.5;
/** He is small on purpose, and never wider than the gap right of the wheel allows */
const BUFFETT_HEIGHT = 0.4;
const BUFFETT_MIN_HEIGHT = 170;
const BUFFETT_GAP_FILL = 1.05;
/** Extra distance past the window edge while hidden, so no drop shadow peeks in */
const OFFSTAGE = 40;

const imageStyle: CSSProperties = {
  position: 'absolute',
  maxWidth: 'none',
  pointerEvents: 'none',
  userSelect: 'none',
  ['--taiwan-enter' as string]: `${ENTER_MS}ms`,
};

/**
 * Nancy Pelosi, huge, at the left edge facing the wheel, and a small Warren Buffett crying against
 * the right edge of the wheel area, looking up at her. They roll in from their side and back out at
 * their seconds of the spin (`SPIN_PROGRAM`). Both are placed from the measured wheel and sidebar,
 * so they move when the sidebar is shown or hidden.
 */
const TaiwanCharacters = ({ frame }: { frame: WheelFrame }) => {
  const isPelosiShown = useSpinWindow(SPIN_PROGRAM.pelosi);
  const isBuffettShown = useSpinWindow(SPIN_PROGRAM.buffett);
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
  // against the right edge of the wheel area: the sidebar's left edge, or the window edge without it
  const buffettLeft = contentRight - buffettWidth;

  return (
    <>
      <img
        src={TW_ASSETS.pelosi}
        alt=''
        draggable={false}
        className='taiwan-enter'
        data-shown={isPelosiShown}
        style={{
          ...imageStyle,
          left: pelosiLeft,
          top: height - pelosiHeight,
          height: pelosiHeight,
          width: pelosiWidth,
          transform: `translateX(${-(pelosiLeft + pelosiWidth + OFFSTAGE)}px)`,
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
        className='taiwan-enter'
        data-shown={isBuffettShown}
        style={{
          ...imageStyle,
          left: buffettLeft,
          top: height - buffettHeight,
          height: buffettHeight,
          width: buffettWidth,
          transform: `translateX(${width - buffettLeft + OFFSTAGE}px)`,
          maskImage: 'linear-gradient(180deg, #000 82%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 82%, transparent 100%)',
        }}
      />
    </>
  );
};

export default TaiwanCharacters;
