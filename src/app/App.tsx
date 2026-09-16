import { ActionIcon, Group, Title, Tooltip } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { IconChartDonut, IconLayoutSidebarRightCollapse, IconLayoutSidebarRightExpand } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import ThemeRoot from '@domains/theme/ui/ThemeRoot';
import WheelPage from '@pages/wheel/WheelPage';
import { useLocalStorageState } from '@shared/lib/localState/useLocalStorageState';

import styles from './App.module.css';

/**
 * Presentation mode hides the header and the sidebar so only the wheel and
 * the theme background stay on screen (for screen sharing). Space still spins.
 */
const App = () => {
  const { t } = useTranslation();
  const [isPresentation, setIsPresentation] = useLocalStorageState<boolean>('ui.presentationMode', false);

  useHotkeys([['Escape', () => setIsPresentation(false)]]);

  return (
    <div className={styles.shell}>
      <ThemeRoot />
      {!isPresentation && (
        <header className={styles.header}>
          <Group gap='xs' align='center'>
            <IconChartDonut size={26} />
            <Title order={3}>{t('app.title')}</Title>
          </Group>
          <Tooltip label={t('app.presentationOn')}>
            <ActionIcon variant='subtle' color='gray' size='lg' onClick={() => setIsPresentation(true)}>
              <IconLayoutSidebarRightCollapse size={22} />
            </ActionIcon>
          </Tooltip>
        </header>
      )}
      {isPresentation && (
        <Tooltip label={t('app.presentationOff')} position='left'>
          <ActionIcon
            className='presentation-toggle'
            variant='subtle'
            color='gray'
            size='lg'
            onClick={() => setIsPresentation(false)}
          >
            <IconLayoutSidebarRightExpand size={22} />
          </ActionIcon>
        </Tooltip>
      )}
      <main className={styles.main}>
        <WheelPage isSidebarCollapsed={isPresentation} />
      </main>
    </div>
  );
};

export default App;
