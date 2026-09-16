import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import { CASINO_GOLD, CASINO_RUBY } from './casinoTokens';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

const TEARDROP = 'M80 140C62 100 46 78 46 52C46 30 62 20 80 20C98 20 114 30 114 52C114 78 98 100 80 140Z';
const TEARDROP_INSET = 'M80 126C67 96 55 78 55 55C55 38 66 29 80 29C94 29 105 38 105 55C105 78 93 96 80 126Z';
const LEFT_HIGHLIGHT = 'M52 60C51 40 62 26 78 24';

/** Brass pendant pointer with a ruby set in gold prongs; a warm glow lifts it off the rim. */
const CasinoPointer = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(62, Math.round(layout.targetWheelSize * 0.17));
  const glowId = `${idPrefix}-glow`;
  const brassId = `${idPrefix}-brass`;
  const jewelId = `${idPrefix}-jewel`;

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
        <linearGradient id={brassId} x1='46' y1='20' x2='114' y2='140' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#fff1b8' />
          <stop offset='0.35' stopColor='#e2b93b' />
          <stop offset='0.62' stopColor={CASINO_GOLD} />
          <stop offset='1' stopColor='#6e4c05' />
        </linearGradient>
        <radialGradient id={jewelId} cx='0.36' cy='0.3' r='0.78'>
          <stop offset='0' stopColor='#ffb8c6' />
          <stop offset='0.42' stopColor={CASINO_RUBY} />
          <stop offset='1' stopColor='#5c0619' />
        </radialGradient>
        <filter id={glowId} x='-40%' y='-40%' width='180%' height='180%'>
          <feGaussianBlur in='SourceAlpha' stdDeviation='5' result='blur' />
          <feFlood floodColor='#ffb347' floodOpacity='0.7' />
          <feComposite in2='blur' operator='in' result='glow' />
          <feMerge>
            <feMergeNode in='glow' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${glowId})`}>
        <path d={TEARDROP} fill={`url(#${brassId})`} stroke='#3d2a05' strokeWidth='2.5' strokeLinejoin='round' />
        <path d={TEARDROP_INSET} fill='none' stroke='rgba(90, 60, 6, 0.55)' strokeWidth='2' />
        <path d={LEFT_HIGHLIGHT} fill='none' stroke='#fff6d0' strokeWidth='2' strokeLinecap='round' opacity='0.75' />

        <circle cx='80' cy='56' r='18' fill='#2b0410' />
        <circle cx='80' cy='56' r='15.5' fill={`url(#${jewelId})`} stroke='#ffe08a' strokeWidth='1.8' />
        {[45, 135, 225, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <circle
              key={deg}
              cx={80 + Math.cos(rad) * 15.5}
              cy={56 + Math.sin(rad) * 15.5}
              r='2.4'
              fill='#f6dd8f'
              stroke='#5a3f06'
              strokeWidth='0.8'
            />
          );
        })}
        <ellipse cx='74' cy='49' rx='5' ry='3.2' fill='#ffffff' opacity='0.7'>
          <animate attributeName='opacity' values='0.5;0.9;0.5' dur='2.4s' repeatCount='indefinite' />
        </ellipse>
      </g>
    </svg>
  );
};

export default CasinoPointer;
