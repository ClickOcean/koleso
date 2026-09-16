import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/** Three states of the pennant, same path structure so SMIL can tween between them */
const FLAG_REST = 'M85 16 C 108 20, 128 26, 146 36 C 128 46, 108 56, 85 70 Z';
const FLAG_WAVE = 'M85 16 C 104 28, 132 18, 146 40 C 122 42, 106 62, 85 70 Z';
const FLAG_VALUES = `${FLAG_REST}; ${FLAG_WAVE}; ${FLAG_REST}`;

/** Assistant referee's flag: a slim pole pointing at the wheel with a waving yellow-and-red pennant. */
const StadiumPointer = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(62, Math.round(layout.targetWheelSize * 0.17));
  const flagGradientId = `${idPrefix}-flag`;
  const poleGradientId = `${idPrefix}-pole`;
  const checkerId = `${idPrefix}-checker`;
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
        <linearGradient id={flagGradientId} x1='85' y1='16' x2='146' y2='70' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#fef08a' />
          <stop offset='0.5' stopColor='#facc15' />
          <stop offset='1' stopColor='#f59e0b' />
        </linearGradient>
        <linearGradient id={poleGradientId} x1='75' y1='0' x2='85' y2='0' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#d1d5db' />
          <stop offset='0.45' stopColor='#f9fafb' />
          <stop offset='1' stopColor='#6b7280' />
        </linearGradient>
        <pattern id={checkerId} x='85' y='16' width='14' height='14' patternUnits='userSpaceOnUse'>
          <rect x='0' y='0' width='7' height='7' fill='#ef4444' fillOpacity='0.85' />
          <rect x='7' y='7' width='7' height='7' fill='#ef4444' fillOpacity='0.85' />
        </pattern>
        <filter id={shadowId} x='-30%' y='-20%' width='170%' height='150%'>
          <feDropShadow dx='0' dy='4' stdDeviation='4' floodColor='#000000' floodOpacity='0.55' />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        {/* pole with a knob on top and the tip that points at the wheel */}
        <path
          d='M76 12 H84 V118 H76 Z'
          fill={`url(#${poleGradientId})`}
          stroke='#111827'
          strokeWidth='2'
          strokeLinejoin='round'
        />
        <circle cx='80' cy='11' r='5' fill='#f9fafb' stroke='#111827' strokeWidth='2' />
        <rect x='75' y='90' width='10' height='22' rx='2' fill='#111827' />
        <path d='M75 118 H85 L80 136 Z' fill='#e5e7eb' stroke='#111827' strokeWidth='2' strokeLinejoin='round' />

        {/* pennant: yellow base, red checker, dark outline; all three tween together */}
        <path d={FLAG_REST} fill={`url(#${flagGradientId})`}>
          <animate attributeName='d' values={FLAG_VALUES} dur='1.9s' repeatCount='indefinite' />
        </path>
        <path d={FLAG_REST} fill={`url(#${checkerId})`}>
          <animate attributeName='d' values={FLAG_VALUES} dur='1.9s' repeatCount='indefinite' />
        </path>
        <path d={FLAG_REST} fill='none' stroke='#111827' strokeWidth='2.5' strokeLinejoin='round'>
          <animate attributeName='d' values={FLAG_VALUES} dur='1.9s' repeatCount='indefinite' />
        </path>
        {/* hoist highlight next to the pole, where the cloth barely moves */}
        <path d='M86 20 L98 23 L98 63 L86 66 Z' fill='rgba(255, 255, 255, 0.28)' />
      </g>
    </svg>
  );
};

export default StadiumPointer;
