import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/**
 * Classic long-neck bottle silhouette, drawn neck DOWN in a 100×220 box:
 * flat base at the top (y 6), straight body to y 118, shoulders curving into
 * the neck (y 118..150), neck to y 196, crown cap 196..214.
 */
const BOTTLE =
  'M27 12C27 8 30 6 34 6L66 6C70 6 73 8 73 12L73 118C73 132 68 140 62 150L60 156L60 196L40 196L40 156L38 150C32 140 27 132 27 118Z';
const GLASS_SHINE = 'M32 14C32 10 35 8 38 9L38 112C37 116 34 118 32 116Z';
const NECK_SHINE = 'M42 158L45 158L45 194L42 194Z';
const CAP = 'M36 196L64 196L64 210L36 210Z';

/**
 * Hand-drawn classic brown long-neck beer bottle hanging neck-down, the crown cap
 * marking the winner. Stands in until the generated bottle photo is available.
 */
const BeerPartyPointerDrawn = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(80, Math.round(layout.targetWheelSize * 0.21));
  const glassId = `${idPrefix}-glass`;
  const capId = `${idPrefix}-cap`;
  const labelId = `${idPrefix}-label`;
  const foilId = `${idPrefix}-foil`;

  return (
    <svg
      className={classes.wheelPointer}
      style={{ transform: 'translate(-50%, -34%)' }}
      width={Math.round((size * 100) / 220)}
      height={size}
      viewBox='0 0 100 220'
      aria-hidden='true'
    >
      <defs>
        <linearGradient id={glassId} x1='27' y1='0' x2='73' y2='0' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#2a1204' />
          <stop offset='0.18' stopColor='#6b330b' />
          <stop offset='0.42' stopColor='#a85a17' />
          <stop offset='0.62' stopColor='#8a4510' />
          <stop offset='0.85' stopColor='#4a2007' />
          <stop offset='1' stopColor='#1f0d03' />
        </linearGradient>
        <linearGradient id={capId} x1='36' y1='0' x2='64' y2='0' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#8f979e' />
          <stop offset='0.35' stopColor='#f4f6f8' />
          <stop offset='0.6' stopColor='#c9ced3' />
          <stop offset='1' stopColor='#6f777e' />
        </linearGradient>
        <linearGradient id={labelId} x1='0' y1='40' x2='0' y2='100' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#f6ead0' />
          <stop offset='1' stopColor='#e5d2a8' />
        </linearGradient>
        <linearGradient id={foilId} x1='40' y1='0' x2='60' y2='0' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#8a6a1a' />
          <stop offset='0.5' stopColor='#f1d27a' />
          <stop offset='1' stopColor='#8a6a1a' />
        </linearGradient>
      </defs>
      <g>
        <animateTransform
          attributeName='transform'
          type='rotate'
          values='-1.5 50 205; 1.5 50 205; -1.5 50 205'
          dur='3.4s'
          repeatCount='indefinite'
        />
        {/* soft drop shadow */}
        <path d={BOTTLE} fill='rgba(0, 0, 0, 0.35)' transform='translate(3 4)' />
        <path d={BOTTLE} fill={`url(#${glassId})`} stroke='#170a02' strokeWidth='1.2' />
        <path d={GLASS_SHINE} fill='rgba(255, 220, 170, 0.32)' />
        <path d={NECK_SHINE} fill='rgba(255, 220, 170, 0.28)' />
        {/* gold foil around the neck */}
        <rect x='40' y='150' width='20' height='10' fill={`url(#${foilId})`} stroke='#5a4210' strokeWidth='0.6' />
        {/* main label: cream with a red band and gold rules, no text */}
        <rect x='29' y='40' width='42' height='60' rx='3' fill={`url(#${labelId})`} stroke='#8a6a3a' strokeWidth='0.8' />
        <rect x='29' y='60' width='42' height='18' fill='#b3261e' />
        <rect x='29' y='60' width='42' height='1.6' fill='#e0a526' />
        <rect x='29' y='76.4' width='42' height='1.6' fill='#e0a526' />
        <circle cx='50' cy='69' r='5' fill='#f6ead0' stroke='#e0a526' strokeWidth='1' />
        <rect x='36' y='46' width='28' height='2.2' rx='1' fill='#8a6a3a' opacity='0.6' />
        <rect x='40' y='51' width='20' height='1.6' rx='0.8' fill='#8a6a3a' opacity='0.45' />
        <rect x='38' y='86' width='24' height='2' rx='1' fill='#8a6a3a' opacity='0.5' />
        {/* condensation drops */}
        <circle cx='33' cy='28' r='1.6' fill='rgba(255, 255, 255, 0.55)' />
        <circle cx='66' cy='104' r='1.3' fill='rgba(255, 255, 255, 0.5)' />
        <circle cx='63' cy='24' r='1.1' fill='rgba(255, 255, 255, 0.45)' />
        {/* crown cap with serrated edge at the very tip */}
        <path d={CAP} fill={`url(#${capId})`} stroke='#4b5258' strokeWidth='0.8' />
        <path
          d='M36 210L38.5 214L41 210L43.5 214L46 210L48.5 214L51 210L53.5 214L56 210L58.5 214L61 210L63.5 214L64 210Z'
          fill='#8f979e'
          stroke='#4b5258'
          strokeWidth='0.6'
        />
        <rect x='38' y='198' width='24' height='3' fill='rgba(255, 255, 255, 0.5)' />
        {/* a drop of foam escaping past the cap */}
        <path d='M47 214C47 218 45 220 45 223C45 225.5 49 225.5 49 223C49 220 51 218 51 214Z' fill='#fbf2dc' opacity='0.9' />
      </g>
    </svg>
  );
};

export default BeerPartyPointerDrawn;
