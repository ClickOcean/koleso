import { TW_CREAM, TW_GOLD, TW_SERIF } from './taiwanTokens';

import type { RefObject } from 'react';

interface Props {
  /** The element the flight animation moves */
  boxRef: RefObject<HTMLDivElement | null>;
  /** The caption under the plane, faded in and out by the flight animation */
  captionRef: RefObject<HTMLDivElement | null>;
  plane: string;
  caption: string;
  /** Round portrait shown on the fuselage: who is on board */
  passenger?: string;
}

/** The passenger badge on the plane picture: centre as shares of its width and height, diameter as a share of its height */
const BADGE = { x: 0.5, y: 0.17, size: 0.42 };

/** One plane of the flyover with its date caption, invisible until `PlaneFlyover` animates it */
const FlightSprite = ({ boxRef, captionRef, plane, caption, passenger }: Props) => (
  <div
    ref={boxRef}
    aria-hidden='true'
    style={{ position: 'absolute', left: 0, top: 0, opacity: 0, transformOrigin: '0 0', pointerEvents: 'none' }}
  >
    <div style={{ position: 'relative' }}>
      <img src={plane} alt='' draggable={false} style={{ width: '100%', maxWidth: 'none', display: 'block' }} />
      {passenger && (
        <img
          src={passenger}
          alt=''
          draggable={false}
          style={{
            position: 'absolute',
            left: `${BADGE.x * 100}%`,
            top: `${BADGE.y * 100}%`,
            height: `${BADGE.size * 100}%`,
            aspectRatio: '1',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: `4px solid ${TW_CREAM}`,
            boxShadow: `0 0 0 3px ${TW_GOLD}, 0 6px 14px rgba(0, 0, 0, 0.6)`,
          }}
        />
      )}
    </div>
    <div
      ref={captionRef}
      style={{
        display: 'inline-block',
        marginTop: 8,
        marginLeft: '12%',
        opacity: 0,
        whiteSpace: 'nowrap',
        fontFamily: TW_SERIF,
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: TW_CREAM,
        borderLeft: `4px solid ${TW_GOLD}`,
        padding: '3px 14px',
        background: 'rgba(12, 5, 5, 0.6)',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
      }}
    >
      {caption}
    </div>
  </div>
);

export default FlightSprite;
