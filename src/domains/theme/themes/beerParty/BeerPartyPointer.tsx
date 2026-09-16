import { useEffect, useState } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import BeerPartyPointerDrawn from './BeerPartyPointerDrawn';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/** Photo of a classic brown beer bottle (generated), upright, transparent background */
export const BOTTLE_IMAGE = '/themes/beerParty/bottle.png';

type LoadState = 'loading' | 'ready' | 'missing';

let cachedState: LoadState = 'loading';

/**
 * The signature pointer: a real-looking beer bottle hanging neck-down over the rim.
 * Uses the generated photo when it is present in public/themes/beerParty; until it
 * loads, or if it is missing, the hand-drawn SVG bottle stands in.
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

  const height = Math.max(80, Math.round(layout.targetWheelSize * 0.21));

  return (
    <img
      src={BOTTLE_IMAGE}
      alt=''
      aria-hidden='true'
      className={classes.wheelPointer}
      style={{
        height,
        width: 'auto',
        // neck down: the cap is the tip touching the rim; the bottle base rises into the title gap
        transform: 'translate(-50%, -34%) rotate(180deg)',
        filter: 'drop-shadow(0 6px 10px rgba(0, 0, 0, 0.55))',
        animation: 'beer-bottle-wobble 3.2s ease-in-out infinite',
      }}
    />
  );
};

export default BeerPartyPointer;
