import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/**
 * Compass needle: white south end, brass pivot, red north tip pointing at the wheel.
 *
 * Geometry (viewBox units; 1 unit = 0.85 px on an 800 px wheel, svg top sits 36 % of its
 * height above the rim, i.e. at y = -49 px): the whole needle hangs above the rim and only
 * the last ~11 px of the red tip cross it. The pivot (cy = 39, r = 10.5) ends 7 px above the
 * rim, so the "N" disc drawn in `afterDraw` (centre 8.5 px below the rim, radius 10) stays
 * visible at rotation 0: the tip narrows to under 3 px where it meets the letter's top and
 * ends (y = 70) just short of its centre. The tail (y = 13) stops at -38 px so it does not
 * climb into the heading above the wheel.
 */
const NauticalPointer = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(62, Math.round(layout.targetWheelSize * 0.17));
  const redId = `${idPrefix}-red`;
  const whiteId = `${idPrefix}-white`;
  const brassId = `${idPrefix}-brass`;
  const shadowId = `${idPrefix}-shadow`;

  return (
    <svg
      className={classes.wheelPointer}
      style={{ transform: 'translate(-50%, -36%)' }}
      width={size}
      height={size}
      viewBox='0 0 160 160'
      aria-hidden='true'
    >
      <defs>
        <linearGradient id={redId} x1='71' y1='0' x2='89' y2='0' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#d8574c' />
          <stop offset='0.5' stopColor='#b3271b' />
          <stop offset='1' stopColor='#741911' />
        </linearGradient>
        <linearGradient id={whiteId} x1='71' y1='0' x2='89' y2='0' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#fffdf6' />
          <stop offset='0.5' stopColor='#ede5d1' />
          <stop offset='1' stopColor='#c4b592' />
        </linearGradient>
        <radialGradient id={brassId} cx='0.36' cy='0.34' r='0.72'>
          <stop offset='0' stopColor='#fff3c0' />
          <stop offset='0.45' stopColor='#d9b25a' />
          <stop offset='1' stopColor='#7f5a1c' />
        </radialGradient>
        <filter id={shadowId} x='-60%' y='-30%' width='220%' height='170%'>
          <feDropShadow dx='0' dy='3' stdDeviation='3' floodColor='#2b1d0e' floodOpacity='0.35' />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <path d='M80 13L71 39L89 39Z' fill={`url(#${whiteId})`} />
        <path d='M80 70L71 39L89 39Z' fill={`url(#${redId})`} />
        <path d='M80 13L71 39L80 39Z' fill='rgba(43, 29, 14, 0.12)' />
        <path d='M80 70L71 39L80 39Z' fill='rgba(0, 0, 0, 0.2)' />
        <path d='M80 13L71 39L80 70L89 39Z' fill='none' stroke='#2b1d0e' strokeWidth='1.8' strokeLinejoin='round' />

        <circle cx='80' cy='39' r='10.5' fill={`url(#${brassId})`} stroke='#5a3d12' strokeWidth='2' />
        <circle cx='80' cy='39' r='3.4' fill='#4a3210' />
        <circle cx='76.4' cy='35.4' r='2.2' fill='rgba(255, 255, 255, 0.75)' />
      </g>
    </svg>
  );
};

export default NauticalPointer;
