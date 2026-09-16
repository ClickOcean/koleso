import { ReactNode, useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { WheelItem } from '@models/wheel.model';

import BaseWheel, { BaseWheelProps } from '../BaseWheel/BaseWheel';
import { resolveWheelParts } from '../BaseWheel/parts/resolveWheelParts';

interface Props extends Pick<BaseWheelProps<WheelItem>, 'controller' | 'className' | 'onOptimalSizeChange'> {
  items: WheelItem[];
  renderWinnerActions?: (winner: WheelItem) => ReactNode;
}

/** Binds BaseWheel to the settings form (style, core image). */
const FormWheel = ({ controller, items, className, onOptimalSizeChange, renderWinnerActions }: Props) => {
  const coreImage = useWatch<Wheel.Settings, 'coreImage'>({ name: 'coreImage' });
  const wheelStyles = useWatch<Wheel.Settings, 'wheelStyles'>({ name: 'wheelStyles' });
  const parts = resolveWheelParts(wheelStyles);
  const { setValue } = useFormContext<Wheel.Settings>();

  const onCoreImageChange = useCallback(
    (image: string) => {
      setValue('coreImage', image);
    },
    [setValue],
  );

  return (
    <BaseWheel
      controller={controller}
      coreImage={coreImage || parts.coreImage}
      items={items}
      onCoreImageChange={onCoreImageChange}
      className={className}
      onOptimalSizeChange={onOptimalSizeChange}
      parts={parts}
      renderWinnerActions={renderWinnerActions}
    />
  );
};

export default FormWheel;
