import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/** Terminal-cursor style pointer: a phosphor-green blade with a blinking block on top. */
const MatrixPointer = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(62, Math.round(layout.targetWheelSize * 0.17));
  const glowId = `${idPrefix}-glow`;
  const gradientId = `${idPrefix}-gradient`;

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
        <linearGradient id={gradientId} x1='80' y1='20' x2='80' y2='132' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#c6ffc6' />
          <stop offset='0.45' stopColor='#00ff41' />
          <stop offset='1' stopColor='#00802a' />
        </linearGradient>
        <filter id={glowId} x='-40%' y='-40%' width='180%' height='180%'>
          <feGaussianBlur stdDeviation='6' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${glowId})`}>
        <path d='M80 132L52 44L80 58L108 44Z' fill={`url(#${gradientId})`} opacity='0.95' />
        <path d='M80 132L52 44L80 58L108 44Z' fill='none' stroke='#d8ffd8' strokeWidth='2.5' strokeLinejoin='round' />
        <path d='M80 118L66 60L80 68L94 60Z' fill='#031a09' opacity='0.85' />
        <rect x='68' y='18' width='24' height='18' fill='#00ff41' stroke='#d8ffd8' strokeWidth='2'>
          <animate attributeName='opacity' values='1;0.15;1' dur='1.1s' repeatCount='indefinite' />
        </rect>
      </g>
    </svg>
  );
};

export default MatrixPointer;
