import { Center, Loader, Paper, Tabs } from '@mantine/core';
import { useDebouncedCallback } from '@tanstack/react-pacer';
import { IconChartBar, IconHistory, IconUsers } from '@tabler/icons-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useParticipants } from '@domains/participants/model/useParticipants';
import ParticipantsPanel from '@domains/participants/ui/ParticipantsPanel';
import { useSpinHistory, useSpinHistoryMutations } from '@domains/spin-history/model/useSpinHistory';
import HistoryPanel from '@domains/spin-history/ui/HistoryPanel';
import StatsPanel from '@domains/spin-history/ui/StatsPanel';
import { useSaveWheelSettings, useWheelSettings } from '@domains/wheel/lib/hooks/useWheelSettings';
import WheelBoard from '@domains/wheel/ui/WheelBoard';
import { useLocalStorageState } from '@shared/lib/localState/useLocalStorageState';
import { WheelItem } from '@models/wheel.model';

const fillStyle = { flex: 1, minHeight: 0, minWidth: 0 } as const;

interface WheelPageProps {
  isSidebarCollapsed?: boolean;
}

const WheelPage = ({ isSidebarCollapsed = false }: WheelPageProps) => {
  const { t } = useTranslation();
  const participantsQuery = useParticipants();
  const spinsQuery = useSpinHistory();
  const { add: addSpin } = useSpinHistoryMutations();
  const { data: settingsRecord, isLoading: isLoadingSettings } = useWheelSettings();
  const { mutate: saveSettings } = useSaveWheelSettings();
  const [activeTab, setActiveTab] = useLocalStorageState<string>('wheel.sidebarTab', 'participants');

  const handleSettingsChanged = useCallback(
    (settings: Wheel.Settings) => {
      saveSettings({ id: settingsRecord?.id, data: settings });
    },
    [saveSettings, settingsRecord?.id],
  );
  const handleSettingsChangedDebounced = useDebouncedCallback(handleSettingsChanged, { wait: 1000, leading: true });

  const handleWinnerConfirmed = useCallback(
    async (winner: WheelItem) => {
      await addSpin.mutateAsync({ participantId: winner.id.toString(), participantName: winner.name });
    },
    [addSpin],
  );

  const participants = participantsQuery.data ?? [];
  const spins = spinsQuery.data ?? [];
  const isReady = !isLoadingSettings && participantsQuery.isSuccess && spinsQuery.isSuccess;

  if (!isReady) {
    return (
      <Center h='100%'>
        <Loader />
      </Center>
    );
  }

  return (
    <WheelBoard
      participants={participants}
      initialSettings={settingsRecord?.data}
      onSettingsChanged={handleSettingsChangedDebounced}
      onWinnerConfirmed={handleWinnerConfirmed}
      isSidebarCollapsed={isSidebarCollapsed}
      sidebarExtra={
        <Paper p='md' radius='md' withBorder className='theme-panel' style={{ ...fillStyle, display: 'flex' }}>
          <Tabs
            value={activeTab}
            onChange={(value) => setActiveTab(value ?? 'participants')}
            style={{ ...fillStyle, display: 'flex', flexDirection: 'column' }}
          >
            <Tabs.List mb='sm'>
              <Tabs.Tab value='participants' leftSection={<IconUsers size={16} />}>
                {t('participants.title')}
              </Tabs.Tab>
              <Tabs.Tab value='history' leftSection={<IconHistory size={16} />}>
                {t('history.title')}
              </Tabs.Tab>
              <Tabs.Tab value='stats' leftSection={<IconChartBar size={16} />}>
                {t('stats.title')}
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value='participants' style={fillStyle}>
              <ParticipantsPanel participants={participants} />
            </Tabs.Panel>
            <Tabs.Panel value='history' style={fillStyle}>
              <HistoryPanel spins={spins} />
            </Tabs.Panel>
            <Tabs.Panel value='stats' style={fillStyle}>
              <StatsPanel spins={spins} participants={participants} />
            </Tabs.Panel>
          </Tabs>
        </Paper>
      }
    />
  );
};

export default WheelPage;
