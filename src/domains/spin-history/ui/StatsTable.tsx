import { Badge, Table, Text, Tooltip } from '@mantine/core';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { ParticipantStats } from '../model/types';

interface StatsTableProps {
  rows: ParticipantStats[];
  expectedWinsPerActive: number | null;
}

const StatsTable = ({ rows, expectedWinsPerActive }: StatsTableProps) => {
  const { t } = useTranslation();

  return (
    <Table striped highlightOnHover withTableBorder verticalSpacing='xs' fz='sm' layout='fixed' w='100%'>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w='36%'>{t('stats.columns.name')}</Table.Th>
          <Table.Th ta='right' w='13%'>
            {t('stats.columns.wins')}
          </Table.Th>
          <Table.Th ta='right' w='13%'>
            {t('stats.columns.share')}
          </Table.Th>
          <Table.Th w='23%'>{t('stats.columns.lastWin')}</Table.Th>
          <Table.Th ta='right' w='15%'>
            {t('stats.columns.streak')}
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => {
          const deviation = expectedWinsPerActive != null && row.isActive ? row.wins - expectedWinsPerActive : null;
          const deviationColor =
            deviation == null ? undefined : deviation > 1 ? 'orange' : deviation < -1 ? 'blue' : undefined;

          return (
            <Table.Tr key={row.participantId} style={{ opacity: row.isActive ? 1 : 0.55 }}>
              <Table.Td>
                <Text size='sm' truncate>
                  {row.name}
                  {!row.isActive && (
                    <Text span size='xs' c='dimmed'>
                      {' '}
                      · {t('stats.inactive')}
                    </Text>
                  )}
                </Text>
              </Table.Td>
              <Table.Td ta='right'>
                <Tooltip
                  label={t('stats.deviationTooltip', { expected: expectedWinsPerActive?.toFixed(1) ?? '–' })}
                  disabled={deviation == null}
                >
                  <Text span fw={600} c={deviationColor}>
                    {row.wins}
                  </Text>
                </Tooltip>
              </Table.Td>
              <Table.Td ta='right'>{(row.share * 100).toFixed(0)}%</Table.Td>
              <Table.Td>
                {row.lastWinAt ? (
                  <Tooltip label={dayjs(row.lastWinAt).format('LLL')}>
                    <Text span size='sm' truncate>
                      {dayjs(row.lastWinAt).fromNow()}
                    </Text>
                  </Tooltip>
                ) : (
                  <Text span size='sm' c='dimmed'>
                    {t('stats.never')}
                  </Text>
                )}
              </Table.Td>
              <Table.Td ta='right'>
                {row.isOnStreak ? (
                  <Badge color='orange' variant='light' size='sm'>
                    {t('stats.onStreak', { count: row.currentStreak })}
                  </Badge>
                ) : (
                  <Text span size='sm' c='dimmed'>
                    {row.longestStreak > 1 ? t('stats.maxStreak', { count: row.longestStreak }) : '–'}
                  </Text>
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
};

export default StatsTable;
