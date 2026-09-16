import { Overlay, Popover, Stack, Text, Title } from '@mantine/core';
import { throttle } from '@tanstack/react-pacer';
import clsx from 'clsx';
import {
  MutableRefObject,
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import ImageLinkInput from '@shared/ui/ImageLinkInput/ImageLinkInput';
import { getWinnerFromDistance } from '@domains/wheel/lib/geometry';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';

import classes from './BaseWheel.module.css';
import wheelHelpers from './helpers';
import { createWheelLayout } from './parts/createWheelLayout';
import { WHEEL_TITLE_GAP } from './parts/wheelSpacing';
import WinnerBackdrop from './WinnerBackdrop';

import type { ID } from './contracts';
import type { SpinParams, SpinResult, WheelController } from './contracts';
import type { ResolvedWheelParts, SpinningWheelHandle, WheelPartLayout } from './parts/types';

export type { SpinParams, SpinResult, WheelController } from './contracts';

export interface BaseWheelProps<T extends WheelItem> {
  items: T[];
  controller: MutableRefObject<WheelController | null>;
  coreImage?: string | null;
  onCoreImageChange?: (image: string) => void;
  onOptimalSizeChange?: (size: number) => void;
  /** Buttons shown on the winner overlay once the spin has finished */
  renderWinnerActions?: (winner: T) => ReactNode;
  className?: string;
  parts: ResolvedWheelParts;
}

/**
 * Renders the spinning wheel canvas, the pointer, the center image and the
 * winner overlay. All spin orchestration happens through `controller`.
 */
const BaseWheel = <T extends WheelItem>(props: BaseWheelProps<T>) => {
  const {
    items,
    controller,
    coreImage,
    onCoreImageChange,
    className,
    onOptimalSizeChange,
    parts,
    renderWinnerActions,
  } = props;
  const { t } = useTranslation();

  const [winnerItem, setWinnerItem] = useState<T | undefined>();
  const [layout, setLayout] = useState<WheelPartLayout | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<ID | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isClickOusideAllowed, setIsClickOusideAllowed] = useState(true);

  const coreElement = useRef<HTMLDivElement>(null);
  const spinTarget = useRef<HTMLHeadingElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const spinningWheelRef = useRef<SpinningWheelHandle | null>(null);
  const normalizedItems = useMemo<WheelItemWithAngle[]>(() => wheelHelpers.defineAngle(items), [items]);
  const normalizedRef = useRef(normalizedItems);

  useEffect(() => {
    normalizedRef.current = normalizedItems;
  }, [normalizedItems]);

  const coreBackground = useMemo(() => (coreImage ? `url(${coreImage})` : 'none'), [coreImage]);
  const coreSize = layout ? layout.targetWheelSize * 0.2 : 160;
  const coreBorderWidth = layout ? Math.max(2, (layout.targetWheelSize / 800) * 3) : 3;

  const setCoreFillColor = useCallback((color?: string | null) => {
    if (coreElement.current) {
      coreElement.current.style.backgroundColor = color || 'transparent';
    }
  }, []);

  const updateWinnerPreview = useCallback(
    (rotation: number): void => {
      const winner = getWinnerFromDistance({ distance: rotation, items: normalizedRef.current });

      if (winner && spinTarget.current) {
        spinTarget.current.textContent = winner.displayName ?? winner.name;
      }

      setCoreFillColor(winner?.color);
    },
    [setCoreFillColor],
  );

  const resizeWheel = useCallback(() => {
    if (!wrapper.current || !spinTarget.current) return;

    const targetWheelSize = Math.min(
      wrapper.current.clientHeight - WHEEL_TITLE_GAP - spinTarget.current.clientHeight,
      wrapper.current.clientWidth,
    );

    if (targetWheelSize < 160) {
      return;
    }

    const nextLayout = createWheelLayout(targetWheelSize);

    setLayout((previousLayout) => {
      if (previousLayout?.targetWheelSize === nextLayout.targetWheelSize) {
        return previousLayout;
      }

      onOptimalSizeChange?.(nextLayout.targetWheelSize);
      return nextLayout;
    });
  }, [onOptimalSizeChange]);

  useLayoutEffect(() => {
    const resizeObserver = new ResizeObserver(
      throttle(
        () => {
          resizeWheel();
        },
        { wait: 30, trailing: true },
      ),
    );

    if (wrapper.current) {
      resizeWheel();
      resizeObserver.observe(wrapper.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [resizeWheel]);

  useEffect(() => {
    if (layout) {
      updateWinnerPreview(spinningWheelRef.current?.getRotation() ?? 0);
    }
  }, [layout, parts, updateWinnerPreview]);

  const resetPosition = useCallback(() => {
    spinningWheelRef.current?.setRotation(0);
  }, []);

  const finalizeSpin = useCallback((winner?: T): void => {
    if (winner && spinTarget.current) {
      setWinnerItem(winner);
      spinTarget.current.textContent = winner.displayName ?? winner.name;
    }
  }, []);

  const resetStyles = useCallback(() => {
    setHighlightedItemId(null);
    spinningWheelRef.current?.redraw();
  }, []);

  useEffect(() => {
    setHighlightedItemId(null);
    if (spinTarget.current) {
      spinTarget.current.textContent = t('wheel.winner');
    }
    setIsSpinning(false);
    resetPosition();
    spinningWheelRef.current?.redraw();
    updateWinnerPreview(0);
  }, [normalizedItems, resetPosition, t, updateWinnerPreview]);

  const clearWinner = useCallback(() => {
    setWinnerItem(undefined);

    if (spinTarget.current) {
      spinTarget.current.textContent = t('wheel.winner');
    }
  }, [t]);

  const spin: WheelController['spin'] = useCallback(
    ({ winnerId, duration, distance }: SpinParams): SpinResult => {
      setWinnerItem(undefined);
      setIsSpinning(true);
      spinningWheelRef.current?.setSpeedMultiplier(5);

      const spinResult = spinningWheelRef.current?.spin({ winnerId, duration, distance });

      if (!spinResult) {
        return {
          changedDistance: 0,
          initialDistance: 0,
          duration,
          animate: async () => {
            setIsSpinning(false);
          },
        };
      }

      const animateWheel: SpinResult['animate'] = async () => {
        try {
          await spinResult.animate();

          const finalWinnerItem = items.find(({ id }) => id === winnerId);
          finalizeSpin(finalWinnerItem);
        } finally {
          spinningWheelRef.current?.setSpeedMultiplier(1);
          setIsSpinning(false);
        }
      };

      return {
        ...spinResult,
        animate: animateWheel,
      };
    },
    [finalizeSpin, items],
  );

  useImperativeHandle(
    controller,
    () => ({
      spin,
      clearWinner,
      resetPosition,
      highlight: (id: ID) => {
        setHighlightedItemId(id);
      },
      resetStyles,
      eatAnimation: async (id: ID, duration?: number) => {
        await spinningWheelRef.current?.eatAnimation(id, duration);
      },
      getItems: () => normalizedRef.current,
    }),
    [clearWinner, resetPosition, resetStyles, spin],
  );

  const SpinningWheel = parts.spinningWheel;
  const Pointer = parts.pointer;
  const Effects = parts.effects;

  const coreStyle = {
    backgroundImage: coreBackground,
    width: coreSize,
    height: coreSize,
    borderWidth: coreBorderWidth,
    borderColor: '#fff',
  };

  return (
    <div
      className={clsx('base-wheel-wrapper', className)}
      style={{ width: '100%', height: '100%', display: 'inline-block', pointerEvents: 'none', overflow: 'visible' }}
      ref={wrapper}
    >
      <div>
        <Title order={2} className={classes.wheelTarget} ref={spinTarget} style={{ marginBottom: WHEEL_TITLE_GAP }}>
          {t('wheel.winner')}
        </Title>
        <div
          className={classes.wheelContent}
          style={{
            width: layout?.targetWheelSize,
            height: layout?.targetWheelSize,
          }}
        >
          {layout && (
            <>
              <SpinningWheel
                wheelRef={spinningWheelRef}
                layout={layout}
                items={normalizedItems}
                highlightedItemId={highlightedItemId}
                onRotationChange={updateWinnerPreview}
              />
              {Effects ? <Effects layout={layout} isSpinning={isSpinning} /> : null}
              {Pointer ? <Pointer layout={layout} /> : null}
            </>
          )}
          {onCoreImageChange && (
            <Popover width={420} withArrow position='right' closeOnClickOutside={isClickOusideAllowed}>
              <Popover.Target>
                <div ref={coreElement} className={classes.wheelCore} style={coreStyle}>
                  <div className={classes.wheelCoreOverlay}>
                    <Overlay color='black' opacity={0.7} />
                    <Text className={classes.wheelCoreText} size='xl'>
                      {t('wheel.coreImage.wheelOverlay')}
                    </Text>
                  </div>
                </div>
              </Popover.Target>
              <Popover.Dropdown mah={430} p={8} className={classes.wheelCoreEmotesList}>
                <Stack gap='sm'>
                  <ImageLinkInput
                    dialogTitle={t('wheel.coreImage.customImageDialogTitle')}
                    buttonTitle={t('wheel.loadCustomMessage')}
                    buttonClass='upload-wheel-image'
                    onChange={onCoreImageChange}
                    onModalOpenChange={(isOpened) => setIsClickOusideAllowed(!isOpened)}
                  />
                </Stack>
              </Popover.Dropdown>
            </Popover>
          )}
          {!onCoreImageChange && <div ref={coreElement} className={classes.wheelCore} style={coreStyle}></div>}
          {!!winnerItem && <WinnerBackdrop winner={winnerItem} actions={renderWinnerActions?.(winnerItem)} />}
        </div>
      </div>
    </div>
  );
};

export default BaseWheel;
