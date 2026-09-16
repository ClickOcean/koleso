import { Group } from '@mantine/core';
import { useWatch } from 'react-hook-form';

import RandomSpinConfig from '@domains/wheel/settings/ui/RandomSpinConfig';
import RandomSpinSwitch from '@domains/wheel/settings/ui/RandomSpinSwitch';
import SpinTimeField from '@domains/wheel/settings/ui/SpinTime';

interface SpinTimeComposedProps {
  disabled?: boolean;
}

const SpinTimeComposed = ({ disabled }: SpinTimeComposedProps) => {
  const randomSpinEnabled = useWatch<Wheel.Settings>({ name: 'randomSpinEnabled' });

  return (
    <Group align='center' justify='space-between' gap='xs' wrap='nowrap'>
      <Group wrap='nowrap'>
        {!randomSpinEnabled && <SpinTimeField />}
        {randomSpinEnabled && <RandomSpinConfig />}
      </Group>
      {!disabled && <RandomSpinSwitch />}
    </Group>
  );
};

export default SpinTimeComposed;
