import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

const DRIP_SHORT = 'M56 56C52 64 52 72 56 76C60 72 60 64 56 56Z';
const DRIP_LONG = 'M56 56C52 66 51 84 56 92C61 84 60 66 56 56Z';

/**
 * A dripping tentacle hanging over the wheel, tipped with a bone claw.
 * It trembles slowly (SVG animateTransform) and sheds a drop now and then.
 */
const HorrorPointer = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(62, Math.round(layout.targetWheelSize * 0.17));
  const glowId = `${idPrefix}-glow`;
  const bodyId = `${idPrefix}-body`;
  const clawId = `${idPrefix}-claw`;

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
        <linearGradient id={bodyId} x1='80' y1='12' x2='80' y2='132' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#5a1230' />
          <stop offset='0.55' stopColor='#2c0716' />
          <stop offset='1' stopColor='#12030a' />
        </linearGradient>
        <linearGradient id={clawId} x1='74' y1='98' x2='86' y2='132' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#f1e9cf' />
          <stop offset='0.6' stopColor='#cfc39c' />
          <stop offset='1' stopColor='#8f8163' />
        </linearGradient>
        <filter id={glowId} x='-50%' y='-50%' width='200%' height='200%'>
          <feGaussianBlur in='SourceAlpha' stdDeviation='5' result='blur' />
          <feFlood floodColor='#c1173a' floodOpacity='0.85' result='color' />
          <feComposite in='color' in2='blur' operator='in' result='glow' />
          <feMerge>
            <feMergeNode in='glow' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${glowId})`}>
        <animateTransform
          attributeName='transform'
          type='rotate'
          values='-1.6 80 10; 1.2 80 10; -0.6 80 10; 1.8 80 10; -1.6 80 10'
          keyTimes='0; 0.3; 0.5; 0.8; 1'
          calcMode='spline'
          keySplines='0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1'
          dur='2.8s'
          repeatCount='indefinite'
        />

        {/* tentacle body */}
        <path
          d='M58 12C48 36 60 64 68 88C73 104 77 120 80 132C83 120 87 104 92 88C100 64 112 36 102 12Z'
          fill={`url(#${bodyId})`}
          stroke='#0b0206'
          strokeWidth='2'
          strokeLinejoin='round'
        />
        {/* the socket it crawls out of */}
        <ellipse cx='80' cy='12' rx='23' ry='6' fill='#1a0510' stroke='#0b0206' strokeWidth='1.5' />

        {/* veins under the skin */}
        <path d='M78 20C70 44 84 60 78 82' fill='none' stroke='rgba(215, 70, 100, 0.45)' strokeWidth='1.4' />
        <path d='M90 24C96 48 86 66 90 86' fill='none' stroke='rgba(215, 70, 100, 0.35)' strokeWidth='1' />
        {/* rim light */}
        <path
          d='M98 18C106 40 100 62 92 84C90 90 88 96 86 104'
          fill='none'
          stroke='rgba(230, 170, 190, 0.32)'
          strokeWidth='3'
          strokeLinecap='round'
        />

        {/* suckers */}
        {[
          [64, 34, 5],
          [63, 52, 4.6],
          [67, 70, 4],
          [72, 88, 3.4],
          [76, 104, 2.8],
        ].map(([cx, cy, r]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={r} fill='#3a0a1c' stroke='#d2909e' strokeWidth='1.2' opacity='0.85' />
            <circle cx={cx} cy={cy} r={r * 0.45} fill='#120208' />
          </g>
        ))}

        {/* bone claw */}
        <path
          d='M74 100C76 112 78 122 80 132C82 122 84 112 86 100C84 96 76 96 74 100Z'
          fill={`url(#${clawId})`}
          stroke='#2a1a12'
          strokeWidth='1.2'
          strokeLinejoin='round'
        />

        {/* drips */}
        <path d={DRIP_SHORT} fill='#7a0f24' stroke='#2a0410' strokeWidth='1'>
          <animate
            attributeName='d'
            values={`${DRIP_SHORT}; ${DRIP_LONG}; ${DRIP_SHORT}`}
            dur='3.6s'
            repeatCount='indefinite'
          />
        </path>
        <path d='M99 74C96 80 96 86 99 90C102 86 102 80 99 74Z' fill='#7a0f24' stroke='#2a0410' strokeWidth='1' />
        <circle cx='99' cy='96' r='2' fill='#9f1239'>
          <animate attributeName='cy' values='96; 96; 122' keyTimes='0; 0.55; 1' dur='2.6s' repeatCount='indefinite' />
          <animate
            attributeName='opacity'
            values='0.9; 0.9; 0'
            keyTimes='0; 0.55; 1'
            dur='2.6s'
            repeatCount='indefinite'
          />
        </circle>
      </g>
    </svg>
  );
};

export default HorrorPointer;
