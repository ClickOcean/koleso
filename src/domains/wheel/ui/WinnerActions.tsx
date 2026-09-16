import { Button, Group } from '@mantine/core';
import { IconCheck, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface WinnerActionsProps {
  isSaving: boolean;
  onConfirm: () => void;
  onSpinAgain: () => void;
}

const WinnerActions = ({ isSaving, onConfirm, onSpinAgain }: WinnerActionsProps) => {
  const { t } = useTranslation();

  return (
    <Group gap='sm' mt='md'>
      <Button
        type='button'
        size='lg'
        color='green'
        leftSection={<IconCheck size={22} />}
        loading={isSaving}
        onClick={onConfirm}
      >
        {t('wheel.confirmWinner')}
      </Button>
      <Button
        type='button'
        size='lg'
        variant='outline'
        color='yellow'
        leftSection={<IconRefresh size={22} />}
        disabled={isSaving}
        onClick={onSpinAgain}
      >
        {t('wheel.spinAgain')}
      </Button>
    </Group>
  );
};

export default WinnerActions;
