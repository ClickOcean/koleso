import { FC, useState, useCallback } from 'react';
import { Stack, SegmentedControl, TextInput, Button, Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';

import { fetchYoutubeVideoById } from '@domains/wheel/soundtrack/api/youtubeApi';

import FileUpload from './FileUpload';

interface AudioSourceSelectorProps {
  onSourceSelect: (source: Wheel.SoundtrackSource) => void;
}

type SourceType = 'youtube' | 'file';

/**
 * Extracts YouTube video ID from various URL formats
 */
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
};

/**
 * Keyless fallback used when the YouTube Data API is unavailable: title and
 * channel come from the public oEmbed endpoint, duration stays unknown (0)
 * until the player reports it.
 */
const buildSourceWithoutApi = async (videoId: string): Promise<Wheel.SoundtrackSourceYoutube> => {
  const source: Wheel.SoundtrackSourceYoutube = {
    type: 'youtube',
    videoId,
    title: `YouTube ${videoId}`,
    channelTitle: '',
    duration: 0,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };

  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
    const response = await fetch(url);
    if (response.ok) {
      const data = (await response.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
      source.title = data.title || source.title;
      source.channelTitle = data.author_name || '';
      source.thumbnailUrl = data.thumbnail_url || source.thumbnailUrl;
    }
  } catch {
    // best effort only
  }

  return source;
};

/**
 * Fetches video metadata from the YouTube Data API, falling back to the keyless lookup
 */
const fetchVideoMetadata = async (videoId: string): Promise<Wheel.SoundtrackSourceYoutube> => {
  try {
    const videoDetails = await fetchYoutubeVideoById(videoId);

    if (videoDetails) {
      return {
        type: 'youtube',
        videoId: videoDetails.videoId,
        title: videoDetails.title,
        channelTitle: videoDetails.channelTitle,
        duration: videoDetails.duration,
        thumbnailUrl: videoDetails.thumbnailUrl,
      };
    }
  } catch (err) {
    console.error('Failed to fetch video metadata:', err);
  }

  return buildSourceWithoutApi(videoId);
};

/**
 * Component for selecting audio source (YouTube or File)
 */
const AudioSourceSelector: FC<AudioSourceSelectorProps> = ({ onSourceSelect }) => {
  const { t } = useTranslation();
  const [sourceType, setSourceType] = useState<SourceType>('file');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleYoutubeSubmit = useCallback(async () => {
    if (!youtubeUrl.trim()) return;

    const videoId = extractVideoId(youtubeUrl.trim());

    if (!videoId) {
      notifications.show({
        title: t('wheel.soundtrack.errors.invalidUrl'),
        message: t('wheel.soundtrack.errors.invalidUrl'),
        color: 'red',
      });
      return;
    }

    setIsLoading(true);
    const source = await fetchVideoMetadata(videoId);
    setIsLoading(false);
    onSourceSelect(source);
  }, [youtubeUrl, onSourceSelect, t]);

  return (
    <Stack gap='md'>
      <SegmentedControl
        value={sourceType}
        onChange={(value) => setSourceType(value as SourceType)}
        data={[
          { value: 'file', label: t('wheel.soundtrack.sourceSelector.file') },
          { value: 'youtube', label: t('wheel.soundtrack.sourceSelector.youtube') },
        ]}
      />

      {sourceType === 'youtube' && (
        <Stack gap='xs'>
          <Group align='flex-end' gap='xs'>
            <TextInput
              style={{ flex: 1 }}
              placeholder={t('wheel.soundtrack.sourceSelector.youtubeUrlPlaceholder')}
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleYoutubeSubmit()}
            />
            <Button onClick={handleYoutubeSubmit} loading={isLoading} disabled={!youtubeUrl.trim()}>
              {t('common.apply')}
            </Button>
          </Group>
          <Text size='sm' c='dimmed'>
            {t('wheel.soundtrack.sourceSelector.youtubeHint')}
          </Text>
        </Stack>
      )}

      {sourceType === 'file' && <FileUpload onSelect={onSourceSelect} />}
    </Stack>
  );
};

export default AudioSourceSelector;
