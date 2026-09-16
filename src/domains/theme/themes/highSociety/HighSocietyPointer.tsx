import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import { HS_GOLD, HS_IVORY } from './highSocietyTokens';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/**
 * Geometry in viewBox units (160 = the svg size, 0.2 of the wheel). The bottle hangs
 * neck-down from y=60 (base) to y=158 (a champagne drop on the cork). With the svg top
 * translated 60 % up the drop lands about 0.08 of the wheel inside the rim and the base
 * sits 0.045 of the wheel above the edge (36 px at 800 px), the same reach as the Matrix
 * and Casino pointers, so it only grazes the bottom of the winner title line box
 * (`.wheelTarget`: 36 px line + 22 px margin above the edge) instead of crossing the name.
 */
const GLASS =
  'M66 60L94 60Q98 60 98 64L98 106C98 118 88 122 87 132L87 142L73 142L73 132C72 122 62 118 62 106L62 64Q62 60 66 60Z';
const FOIL = 'M62 108C63 118 72 122 73 132L73 142L87 142L87 132C88 122 97 118 98 108Q80 113 62 108Z';
const FOIL_EDGE = 'M62 108Q80 113 98 108';
const CAP = 'M71 138L89 138L89 147Q89 151 85 151L75 151Q71 151 71 147Z';
const DROP = 'M80 158C76.4 153.6 76 150.8 80 149.4C84 150.8 83.6 153.6 80 158Z';
const DIAMOND = 'M80 78L86 86L80 94L74 86Z';
const DIAMOND_INNER = 'M80 81.5L83.5 86L80 90.5L76.5 86Z';

/** Sparkling-wine bottle pointing neck-down at the wheel: green glass, gold foil, cream label. */
const HighSocietyPointer = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(80, Math.round(layout.targetWheelSize * 0.2));
  const glowId = `${idPrefix}-glow`;
  const glassId = `${idPrefix}-glass`;
  const foilId = `${idPrefix}-foil`;
  const capId = `${idPrefix}-cap`;
  const dropId = `${idPrefix}-drop`;

  return (
    <svg
      className={classes.wheelPointer}
      style={{ transform: 'translate(-50%, -52%)' }}
      width={size}
      height={size}
      viewBox='0 0 160 160'
      aria-hidden='true'
    >
      <defs>
        <linearGradient id={glassId} x1='62' y1='0' x2='98' y2='0' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#071a0c' />
          <stop offset='0.3' stopColor='#1d5a2b' />
          <stop offset='0.5' stopColor='#174a22' />
          <stop offset='0.8' stopColor='#0c2e14' />
          <stop offset='1' stopColor='#04110a' />
        </linearGradient>
        <linearGradient id={foilId} x1='62' y1='0' x2='98' y2='0' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#8c6a10' />
          <stop offset='0.28' stopColor='#f5df92' />
          <stop offset='0.5' stopColor='#d9b23a' />
          <stop offset='0.75' stopColor='#a8830f' />
          <stop offset='1' stopColor='#6b520a' />
        </linearGradient>
        <linearGradient id={capId} x1='0' y1='138' x2='0' y2='151' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#f2d77a' />
          <stop offset='0.5' stopColor={HS_GOLD} />
          <stop offset='1' stopColor='#9a7a16' />
        </linearGradient>
        <radialGradient id={dropId} cx='0.4' cy='0.35' r='0.75'>
          <stop offset='0' stopColor='#fff7d6' />
          <stop offset='0.55' stopColor='#e6c65c' />
          <stop offset='1' stopColor='#b8901a' />
        </radialGradient>
        <filter id={glowId} x='-40%' y='-15%' width='180%' height='130%'>
          <feGaussianBlur in='SourceAlpha' stdDeviation='4' result='blur' />
          <feFlood floodColor='#e2c05a' floodOpacity='0.6' />
          <feComposite in2='blur' operator='in' result='glow' />
          <feMerge>
            <feMergeNode in='glow' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${glowId})`}>
        {/* green glass */}
        <path d={GLASS} fill={`url(#${glassId})`} stroke='#061408' strokeWidth='0.9' strokeLinejoin='round' />
        <ellipse cx='80' cy='61' rx='18' ry='2.4' fill='#0a2110' stroke='rgba(255, 255, 255, 0.15)' strokeWidth='0.6' />
        <rect x='67' y='66' width='3' height='42' rx='1.5' fill='#ffffff' opacity='0.22' />
        <rect x='93' y='66' width='1.4' height='38' rx='0.7' fill='#ffffff' opacity='0.08' />

        {/* cream label with a gold diamond */}
        <rect x='68' y='72' width='24' height='28' rx='1.2' fill={HS_IVORY} stroke={HS_GOLD} strokeWidth='1.1' />
        <rect
          x='69.8'
          y='73.8'
          width='20.4'
          height='24.4'
          rx='0.8'
          fill='none'
          stroke='rgba(201, 162, 39, 0.55)'
          strokeWidth='0.5'
        />
        <line x1='72' y1='76' x2='88' y2='76' stroke={HS_GOLD} strokeWidth='0.6' opacity='0.8' />
        <line x1='72' y1='96' x2='88' y2='96' stroke={HS_GOLD} strokeWidth='0.6' opacity='0.8' />
        <path d={DIAMOND} fill={HS_GOLD} />
        <path d={DIAMOND_INNER} fill={HS_IVORY} />
        <circle cx='80' cy='86' r='1.2' fill={HS_GOLD} />

        {/* gold foil over the shoulder and neck */}
        <path d={FOIL} fill={`url(#${foilId})`} stroke='#5a4408' strokeWidth='0.6' strokeLinejoin='round' />
        <path d={FOIL_EDGE} fill='none' stroke='rgba(255, 240, 190, 0.7)' strokeWidth='0.8' />
        <line x1='73.5' y1='125' x2='86.5' y2='125' stroke='rgba(80, 55, 5, 0.45)' strokeWidth='0.7' />
        <line x1='73.5' y1='136' x2='86.5' y2='136' stroke='rgba(80, 55, 5, 0.45)' strokeWidth='0.7' />
        <rect
          x='73'
          y='128.5'
          width='14'
          height='3.6'
          fill={HS_IVORY}
          opacity='0.92'
          stroke={HS_GOLD}
          strokeWidth='0.5'
        />

        {/* cork cap */}
        <path d={CAP} fill={`url(#${capId})`} stroke='#5a4408' strokeWidth='0.6' strokeLinejoin='round' />
        <line x1='71.5' y1='141.5' x2='88.5' y2='141.5' stroke='rgba(255, 245, 200, 0.5)' strokeWidth='0.7' />
        <rect x='73.5' y='139.5' width='2.4' height='9' rx='1' fill='#ffffff' opacity='0.22' />

        {/* a drop of champagne marks the tip */}
        <path d={DROP} fill={`url(#${dropId})`}>
          <animate attributeName='opacity' values='0.85;1;0.85' dur='1.8s' repeatCount='indefinite' />
        </path>
        <circle cx='79' cy='151.4' r='0.8' fill='#ffffff' opacity='0.85' />
      </g>
    </svg>
  );
};

export default HighSocietyPointer;
