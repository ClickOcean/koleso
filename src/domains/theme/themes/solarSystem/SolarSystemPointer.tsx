import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/** Ion tail: straight, narrow, pointing away from the Sun (up) */
const ION_TAIL = 'M80 128C74 104 70 74 76 16C78 8 82 8 84 16C90 74 86 104 80 128Z';
/** Dust tail: broader and curved */
const DUST_TAIL = 'M80 128C66 108 52 84 48 30C47 20 52 20 56 28C68 78 76 104 80 128Z';
const DUST_TAIL_2 = 'M80 128C92 106 104 84 110 36C111 27 106 26 103 34C92 80 86 104 80 128Z';

/**
 * A comet diving head-first at the rim: an icy nucleus with a bright coma at the
 * bottom, an ion tail streaming straight up and two softer dust tails. The whole
 * body drifts a little, like it is coasting past.
 */
const SolarSystemPointer = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(70, Math.round(layout.targetWheelSize * 0.2));
  const glowId = `${idPrefix}-glow`;
  const comaId = `${idPrefix}-coma`;
  const nucleusId = `${idPrefix}-nucleus`;
  const ionId = `${idPrefix}-ion`;
  const dustId = `${idPrefix}-dust`;

  return (
    <svg
      className={classes.wheelPointer}
      style={{ transform: 'translate(-50%, -58%)' }}
      width={size}
      height={size}
      viewBox='0 0 160 160'
      aria-hidden='true'
    >
      <defs>
        <linearGradient id={ionId} x1='0' y1='128' x2='0' y2='10' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#e8fbff' stopOpacity='0.95' />
          <stop offset='0.35' stopColor='#7fd8ff' stopOpacity='0.6' />
          <stop offset='1' stopColor='#3b82f6' stopOpacity='0' />
        </linearGradient>
        <linearGradient id={dustId} x1='0' y1='128' x2='0' y2='20' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#fff4d6' stopOpacity='0.8' />
          <stop offset='0.4' stopColor='#ffd9a0' stopOpacity='0.35' />
          <stop offset='1' stopColor='#ffb066' stopOpacity='0' />
        </linearGradient>
        <radialGradient id={comaId} cx='0.5' cy='0.5' r='0.5'>
          <stop offset='0' stopColor='#ffffff' stopOpacity='0.95' />
          <stop offset='0.35' stopColor='#c8f1ff' stopOpacity='0.75' />
          <stop offset='1' stopColor='#7fd8ff' stopOpacity='0' />
        </radialGradient>
        <radialGradient id={nucleusId} cx='0.4' cy='0.35' r='0.7'>
          <stop offset='0' stopColor='#ffffff' />
          <stop offset='0.55' stopColor='#cfe9f5' />
          <stop offset='1' stopColor='#5b7c8f' />
        </radialGradient>
        <filter id={glowId} x='-40%' y='-40%' width='180%' height='180%'>
          <feGaussianBlur in='SourceGraphic' stdDeviation='2.5' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${glowId})`}>
        <animateTransform
          attributeName='transform'
          type='translate'
          values='0 0; 0 -3; 0 0'
          dur='2.6s'
          repeatCount='indefinite'
        />
        <path d={DUST_TAIL} fill={`url(#${dustId})`} opacity='0.85' />
        <path d={DUST_TAIL_2} fill={`url(#${dustId})`} opacity='0.7' />
        <path d={ION_TAIL} fill={`url(#${ionId})`}>
          <animate attributeName='opacity' values='0.9;0.6;0.9' dur='1.4s' repeatCount='indefinite' />
        </path>
        <circle cx='80' cy='130' r='24' fill={`url(#${comaId})`} />
        <circle cx='80' cy='132' r='11' fill={`url(#${nucleusId})`} stroke='#eaf7ff' strokeWidth='1.5' />
        <circle cx='76' cy='128' r='2.2' fill='#ffffff' opacity='0.9' />
      </g>
    </svg>
  );
};

export default SolarSystemPointer;
