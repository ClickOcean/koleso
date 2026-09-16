import { Stack, Text } from '@mantine/core';
import clsx from 'clsx';

import styles from './WinnerBackdropName.module.css';

interface WinnerBackdropNameProps {
  name: string;
}

const WinnerBackdropName = ({ name }: WinnerBackdropNameProps) => {
  return (
    <Stack gap='xs' className={styles.container} align='center'>
      <Text className={clsx(styles.winnerName, 'wheel-winner-name')} fw={700} inherit>
        {name}
      </Text>
    </Stack>
  );
};

export default WinnerBackdropName;
