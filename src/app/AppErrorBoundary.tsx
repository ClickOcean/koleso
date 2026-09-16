import { Button, Center, Code, Stack, Title } from '@mantine/core';
import { Component, ErrorInfo, ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';

interface AppErrorBoundaryProps extends WithTranslation {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defense: keeps a render error from blanking the whole page
 * and offers a reload. Settings and history live in IndexedDB, so nothing is lost.
 */
class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    const { t, children } = this.props;

    if (!error) {
      return children;
    }

    return (
      <Center h='100dvh'>
        <Stack align='center' gap='md'>
          <Title order={3}>{t('app.errorTitle')}</Title>
          <Code block>{error.message}</Code>
          <Button onClick={() => window.location.reload()}>{t('app.reload')}</Button>
        </Stack>
      </Center>
    );
  }
}

const TranslatedAppErrorBoundary = withTranslation()(AppErrorBoundary);

export default TranslatedAppErrorBoundary;
