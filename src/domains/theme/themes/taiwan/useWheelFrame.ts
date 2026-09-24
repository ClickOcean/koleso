import { useEffect, useState } from 'react';

const MEASURE_INTERVAL = 200;

export interface WheelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  size: number;
}

export interface WheelFrame {
  width: number;
  height: number;
  /** Right edge of the wheel's content area: the sidebar's left edge, or the viewport edge without it */
  contentRight: number;
  /** The wheel square on screen, null until it is laid out */
  wheel: WheelBox | null;
}

/**
 * The header icons also carry "sidebar" in their class names, hence `div` plus the size guard;
 * a stacked narrow layout puts the sidebar under the wheel and counts as no sidebar too.
 */
const measureContentRight = (width: number): number => {
  const rect = document.querySelector('div[class*="sidebar"]')?.getBoundingClientRect();

  return rect && rect.width > 40 && rect.left > width * 0.4 ? Math.round(rect.left) : width;
};

/** Before layout `wheelContent` is an empty full-width div, so only a square counts */
const measureWheel = (): WheelBox | null => {
  const rect = document.querySelector('[class*="wheelContent"]')?.getBoundingClientRect();
  if (!rect || rect.width < 40 || Math.abs(rect.width - rect.height) > 2) {
    return null;
  }

  return {
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    size: Math.round(rect.width),
  };
};

const measure = (): WheelFrame => {
  const { innerWidth, innerHeight } = window;

  return {
    width: innerWidth,
    height: innerHeight,
    contentRight: measureContentRight(innerWidth),
    wheel: measureWheel(),
  };
};

const isSameFrame = (a: WheelFrame, b: WheelFrame): boolean =>
  a.width === b.width &&
  a.height === b.height &&
  a.contentRight === b.contentRight &&
  a.wheel?.left === b.wheel?.left &&
  a.wheel?.top === b.wheel?.top &&
  a.wheel?.size === b.wheel?.size;

/**
 * Where the wheel and the sidebar are on screen, re-measured five times a second (three
 * getBoundingClientRect calls) so the scene follows the wheel when the sidebar is shown or
 * hidden. The state only changes when something moved.
 */
export const useWheelFrame = (): WheelFrame => {
  const [frame, setFrame] = useState<WheelFrame>(measure);

  useEffect(() => {
    const update = () =>
      setFrame((previous) => {
        const next = measure();

        return isSameFrame(previous, next) ? previous : next;
      });

    const timer = window.setInterval(update, MEASURE_INTERVAL);
    window.addEventListener('resize', update);
    update();

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', update);
    };
  }, []);

  return frame;
};
