import { createPortal } from 'react-dom';

import { CAT_LEFT_ASPECT, CAT_RIGHT_ASPECT, CAT_POP_MS, ENTER_MS, SPIN_PROGRAM, TW_ASSETS } from './taiwanTokens';
import { useSpinWindow } from './useSpinCue';

import type { CSSProperties } from 'react';
import type { WheelFrame } from './useWheelFrame';

/** The cats are as tall as the window */
const CAT_HEIGHT = 1;
/** Extra distance past the window edge while hidden, so no fur peeks in */
const OFFSTAGE = 30;
/** The kitten jumps in with a little overshoot */
const POP_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
/** Above the wheel, below the news ticker (NewsTicker) */
const CATS_Z_INDEX = 140;

const imageStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  maxWidth: 'none',
  pointerEvents: 'none',
  userSelect: 'none',
};

/**
 * Two cats before Pelosi and Buffett come on (`SPIN_PROGRAM`): a ginger kitten jumps in quickly from
 * the left edge, then a tabby slowly peeks out from behind the right edge of the wheel area, both
 * facing the wheel. They stand on the bottom edge and leave the way they came. Both are wide enough
 * to reach over the wheel, so they are lifted above it (portal into <body>, like the ticker).
 */
const TaiwanCats = ({ frame }: { frame: WheelFrame }) => {
  const isLeftShown = useSpinWindow(SPIN_PROGRAM.catLeft);
  const isRightShown = useSpinWindow(SPIN_PROGRAM.catRight);
  const { width, height, contentRight, wheel } = frame;
  if (!wheel) {
    return null;
  }

  const catHeight = height * CAT_HEIGHT;
  const leftWidth = catHeight * CAT_LEFT_ASPECT;
  const rightWidth = catHeight * CAT_RIGHT_ASPECT;
  // the kitten lands in the middle of the gap left of the wheel (or at the edge if it is wider), the
  // tabby hides behind the right edge
  const leftX = Math.max(0, (wheel.left - leftWidth) / 2);
  const rightX = contentRight - rightWidth;

  return (
    <>
      {createPortal(
        <img
          src={TW_ASSETS.catLeft}
          alt=''
          draggable={false}
          className='taiwan-enter'
          data-shown={isLeftShown}
          style={{
            ...imageStyle,
            position: 'fixed',
            zIndex: CATS_Z_INDEX,
            left: leftX,
            height: catHeight,
            width: leftWidth,
            transform: `translateX(${-(leftX + leftWidth + OFFSTAGE)}px)`,
            transitionTimingFunction: POP_EASING,
            ['--taiwan-enter' as string]: `${CAT_POP_MS}ms`,
          }}
        />,
        document.body,
      )}
      {createPortal(
        <img
          src={TW_ASSETS.catRight}
          alt=''
          draggable={false}
          className='taiwan-enter'
          data-shown={isRightShown}
          style={{
            ...imageStyle,
            position: 'fixed',
            zIndex: CATS_Z_INDEX,
            left: rightX,
            height: catHeight,
            width: rightWidth,
            transform: `translateX(${width - rightX + OFFSTAGE}px)`,
            ['--taiwan-enter' as string]: `${ENTER_MS}ms`,
          }}
        />,
        document.body,
      )}
    </>
  );
};

export default TaiwanCats;
