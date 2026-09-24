import { Paper, Text } from '@mantine/core';
import clsx from 'clsx';
import { useHotkeys } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Participant } from '@domains/participants/model/types';
import { activeWheelStyleStore } from '@domains/theme/model/activeWheelStyleStore';
import { WheelItem } from '@models/wheel.model';

import WheelFlexboxAutosizer from '../BaseWheel/FlexboxAutosizer';
import { resolveWheelParts } from '../BaseWheel/parts/resolveWheelParts';
import { defaultWheelSettings } from '../lib/hooks/useSavedWheelSettings';
import { participantsToWheelItems } from '../lib/participantsToWheelItems';
import { getSpinDuration, pickWinner } from '../lib/spin';
import { spinTimelineStore } from '../lib/spinTimelineStore';
import PlayerFactory from '../soundtrack/ui/PlayerFactory';
import { PlayerRef } from '../soundtrack/ui/PlayerFactory/types';

import FormWheel from './FormWheel';
import WheelControls from './WheelControls';
import WinnerActions from './WinnerActions';
import styles from './WheelBoard.module.css';

import type { WheelController } from '../BaseWheel/BaseWheel';

interface WheelBoardProps {
  participants: Participant[];
  initialSettings?: Wheel.Settings;
  onSettingsChanged?: (settings: Wheel.Settings) => void;
  /** Called when the presenter confirms the winner; resolves once it is persisted */
  onWinnerConfirmed: (winner: WheelItem) => Promise<void>;
  /** Rendered in the sidebar under the spin controls (participants, stats, ...) */
  sidebarExtra?: ReactNode;
  /** Presentation mode: hide the whole sidebar, the wheel takes the full width */
  isSidebarCollapsed?: boolean;
}

/**
 * The whole "spin the wheel" screen: wheel on the left, controls on the right.
 * Owns the settings form, the soundtrack player and the spin flow.
 */
const WheelBoard = ({
  participants,
  initialSettings,
  onSettingsChanged,
  onWinnerConfirmed,
  sidebarExtra,
  isSidebarCollapsed = false,
}: WheelBoardProps) => {
  const { t } = useTranslation();
  const form = useForm<Wheel.Settings>({ defaultValues: initialSettings ?? defaultWheelSettings });
  const { handleSubmit, getValues } = form;
  const wheelController = useRef<WheelController | null>(null);
  const soundtrackPlayerRef = useRef<PlayerRef | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const soundtrack = form.watch('soundtrack');
  const soundtrackSource = soundtrack?.enabled ? soundtrack.source : null;
  const wheelStyles = form.watch('wheelStyles');
  const titleGap = resolveWheelParts(wheelStyles).titleGap;

  useEffect(() => {
    activeWheelStyleStore.set(wheelStyles);
  }, [wheelStyles]);

  useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: (data) => {
        onSettingsChanged?.(data.values as Wheel.Settings);
      },
    });

    return () => unsubscribe();
  }, [form, onSettingsChanged]);

  const items = useMemo(() => participantsToWheelItems(participants), [participants]);
  const canSpin = items.length >= 2;

  const onSpin = useCallback(
    async (settings: Wheel.Settings) => {
      if (!wheelController.current || !canSpin) return;

      wheelController.current.clearWinner();

      const duration = getSpinDuration(settings);
      const winner = pickWinner(wheelController.current.getItems());
      const spinResult = wheelController.current.spin({ duration, winnerId: winner.id });

      const soundtrackConfig = settings.soundtrack;
      if (soundtrackConfig?.enabled && soundtrackConfig.source) {
        soundtrackPlayerRef.current?.play(soundtrackConfig.offset ?? 0, soundtrackConfig.volume ?? 0.5);
      }

      spinTimelineStore.start(duration);
      try {
        await spinResult.animate();
      } finally {
        spinTimelineStore.stop();
        soundtrackPlayerRef.current?.stop();
      }
    },
    [canSpin],
  );

  const submitSpin = useCallback(() => {
    if (form.formState.isSubmitting || !canSpin) return;
    handleSubmit(onSpin)();
  }, [form.formState.isSubmitting, canSpin, handleSubmit, onSpin]);

  useHotkeys([['space', submitSpin]], []);

  const handleConfirm = useCallback(
    async (winner: WheelItem) => {
      setIsSaving(true);
      try {
        await onWinnerConfirmed(winner);
        notifications.show({ message: t('wheel.winnerSaved', { name: winner.name }), color: 'green' });
        wheelController.current?.clearWinner();
      } finally {
        setIsSaving(false);
      }
    },
    [onWinnerConfirmed, t],
  );

  const handleSpinAgain = useCallback(() => {
    wheelController.current?.clearWinner();
    handleSubmit(onSpin)();
  }, [handleSubmit, onSpin]);

  const renderWinnerActions = useCallback(
    (winner: WheelItem) => (
      <WinnerActions isSaving={isSaving} onConfirm={() => handleConfirm(winner)} onSpinAgain={handleSpinAgain} />
    ),
    [handleConfirm, handleSpinAgain, isSaving],
  );

  return (
    <FormProvider {...form}>
      <form className={styles.board} onSubmit={handleSubmit(onSpin)}>
        {soundtrackSource != null && (
          <PlayerFactory source={soundtrackSource} ref={soundtrackPlayerRef} displayAs='hidden' />
        )}
        <div className={styles.wheelArea}>
          <WheelFlexboxAutosizer titleGap={titleGap}>
            {({ onOptimalSizeChange }) => (
              <FormWheel
                items={items}
                controller={wheelController}
                onOptimalSizeChange={onOptimalSizeChange}
                renderWinnerActions={renderWinnerActions}
              />
            )}
          </WheelFlexboxAutosizer>
          {!canSpin && (
            <div className={styles.emptyState}>
              <Paper p='lg' radius='md' withBorder>
                <Text size='lg' ta='center'>
                  {t('wheel.notEnoughParticipants')}
                </Text>
              </Paper>
            </div>
          )}
        </div>
        {!isSidebarCollapsed && (
          <div className={clsx(styles.sidebar, 'theme-ui')}>
            <Paper p='md' radius='md' withBorder className='theme-panel'>
              <WheelControls canSpin={canSpin} />
            </Paper>
            {sidebarExtra && <div className={styles.sidebarExtra}>{sidebarExtra}</div>}
          </div>
        )}
      </form>
    </FormProvider>
  );
};

export default WheelBoard;
