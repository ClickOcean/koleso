import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/** Glossy, semi-transparent icicle hanging from a snow cap; the tip points down at the wheel. */
const NewYearPointer = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(62, Math.round(layout.targetWheelSize * 0.17));
  const iceId = `${idPrefix}-ice`;
  const capId = `${idPrefix}-cap`;
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
        <linearGradient id={iceId} x1='80' y1='16' x2='80' y2='134' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#f4fbff' stopOpacity='0.95' />
          <stop offset='0.35' stopColor='#cfe8ff' stopOpacity='0.85' />
          <stop offset='0.75' stopColor='#9ecbff' stopOpacity='0.8' />
          <stop offset='1' stopColor='#6fb0ff' stopOpacity='0.92' />
        </linearGradient>
        <linearGradient id={capId} x1='80' y1='12' x2='80' y2='38' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#ffffff' />
          <stop offset='1' stopColor='#dcecff' />
        </linearGradient>
        <filter id={shadowId} x='-40%' y='-30%' width='180%' height='170%'>
          <feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#3b82f6' floodOpacity='0.55' />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        {/* small side drips */}
        <path d='M56 30Q52 52 58 76Q60 52 64 30Z' fill={`url(#${iceId})`} opacity='0.85' />
        <path d='M100 30Q104 48 102 66Q106 48 110 30Z' fill={`url(#${iceId})`} opacity='0.85' />

        {/* main icicle */}
        <path
          d='M64 30Q58 70 74 110Q78 124 80 134Q82 124 88 110Q102 70 98 30Z'
          fill={`url(#${iceId})`}
          stroke='rgba(255, 255, 255, 0.9)'
          strokeWidth='1.6'
          strokeLinejoin='round'
        />
        {/* deeper blue volume on the shaded side */}
        <path d='M80 34Q84 80 82 120Q96 80 96 34Z' fill='#7cb8ff' opacity='0.35' />
        {/* gloss */}
        <path
          d='M70 36Q66 70 76 104'
          fill='none'
          stroke='#ffffff'
          strokeWidth='3'
          strokeLinecap='round'
          opacity='0.85'
        />
        <path
          d='M90 40Q92 60 88 80'
          fill='none'
          stroke='#ffffff'
          strokeWidth='1.5'
          strokeLinecap='round'
          opacity='0.5'
        />

        {/* snow cap */}
        <path d='M44 30Q60 12 80 16Q100 10 116 30Q100 38 80 36Q60 40 44 30Z' fill={`url(#${capId})`} />
        <path d='M50 31Q65 36 80 35Q95 37 110 31' fill='none' stroke='#b9d6ff' strokeWidth='1.2' opacity='0.7' />

        {/* glint and a drop forming at the tip */}
        <circle cx='72' cy='48' r='2.4' fill='#ffffff'>
          <animate attributeName='opacity' values='0.2;1;0.2' dur='2.4s' repeatCount='indefinite' />
        </circle>
        <circle cx='80' cy='135' r='2' fill='#dbeeff' opacity='0.95' />
      </g>
    </svg>
  );
};

export default NewYearPointer;
