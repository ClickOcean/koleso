import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/** Ginger cat paw in SVG, toe beans at the bottom: stands in until the paw photo loads */
const TaiwanPointerDrawn = ({ layout }: PointerProps) => {
  const width = Math.round(46 * layout.scale + 18);
  const height = Math.round(width * 1.7);

  return (
    <svg
      aria-hidden='true'
      className={classes.wheelPointer}
      width={width}
      height={height}
      viewBox='0 0 60 102'
      style={{ transform: 'translate(-50%, -48%)', filter: 'drop-shadow(0 3px 5px rgba(0, 0, 0, 0.5))' }}
    >
      <defs>
        <linearGradient id='taiwan-paw-fur' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#e9a44c' stopOpacity='0' />
          <stop offset='0.35' stopColor='#e9a44c' />
          <stop offset='1' stopColor='#f6c98a' />
        </linearGradient>
      </defs>
      <path d='M12 0 H48 V62 C48 88 42 100 30 100 C18 100 12 88 12 62 Z' fill='url(#taiwan-paw-fur)' />
      <ellipse cx='30' cy='84' rx='9' ry='7' fill='#f3a3b0' />
      <circle cx='19' cy='72' r='4.2' fill='#f3a3b0' />
      <circle cx='27' cy='67' r='4.2' fill='#f3a3b0' />
      <circle cx='35' cy='67' r='4.2' fill='#f3a3b0' />
      <circle cx='42' cy='72' r='4.2' fill='#f3a3b0' />
    </svg>
  );
};

export default TaiwanPointerDrawn;
