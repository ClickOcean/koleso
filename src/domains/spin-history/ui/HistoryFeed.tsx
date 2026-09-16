import { ActionIcon, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { SpinResult } from '../model/types';

interface HistoryFeedProps {
  spins: SpinResult[];
  onRemove: (id: string) => void;
}

interface DayGroup {
  key: string;
  label: string;
  spins: SpinResult[];
}

/**
 * Chronological feed of confirmed spins, newest first, grouped by calendar day.
 */
const HistoryFeed = ({ spins, onRemove }: HistoryFeedProps) => {
  const { t } = useTranslation();

  const groups = useMemo<DayGroup[]>(() => {
    const sorted = [...spins].sort((a, b) => b.spunAt - a.spunAt);
    const today = dayjs().startOf('day');
    const byDay = new Map<string, DayGroup>();

    sorted.forEach((spin) => {
      const day = dayjs(spin.spunAt).startOf('day');
      const key = day.format('YYYY-MM-DD');
      let group = byDay.get(key);

      if (!group) {
        const diff = today.diff(day, 'day');
        const label =
          diff === 0
            ? t('history.today')
            : diff === 1
              ? t('history.yesterday')
              : day.format(day.year() === today.year() ? 'D MMMM, dddd' : 'D MMMM YYYY');
        group = { key, label, spins: [] };
        byDay.set(key, group);
      }

      group.spins.push(spin);
    });

    return Array.from(byDay.values());
  }, [spins, t]);

  if (!spins.length) {
    return (
      <Text c='dimmed' ta='center' py='lg'>
        {t('history.empty')}
      </Text>
    );
  }

  return (
    <ScrollArea style={{ flex: 1, minHeight: 0 }} type='auto' offsetScrollbars>
      <Stack gap='md'>
        {groups.map((group) => (
          <Stack key={group.key} gap={2}>
            <Text size='xs' c='dimmed' tt='uppercase' fw={600} px={8}>
              {group.label}
            </Text>
            {group.spins.map((spin) => (
              <Group
                key={spin.id}
                gap='sm'
                wrap='nowrap'
                className='rounded-md px-2 py-1 hover:bg-paper-transparent-600'
              >
                <Text size='sm' c='dimmed' style={{ width: 44, flexShrink: 0 }}>
                  {dayjs(spin.spunAt).format('HH:mm')}
                </Text>
                <Text size='sm' fw={500} style={{ flex: 1 }} truncate>
                  {spin.participantName}
                </Text>
                <ActionIcon
                  variant='subtle'
                  color='red'
                  size='sm'
                  onClick={() => onRemove(spin.id)}
                  aria-label={t('history.remove')}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        ))}
      </Stack>
    </ScrollArea>
  );
};

export default HistoryFeed;
