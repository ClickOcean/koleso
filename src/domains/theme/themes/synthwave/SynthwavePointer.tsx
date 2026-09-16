import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import { SYNTH_CYAN, SYNTH_PINK } from './palette';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/** Neon chevron pointing down at the wheel: pink blade with a pulsing cyan echo above it. */
const SynthwavePointer = ({ layout }: PointerProps) => {
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
        <linearGradient id={gradientId} x1='80' y1='40' x2='80' y2='132' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#ff9ad5' />
          <stop offset='0.5' stopColor={SYNTH_PINK} />
          <stop offset='1' stopColor='#7a0fa8' />
        </linearGradient>
        <filter id={glowId} x='-50%' y='-50%' width='200%' height='200%'>
          <feGaussianBlur in='SourceGraphic' stdDeviation='6' result='blur' />
          <feFlood floodColor={SYNTH_PINK} floodOpacity='0.9' result='tint' />
          <feComposite in='tint' in2='blur' operator='in' result='glow' />
          <feMerge>
            <feMergeNode in='glow' />
            <feMergeNode in='glow' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${glowId})`}>
        <path
          d='M44 24L80 46L116 24'
          fill='none'
          stroke={SYNTH_CYAN}
          strokeWidth='6'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <animate attributeName='opacity' values='1;0.4;1' dur='1.6s' repeatCount='indefinite' />
        </path>
        <path d='M80 132L46 44L80 64L114 44Z' fill={`url(#${gradientId})`} />
        <path d='M80 132L46 44L80 64L114 44Z' fill='none' stroke='#ffe3f3' strokeWidth='3' strokeLinejoin='round' />
        <path d='M80 116L62 62L80 72L98 62Z' fill='#12052a' opacity='0.8' />
        <path d='M80 110L70 74L80 80L90 74Z' fill={SYNTH_CYAN} opacity='0.9' />
      </g>
    </svg>
  );
};

export default SynthwavePointer;
