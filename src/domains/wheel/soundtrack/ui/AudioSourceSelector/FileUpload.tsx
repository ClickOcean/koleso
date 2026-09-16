import { FC, useCallback, useId, useState } from 'react';
import { Group, Paper, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload as CloudUploadIcon } from '@tabler/icons-react';
import clsx from 'clsx';

import { MAX_AUDIO_FILE_SIZE, SUPPORTED_AUDIO_TYPES } from '@domains/wheel/soundtrack/lib/constants';

interface FileUploadProps {
  onSelect: (source: Wheel.SoundtrackSourceFile) => void;
}

const SUPPORTED_EXTENSIONS = /\.(mp3|wav|ogg|oga|webm|m4a|aac|flac)$/i;

const checkIsSupportedAudio = (file: File): boolean =>
  SUPPORTED_AUDIO_TYPES.includes(file.type) || file.type.startsWith('audio/') || SUPPORTED_EXTENSIONS.test(file.name);

/**
 * File upload dropzone for local audio files.
 *
 * The whole zone is a native <label> for the (visually hidden) file input, so the
 * file dialog is opened by the browser itself on click: no programmatic
 * `input.click()`, which some browsers and privacy settings block.
 * Drag-and-drop is handled on the same element.
 */
const FileUpload: FC<FileUploadProps> = ({ onSelect }) => {
  const { t } = useTranslation();
  const inputId = useId();
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      if (!checkIsSupportedAudio(file)) {
        notifications.show({
          title: t('wheel.soundtrack.errors.invalidFileType'),
          message: t('wheel.soundtrack.errors.invalidFileTypeMessage'),
          color: 'red',
        });
        return;
      }

      if (file.size > MAX_AUDIO_FILE_SIZE) {
        notifications.show({
          title: t('wheel.soundtrack.errors.fileTooLarge'),
          message: t('wheel.soundtrack.errors.fileTooLargeMessage', { maxSize: '50MB' }),
          color: 'red',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        const audio = new Audio(dataUrl);
        await new Promise<void>((resolve) => {
          audio.addEventListener('loadedmetadata', () => resolve(), { once: true });
          audio.addEventListener('error', () => resolve(), { once: true });
        });

        const source: Wheel.SoundtrackSourceFile = {
          type: 'file',
          dataUrl,
          fileName: file.name,
          mimeType: file.type || 'audio/mpeg',
          duration: Number.isFinite(audio.duration) ? audio.duration : 0,
          fileSize: file.size,
        };

        onSelect(source);
      };

      reader.onerror = () => {
        notifications.show({
          title: t('wheel.soundtrack.errors.loadFailed'),
          message: t('wheel.soundtrack.errors.loadFailedMessage'),
          color: 'red',
        });
      };

      reader.readAsDataURL(file);
    },
    [onSelect, t],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // allow picking the same file again later
      e.target.value = '';
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  return (
    <Stack gap='sm'>
      <Paper
        component='label'
        htmlFor={inputId}
        withBorder
        p='xl'
        radius='md'
        className={clsx('cursor-pointer text-center transition-colors', isDragOver && 'bg-paper-transparent-600')}
        style={{ borderStyle: 'dashed', borderWidth: 2 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          id={inputId}
          type='file'
          accept={`${SUPPORTED_AUDIO_TYPES.join(',')},audio/*`}
          className='sr-only'
          onChange={handleFileSelect}
        />
        <Group justify='center' gap='xs' mb='xs'>
          <CloudUploadIcon size={48} style={{ opacity: 0.5 }} />
        </Group>
        <Text size='lg' fw={500} mb='xs'>
          {t('wheel.soundtrack.sourceSelector.fileUpload')}
        </Text>
        <Text size='sm' c='dimmed'>
          {t('wheel.soundtrack.sourceSelector.fileFormats')}
        </Text>
      </Paper>
    </Stack>
  );
};

export default FileUpload;
