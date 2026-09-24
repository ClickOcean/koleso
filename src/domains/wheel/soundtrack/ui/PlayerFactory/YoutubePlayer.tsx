import { useCallback, useImperativeHandle, useRef, useState } from 'react';
import ReactPlayer from 'react-player';

import { waitForPlayback } from '../../lib/waitForPlayback';

import { PlayerProps } from './types';

type YoutubePlayerProps = PlayerProps<Wheel.SoundtrackSourceYoutube>;

const YoutubePlayer = ({
  source,
  ref,
  displayAs = 'thumbnail',
  onReady,
  onTimeUpdate,
  onDurationChange,
}: YoutubePlayerProps) => {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [volume, setVolume] = useState(0.5);
  const loopCounterRef = useRef(0);

  useImperativeHandle(
    ref,
    () => ({
      play: async (offset: number, volume: number) => {
        const player = playerRef.current;
        if (!player) return false;
        player.currentTime = offset;
        player.volume = volume;
        try {
          await player.play();
        } catch {
          return false;
        }

        // the YouTube element resolves play() before it has seeked and buffered
        return waitForPlayback(player, offset);
      },
      stop: () => {
        if (!playerRef.current) return;
        playerRef.current.pause();
        loopCounterRef.current = 0;
      },
      setVolume: (volume: number) => {
        setVolume(volume);
      },
    }),
    [],
  );

  const handleTimeUpdate = useCallback(() => {
    if (!playerRef.current) return;
    onTimeUpdate?.(loopCounterRef.current * playerRef.current.duration + playerRef.current.currentTime);
  }, [onTimeUpdate]);

  const handleEnded = useCallback(() => {
    loopCounterRef.current++;
  }, []);

  const handleDurationChange = useCallback(() => {
    const duration = playerRef.current?.duration;
    if (duration && Number.isFinite(duration)) {
      onDurationChange?.(duration);
    }
  }, [onDurationChange]);

  return (
    <ReactPlayer
      ref={playerRef}
      src={`https://www.youtube.com/watch?v=${source.videoId}`}
      volume={volume}
      onLoad={onReady}
      loop
      onEnded={handleEnded}
      onDurationChange={handleDurationChange}
      preload='auto'
      onTimeUpdate={handleTimeUpdate}
      width={displayAs === 'thumbnail' ? '320px' : undefined}
      height={displayAs === 'thumbnail' ? '180px' : undefined}
      controls={false}
      style={{
        position: 'absolute',
        left: displayAs === 'thumbnail' ? '-80px' : '-9999px',
        top: displayAs === 'thumbnail' ? '-45px' : undefined,
        scale: displayAs === 'thumbnail' ? 0.5 : undefined,
      }}
    />
  );
};

export default YoutubePlayer;
