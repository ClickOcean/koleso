import { ReactNode } from 'react';

import { WheelItem } from '@models/wheel.model';

import classes from './WinnerBackdrop.module.css';
import WinnerBackdropName from './WinnerBackdropName';

interface WinnerBackdropProps {
  winner: WheelItem;
  /** Action buttons rendered under the winner name (confirm, spin again, ...) */
  actions?: ReactNode;
}

const WinnerBackdrop = ({ winner, actions }: WinnerBackdropProps) => {
  return (
    <div style={{ pointerEvents: 'all' }} className={classes.wheelWinner}>
      <WinnerBackdropName name={winner.displayName ?? winner.name} />
      {actions}
    </div>
  );
};

export default WinnerBackdrop;
