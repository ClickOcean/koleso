import { useId } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

const DIAL_TICKS = 11;

/** Pressure-gauge pointer: a dark red needle on a brass hub, pointing down at the rim. */
const SteampunkPointer = ({ layout }: PointerProps) => {
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = Math.max(62, Math.round(layout.targetWheelSize * 0.17));
  const shadowId = `${idPrefix}-shadow`;
  const bezelId = `${idPrefix}-bezel`;
  const needleId = `${idPrefix}-needle`;
  const pinId = `${idPrefix}-pin`;

  const ticks = Array.from({ length: DIAL_TICKS }, (_, index) => {
    // ticks span a 240 degree gauge arc centred on the top of the dial; the gap at the bottom is where the needle exits
    const angle = -Math.PI / 2 + (index / (DIAL_TICKS - 1) - 0.5) * ((4 * Math.PI) / 3);
    const isMajor = index % 5 === 0;
    const outer = 17;
    const inner = isMajor ? 12 : 14;
    return {
      x1: 80 + Math.cos(angle) * inner,
      y1: 38 + Math.sin(angle) * inner,
      x2: 80 + Math.cos(angle) * outer,
      y2: 38 + Math.sin(angle) * outer,
      isMajor,
    };
  });

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
        <radialGradient id={bezelId} cx='0.35' cy='0.3' r='0.8'>
          <stop offset='0' stopColor='#f6dd9a' />
          <stop offset='0.5' stopColor='#c0913a' />
          <stop offset='1' stopColor='#6b4712' />
        </radialGradient>
        <linearGradient id={needleId} x1='70' y1='0' x2='90' y2='0' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#c62828' />
          <stop offset='0.5' stopColor='#8e1515' />
          <stop offset='1' stopColor='#4a0a0a' />
        </linearGradient>
        <radialGradient id={pinId} cx='0.35' cy='0.3' r='0.75'>
          <stop offset='0' stopColor='#fff1c4' />
          <stop offset='0.6' stopColor='#c9a04a' />
          <stop offset='1' stopColor='#5c3d0f' />
        </radialGradient>
        <filter id={shadowId} x='-30%' y='-30%' width='160%' height='160%'>
          <feGaussianBlur in='SourceAlpha' stdDeviation='2.2' result='blur' />
          <feOffset in='blur' dx='0' dy='2' result='offset' />
          <feComponentTransfer in='offset' result='shadow'>
            <feFuncA type='linear' slope='0.55' />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in='shadow' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        {/* mounting bracket behind the gauge */}
        <rect x='68' y='2' width='24' height='42' rx='5' fill='#3a2610' stroke='#1d1206' strokeWidth='1.5' />
        <rect
          x='72'
          y='6'
          width='16'
          height='34'
          rx='3'
          fill='none'
          stroke='rgba(214, 168, 78, 0.35)'
          strokeWidth='1'
        />

        {/* brass bezel and dark dial */}
        <circle cx='80' cy='38' r='27' fill={`url(#${bezelId})`} stroke='#2b1a0e' strokeWidth='2.5' />
        <circle cx='80' cy='38' r='21' fill='none' stroke='rgba(43, 26, 14, 0.7)' strokeWidth='1' />
        <circle cx='80' cy='38' r='19' fill='#1d1208' stroke='#d6a84e' strokeWidth='1' />
        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.isMajor ? '#f3e3c3' : 'rgba(243, 227, 195, 0.55)'}
            strokeWidth={tick.isMajor ? 1.6 : 1}
            strokeLinecap='round'
          />
        ))}

        {/* needle with counterweight; quivers slightly like a live gauge */}
        <g>
          <animateTransform
            attributeName='transform'
            type='rotate'
            values='-1.6 80 38; 1.6 80 38; -1.6 80 38'
            dur='2.8s'
            repeatCount='indefinite'
          />
          <path
            d='M80 134L74.5 46L80 32L85.5 46Z'
            fill={`url(#${needleId})`}
            stroke='#2b0808'
            strokeWidth='1.2'
            strokeLinejoin='round'
          />
          <path
            d='M80 134L77.6 48'
            fill='none'
            stroke='rgba(255, 140, 140, 0.55)'
            strokeWidth='1'
            strokeLinecap='round'
          />
          <path d='M77 34L80 10L83 34Z' fill='#5a0f0f' stroke='#2b0808' strokeWidth='1' strokeLinejoin='round' />
          <circle cx='80' cy='13' r='4.5' fill='#7a1414' stroke='#2b0808' strokeWidth='1' />
          <circle cx='80' cy='38' r='5.5' fill={`url(#${pinId})`} stroke='#3a2610' strokeWidth='1.2' />
          <circle cx='78.5' cy='36.5' r='1.6' fill='rgba(255, 245, 220, 0.85)' />
        </g>
      </g>
    </svg>
  );
};

export default SteampunkPointer;
