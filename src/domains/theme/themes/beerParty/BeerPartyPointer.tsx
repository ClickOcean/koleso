import { useEffect, useState } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import { BOTTLE_ASPECT } from './beerPartyTokens';
import BeerPartyPointerDrawn from './BeerPartyPointerDrawn';
import { bottleGeometry } from './bottleGeometry';

import type { CSSProperties } from 'react';
import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/** Photo of a classic brown beer bottle (generated), upright, 238 × 900, transparent background */
export const BOTTLE_IMAGE = '/themes/beerParty/bottle.png';

type LoadState = 'loading' | 'ready' | 'missing';

let cachedState: LoadState = 'loading';

/**
 * The signature pointer: a real-looking beer bottle hanging neck-down over the rim.
 * Uses the generated photo when it is present in public/themes/beerParty; until it
 * loads, or if it is missing, the hand-drawn SVG bottle stands in.
 *
 * Geometry: the <img> box is the upright bottle with `transform-origin` on the cap tip
 * (top centre). `translate(-50%, dip) rotate(180deg)` turns it cap-down with the cap
 * `dip` px past the wheel edge and the base `protrusion` px above it, inside the title
 * gap. The swing (`.beer-party-bottle`, beerParty.css) pivots on that same point.
 */
const BeerPartyPointer = ({ layout }: PointerProps) => {
  const [state, setState] = useState<LoadState>(cachedState);

  useEffect(() => {
    if (cachedState !== 'loading') {
      return;
    }

    const probe = new Image();
    probe.onload = () => {
      cachedState = 'ready';
      setState('ready');
    };
    probe.onerror = () => {
      cachedState = 'missing';
      setState('missing');
    };
    probe.src = BOTTLE_IMAGE;

    return () => {
      probe.onload = null;
      probe.onerror = null;
    };
  }, []);

  if (state !== 'ready') {
    return <BeerPartyPointerDrawn layout={layout} />;
  }

  const { dip, height } = bottleGeometry(layout);
  const style = {
    height,
    width: Math.round(height * BOTTLE_ASPECT),
    transformOrigin: '50% 0',
    transform: `translate(-50%, ${dip}px) rotate(180deg)`,
    // отрицательный сдвиг: после поворота на 180° тень должна падать вниз, а не к заголовку
    filter: 'drop-shadow(0 -4px 6px rgba(0, 0, 0, 0.55))',
    '--beer-bottle-dip': `${dip}px`,
  } as CSSProperties;

  return (
    <img
      src={BOTTLE_IMAGE}
      alt=''
      aria-hidden='true'
      className={`${classes.wheelPointer} beer-party-bottle`}
      style={style}
    />
  );
};

export default BeerPartyPointer;
