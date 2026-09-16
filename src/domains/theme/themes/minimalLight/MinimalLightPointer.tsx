import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/** Slim dark-grey triangle with rounded corners and a soft drop shadow, pointing down at the rim. */
const MinimalLightPointer = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(62, Math.round(layout.targetWheelSize * 0.17));
  const gradientId = `${idPrefix}-gradient`;
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
        <linearGradient id={gradientId} x1='80' y1='32' x2='80' y2='128' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#4b5563' />
          <stop offset='1' stopColor='#1f2937' />
        </linearGradient>
        <filter id={shadowId} x='-40%' y='-40%' width='180%' height='180%'>
          <feDropShadow dx='0' dy='4' stdDeviation='5' floodColor='#111827' floodOpacity='0.28' />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        {/* the wide round-joined stroke is what rounds the three corners */}
        <path
          d='M80 124L61 36L99 36Z'
          fill={`url(#${gradientId})`}
          stroke={`url(#${gradientId})`}
          strokeWidth='10'
          strokeLinejoin='round'
        />
      </g>
      <path d='M80 108L70 46L90 46Z' fill='rgba(255, 255, 255, 0.08)' />
    </svg>
  );
};

export default MinimalLightPointer;
