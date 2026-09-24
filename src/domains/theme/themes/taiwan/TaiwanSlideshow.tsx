import { useEffect, useRef, useState } from 'react';

import { KEN_BURNS_SCALE, SLIDE_ASPECT, SLIDE_FADE_MS, SLIDE_INTERVAL_MS, SLIDE_ZOOM, SLIDES } from './taiwanTokens';

import type { CSSProperties } from 'react';
import type { WheelFrame } from './useWheelFrame';

interface ShownSlide {
  index: number;
  /** Grows with every switch so the fade and the push-in restart on the new photo */
  key: number;
}

interface SlideshowState {
  active: ShownSlide | null;
  /** The photo under the one fading in; dropped once the fade is over */
  leaving: ShownSlide | null;
}

interface SlideBox {
  style: CSSProperties;
  /** The photo was slid left and would uncover the right edge: continue it with a mirrored copy */
  needsMirror: boolean;
}

/** Preloads every photo; a photo joins the rotation only once it has decoded */
const useLoadedSlides = (): boolean[] => {
  const [loaded, setLoaded] = useState<boolean[]>(() => SLIDES.map(() => false));

  useEffect(() => {
    const images = SLIDES.map((slide, index) => {
      const image = new Image();
      image.onload = () => setLoaded((previous) => previous.map((isLoaded, i) => isLoaded || i === index));
      image.src = slide.src;

      return image;
    });

    return () => {
      images.forEach((image) => {
        image.onload = null;
      });
    };
  }, []);

  return loaded;
};

const nextLoaded = (current: number, loaded: boolean[]): number | null => {
  for (let step = 1; step < SLIDES.length; step++) {
    const index = (current + step) % SLIDES.length;
    if (loaded[index]) {
      return index;
    }
  }

  return null;
};

/**
 * Cover (times `SLIDE_ZOOM`) with the photo's anchor slid into the gap right of the wheel.
 * The left edge never uncovers; on the right the photo may stop short, and a mirrored copy
 * fills the rest (mostly under the sidebar, but the header row above it stays visible).
 */
const slideBox = (anchorX: number, { width, height, contentRight, wheel }: WheelFrame): SlideBox => {
  const drawnWidth = Math.max(width, height * SLIDE_ASPECT) * SLIDE_ZOOM;
  const drawnHeight = drawnWidth / SLIDE_ASPECT;
  const target = wheel ? (wheel.right + contentRight) / 2 : width * 0.72;
  const left = Math.min(0, Math.max(contentRight - drawnWidth, target - anchorX * drawnWidth));

  return {
    style: {
      left,
      top: (height - drawnHeight) / 2,
      width: drawnWidth,
      height: drawnHeight,
      transformOrigin: `${anchorX * 100}% 50%`,
      ['--taiwan-push' as string]: `${SLIDE_INTERVAL_MS + SLIDE_FADE_MS}ms`,
      ['--taiwan-ken-burns' as string]: KEN_BURNS_SCALE,
    },
    needsMirror: left + drawnWidth < width,
  };
};

/**
 * Photos of Taiwan in rotation: every `SLIDE_INTERVAL_MS` the next decoded photo fades in
 * over the current one, and each photo slowly pushes in while it is on screen (CSS, see
 * `taiwan.css`; the push-in is off with reduced motion).
 */
const TaiwanSlideshow = ({ frame }: { frame: WheelFrame }) => {
  const loaded = useLoadedSlides();
  const loadedRef = useRef(loaded);
  const [shown, setShown] = useState<SlideshowState>({ active: null, leaving: null });
  const hasActive = shown.active != null;

  useEffect(() => {
    loadedRef.current = loaded;

    const first = loaded.findIndex(Boolean);
    if (!hasActive && first >= 0) {
      setShown({ active: { index: first, key: 0 }, leaving: null });
    }
  }, [hasActive, loaded]);

  useEffect(() => {
    if (!hasActive) {
      return;
    }

    const timer = window.setInterval(() => {
      setShown((previous) => {
        const current = previous.active;
        const next = current ? nextLoaded(current.index, loadedRef.current) : null;
        if (!current || next == null) {
          return previous;
        }

        return { active: { index: next, key: current.key + 1 }, leaving: current };
      });
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [hasActive]);

  useEffect(() => {
    if (!shown.leaving) {
      return;
    }

    const timer = window.setTimeout(
      () => setShown((previous) => ({ ...previous, leaving: null })),
      SLIDE_FADE_MS + 200,
    );

    return () => window.clearTimeout(timer);
  }, [shown.leaving]);

  // the leaving photo stays first and keeps its key, so React never moves its node and its
  // running push-in does not restart
  const slides = [shown.leaving, shown.active].filter((slide): slide is ShownSlide => slide != null);

  return (
    <>
      {slides.map((slide) => {
        const { src, anchorX } = SLIDES[slide.index];
        const { style, needsMirror } = slideBox(anchorX, frame);

        return (
          <div
            key={slide.key}
            className='taiwan-slide'
            style={{ zIndex: slide === shown.active ? 2 : 1, ['--taiwan-fade' as string]: `${SLIDE_FADE_MS}ms` }}
          >
            <div className='taiwan-slide-canvas' style={style}>
              <img src={src} alt='' draggable={false} style={{ left: 0 }} />
              {needsMirror && (
                <img src={src} alt='' draggable={false} style={{ left: 'calc(100% - 1px)', transform: 'scaleX(-1)' }} />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default TaiwanSlideshow;
