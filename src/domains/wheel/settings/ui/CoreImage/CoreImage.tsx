import { Button, Collapse, Group, Image, Stack, Text } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import ImageLinkInput from '@shared/ui/ImageLinkInput/ImageLinkInput';

import styles from './CoreImage.module.css';

const CORE_IMAGE_STORAGE_KEY = 'wheelCoreImage';

/** Picture shown in the middle of the wheel. Stored in settings and mirrored to localStorage for fast first paint. */
const CoreImageField = () => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const coreImage = useWatch<Wheel.Settings, 'coreImage'>({ name: 'coreImage' });
  useEffect(() => {
    if (coreImage && coreImage.length < 2500000) {
      localStorage.setItem(CORE_IMAGE_STORAGE_KEY, coreImage);
    }
    if (!coreImage) {
      localStorage.removeItem(CORE_IMAGE_STORAGE_KEY);
    }
  }, [coreImage]);

  return (
    <>
      <Button
        w='100%'
        variant='transparent'
        rightSection={<IconChevronDown className={isExpanded ? 'rotate-180' : 'rotate-0'} />}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Text size='md'>{t('wheel.coreImage.expandPanel')}</Text>
      </Button>
      <Collapse expanded={isExpanded} className={styles.collapse}>
        <Controller
          name='coreImage'
          render={({ field: { onChange, value } }) => (
            <Stack gap='sm' w='100%' align='center'>
              {value && <Image src={value} alt='' w={96} h={96} radius='xl' fit='cover' />}
              <Group gap='xs'>
                <ImageLinkInput
                  dialogTitle={t('wheel.coreImage.customImageDialogTitle')}
                  buttonTitle={t('wheel.loadCustomMessage')}
                  buttonClass={styles.uploadButton}
                  onChange={onChange}
                />
                {value && (
                  <Button variant='subtle' color='gray' onClick={() => onChange(null)}>
                    {t('wheel.coreImage.reset')}
                  </Button>
                )}
              </Group>
            </Stack>
          )}
        />
      </Collapse>
    </>
  );
};

export { CORE_IMAGE_STORAGE_KEY };
export default CoreImageField;
