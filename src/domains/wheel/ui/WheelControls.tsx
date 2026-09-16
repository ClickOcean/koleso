import { Button, Group, Kbd, Stack, Tooltip } from '@mantine/core';
import { IconPlayerPlayFilled } from '@tabler/icons-react';
import { useFormContext, useFormState } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import CoreImageField from '@domains/wheel/settings/ui/CoreImage/CoreImage';
import WheelStyleSelect from '@domains/wheel/settings/ui/StyleSelect/StyleSelect';
import WheelSoundtrackField from '@domains/wheel/soundtrack/ui';
import SpinTimeComposed from '@domains/wheel/soundtrack/ui/SpinTimeComposed';

interface WheelControlsProps {
  canSpin: boolean;
}

/** Spin button plus the handful of settings that matter for a daily spin. */
const WheelControls = ({ canSpin }: WheelControlsProps) => {
  const { t } = useTranslation();
  const { control } = useFormContext<Wheel.Settings>();
  const { isSubmitting } = useFormState<Wheel.Settings>({ control });

  return (
    <Stack gap='sm'>
      <Tooltip label={t('wheel.spaceHint')} openDelay={600}>
        <Button
          type='submit'
          size='lg'
          fullWidth
          className='theme-spin-button'
          leftSection={<IconPlayerPlayFilled size={20} />}
          rightSection={<Kbd size='xs'>Space</Kbd>}
          disabled={isSubmitting || !canSpin}
          loading={isSubmitting}
        >
          {isSubmitting ? t('wheel.spinning') : t('wheel.spin')}
        </Button>
      </Tooltip>
      <Group align='center' gap='xs' wrap='nowrap' justify='space-between'>
        <SpinTimeComposed disabled={isSubmitting} />
        <WheelSoundtrackField />
      </Group>
      <WheelStyleSelect />
      <CoreImageField />
    </Stack>
  );
};

export default WheelControls;
