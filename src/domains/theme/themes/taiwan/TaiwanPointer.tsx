import { useEffect, useState } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import TaiwanPointerDrawn from './TaiwanPointerDrawn';
import { TW_ASSETS } from './taiwanTokens';

import type { CSSProperties } from 'react';
import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/**
 * The paw sticks out over the rim no higher than the gap reserved for the title and reaches
 * `DIP` into the wheel, so the toe beans rest on the sleeping cats (the ring starts at 0.75 R).
 */
const PROTRUSION_RATIO = 0.08;
const PROTRUSION_MAX = 64;
const DIP = 44;

type LoadState = 'loading' | 'ready' | 'missing';

let cachedState: LoadState = 'loading';

/**
 * A ginger cat paw reaching down onto the wheel, toe beans pointing at the winner. Until the
 * photo loads, or if it is missing, the SVG paw (`TaiwanPointerDrawn`) stands in.
 */
const TaiwanPointer = ({ layout }: PointerProps) => {
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
    probe.src = TW_ASSETS.pointer;

    return () => {
      probe.onload = null;
      probe.onerror = null;
    };
  }, []);

  if (state !== 'ready') {
    return <TaiwanPointerDrawn layout={layout} />;
  }

  const protrusion = Math.min(PROTRUSION_MAX, Math.round(layout.targetWheelSize * PROTRUSION_RATIO));
  const dip = Math.round(layout.scale * DIP);
  const style: CSSProperties = {
    height: protrusion + dip,
    width: 'auto',
    // the bottom of the sprite (the toe beans) sits `dip` below the top of the wheel
    transform: `translate(-50%, calc(-100% + ${dip}px))`,
    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.55))',
  };

  return <img src={TW_ASSETS.pointer} alt='' aria-hidden='true' className={classes.wheelPointer} style={style} />;
};

export default TaiwanPointer;
