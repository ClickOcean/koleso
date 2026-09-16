import { FC } from 'react';
import { AspectRatio, Card, Group, Image, Stack, Text } from '@mantine/core';

interface YouTubePreviewProps {
  source: Wheel.SoundtrackSourceYoutube;
  thumbnailContent?: React.ReactNode;
}

/** Card with the video thumbnail (or the hidden player) and its title */
const YouTubePreview: FC<YouTubePreviewProps> = ({ source, thumbnailContent }) => {
  return (
    <Card withBorder padding='sm' radius='md'>
      <Group align='flex-start' wrap='nowrap'>
        <div style={{ position: 'relative', overflow: 'hidden', width: 160, flexShrink: 0 }}>
          <AspectRatio ratio={16 / 9} w={160} h={90}>
            {!thumbnailContent && <Image src={source.thumbnailUrl} alt={source.title} />}
            {thumbnailContent}
          </AspectRatio>
        </div>
        <Stack style={{ flex: 1 }} gap={0}>
          <Text fw={500} lineClamp={2} size='md'>
            {source.title}
          </Text>
          {source.channelTitle && (
            <Text size='sm' c='dark.2'>
              {source.channelTitle}
            </Text>
          )}
        </Stack>
      </Group>
    </Card>
  );
};

export default YouTubePreview;
