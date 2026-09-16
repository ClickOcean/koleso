import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import { AMBER, AMBER_BRIGHT, AMBER_HOT } from './palette';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/**
 * Terminal cursor pointer: a block cursor on top of a short amber blade. The
 * block and the underscore below it blink in counter-phase, like a cursor
 * switching between block and underline mode.
 */
const TerminalPointer = ({ layout }: PointerProps) => {
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
        <linearGradient id={gradientId} x1='80' y1='68' x2='80' y2='134' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor={AMBER_BRIGHT} />
          <stop offset='0.5' stopColor={AMBER} />
          <stop offset='1' stopColor='#8a5200' />
        </linearGradient>
        <filter id={glowId} x='-40%' y='-40%' width='180%' height='180%'>
          <feGaussianBlur stdDeviation='5' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${glowId})`}>
        <path d='M80 134L62 68L98 68Z' fill={`url(#${gradientId})`} />
        <path d='M80 134L62 68L98 68Z' fill='none' stroke={AMBER_HOT} strokeWidth='2.5' strokeLinejoin='round' />
        <path d='M80 118L71 76L89 76Z' fill='#1a0f02' opacity='0.85' />

        <rect x='58' y='20' width='44' height='48' fill='#1a0f02' stroke={AMBER} strokeWidth='2' opacity='0.92' />
        <rect x='62' y='24' width='36' height='40' fill={AMBER}>
          <animate attributeName='opacity' values='1;0.08' dur='1.06s' calcMode='discrete' repeatCount='indefinite' />
        </rect>
        <rect x='62' y='58' width='36' height='6' fill={AMBER_HOT}>
          <animate attributeName='opacity' values='0.15;1' dur='1.06s' calcMode='discrete' repeatCount='indefinite' />
        </rect>
      </g>
    </svg>
  );
};

export default TerminalPointer;
