import { Group, ScrollArea, SegmentedControl, Stack, Text } from '@mantine/core';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Participant } from '@domains/participants/model/types';

import { computeStats } from '../lib/computeStats';
import { SpinResult } from '../model/types';

import StatsTable from './StatsTable';

type Period = 'all' | 'month' | 'week';

interface StatsPanelProps {
  spins: SpinResult[];
  participants: Participant[];
}

const periodToSince = (period: Period): number | null => {
  if (period === 'week') return dayjs().subtract(7, 'day').valueOf();
  if (period === 'month') return dayjs().subtract(30, 'day').valueOf();
  return null;
};

const StatsPanel = ({ spins, participants }: StatsPanelProps) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('all');

  const stats = useMemo(
    () => computeStats({ spins, participants, since: periodToSince(period) }),
    [spins, participants, period],
  );

  return (
    <Stack gap='sm' style={{ height: '100%', minHeight: 0 }}>
      <Group justify='space-between' align='center'>
        <SegmentedControl
          size='xs'
          value={period}
          onChange={(value) => setPeriod(value as Period)}
          data={[
            { value: 'all', label: t('stats.period.all') },
            { value: 'month', label: t('stats.period.month') },
            { value: 'week', label: t('stats.period.week') },
          ]}
        />
        <Text size='sm' c='dimmed'>
          {t('stats.totalSpins', { count: stats.totalSpins })}
        </Text>
      </Group>
      {stats.expectedWinsPerActive != null && stats.totalSpins > 0 && (
        <Text size='xs' c='dimmed'>
          {t('stats.expected', { count: stats.expectedWinsPerActive })}
        </Text>
      )}
      <ScrollArea style={{ flex: 1, minHeight: 0 }} type='auto' offsetScrollbars>
        {stats.rows.length ? (
          <StatsTable rows={stats.rows} expectedWinsPerActive={stats.expectedWinsPerActive} />
        ) : (
          <Text c='dimmed' ta='center' py='lg'>
            {t('stats.noSpins')}
          </Text>
        )}
      </ScrollArea>
    </Stack>
  );
};

export default StatsPanel;
