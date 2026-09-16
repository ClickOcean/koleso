import { Button, Group, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useTranslation } from 'react-i18next';

import { SpinResult } from '../model/types';
import { useSpinHistoryMutations } from '../model/useSpinHistory';

import HistoryFeed from './HistoryFeed';

interface HistoryPanelProps {
  spins: SpinResult[];
}

const HistoryPanel = ({ spins }: HistoryPanelProps) => {
  const { t } = useTranslation();
  const { remove, clear } = useSpinHistoryMutations();

  const confirmClear = () => {
    modals.openConfirmModal({
      title: t('stats.clearConfirmTitle'),
      children: <Text size='sm'>{t('stats.clearConfirmText')}</Text>,
      labels: { confirm: t('stats.clear'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => clear.mutate(),
    });
  };

  return (
    <Stack gap='sm' style={{ height: '100%', minHeight: 0 }}>
      <Group justify='space-between' align='center'>
        <Text size='sm' c='dimmed'>
          {t('history.total', { count: spins.length })}
        </Text>
        {spins.length > 0 && (
          <Button size='compact-xs' variant='subtle' color='red' onClick={confirmClear}>
            {t('stats.clear')}
          </Button>
        )}
      </Group>
      <HistoryFeed spins={spins} onRemove={(id) => remove.mutate(id)} />
    </Stack>
  );
};

export default HistoryPanel;
