import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import '@styles/index.scss';
import './index.css';
import '@domains/theme/ui/theme.css';
import '@assets/i18n';

import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import 'dayjs/locale/ru';
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import i18n from '@assets/i18n';
import { queryClient } from '@shared/lib/react-query/client';

import App from './app/App';
import AppErrorBoundary from './app/AppErrorBoundary';
import MantineProvider from './app/MantineProvider';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const syncDayjsLocale = (language: string) => dayjs.locale(language.startsWith('ru') ? 'ru' : 'en');
syncDayjsLocale(i18n.language ?? 'ru');
i18n.on('languageChanged', syncDayjsLocale);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <Notifications limit={4} autoClose={3000} />
        <Suspense fallback={null}>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </Suspense>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
