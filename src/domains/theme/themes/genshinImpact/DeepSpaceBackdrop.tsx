import { useEffect, useRef, useState } from 'react';

/**
 * Shared ultra-realistic deep-space photo (2560×1448): the left half is almost empty
 * black space with faint stars, the Andromeda galaxy fills the upper right and the
 * Pillars of Creation the lower right.
 */
export const DEEP_SPACE_IMAGE = '/themes/shared/deep-space.jpg';

/**
 * The team's own astrophotos (960×1296 portrait): two real frames by a team member
 * stitched vertically, the Pleiades on top, the Lagoon and Trifid nebulae below, on a
 * near-black sky. Shown as a strip in the free area to the left of the wheel.
 */
export const TEAM_ASTROPHOTO_IMAGE = '/themes/shared/team-astrophoto.jpg';

/** Зазор между правым краем полосы и левым краем колеса, px */
const STRIP_WHEEL_GAP = 24;
/** Уже этого полосу не показываем: узкое окно или панель под колесом */
const STRIP_MIN_WIDTH = 140;
/** Как часто перемеряем положение колеса, мс */
const STRIP_MEASURE_INTERVAL = 200;
/** Амплитуда вертикального дрейфа полосы (`deep-space-strip-drift` в ui/theme.css), px */
const STRIP_DRIFT = 14;

/** Правый край полосы растворяется в затемнённом фоне под колесом */
const STRIP_EDGE_MASK = 'linear-gradient(to right, black 52%, rgba(0, 0, 0, 0.6) 76%, transparent 100%)';
/** Верх и низ растворяются в фоне, чтобы снимок лежал слоем поверх космоса, а не заканчивался кромкой */
const STRIP_BOTTOM_MASK = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 0%, black 12%, black 84%, rgba(0, 0, 0, 0.45) 100%)';

type LoadState = 'loading' | 'ready' | 'missing';

/** Remembered across mounts so switching back to the theme does not fade the photos in again */
let cachedState: LoadState = 'loading';
let cachedStripState: LoadState = 'loading';

/**
 * Width of the free area to the left of the wheel: its left edge minus a gap. Before the
 * wheel is laid out `wheelContent` is an empty full-width div, so only a square box counts.
 */
const measureStripWidth = (): number => {
  const rect = document.querySelector('[class*="wheelContent"]')?.getBoundingClientRect();
  const isWheelLaidOut = rect != null && rect.width > 40 && Math.abs(rect.width - rect.height) < 2;

  return isWheelLaidOut ? Math.max(0, Math.round(rect.left - STRIP_WHEEL_GAP)) : 0;
};

/**
 * Re-measures the wheel every second (the sidebar comes and goes with presentation mode,
 * the wheel itself is laid out a moment after mount) and on resize, the same way
 * `SolarSystemBackground` follows the wheel. Re-renders only when the width changes.
 */
const useStripWidth = (): number => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      setWidth(measureStripWidth());
    };

    measure();
    const timer = window.setInterval(measure, STRIP_MEASURE_INTERVAL);
    window.addEventListener('resize', measure);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return width;
};

/**
 * The shared photo, anchored to its right side so the galaxy and the nebula stay in view,
 * drifting very slowly (CSS-only Ken Burns, `deep-space-drift` in ui/theme.css) and
 * darkened on the left where the wheel sits. It fades in once loaded; until then and
 * when the file is missing the theme's own gradient stays visible, nothing flashes.
 */
const DeepSpacePhoto = () => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<LoadState>(cachedState);

  useEffect(() => {
    // A cached image can be complete before React attaches onLoad
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      cachedState = 'ready';
      setState('ready');
    }
  }, []);

  if (state === 'missing') {
    return null;
  }

  return (
    <div
      aria-hidden='true'
      className='pointer-events-none absolute inset-0 h-full w-full'
      style={{
        opacity: state === 'ready' ? 1 : 0,
        transition: 'opacity 1600ms ease-out',
      }}
    >
      <img
        ref={imageRef}
        src={DEEP_SPACE_IMAGE}
        alt=''
        draggable={false}
        decoding='async'
        className='deep-space-photo absolute inset-0 h-full w-full'
        style={{
          objectFit: 'cover',
          // keep the Andromeda / Pillars side in frame at every aspect ratio
          objectPosition: '78% 50%',
        }}
        onLoad={() => {
          cachedState = 'ready';
          setState('ready');
        }}
        onError={() => {
          cachedState = 'missing';
          setState('missing');
        }}
      />
      {/* darken the left where the wheel sits so sector labels stay readable */}
      <div
        className='absolute inset-0'
        style={{
          background:
            // мягче, чем сплошная тьма: звёзды фото должны просвечивать между полосой и колесом
            'linear-gradient(90deg, rgba(3, 4, 13, 0.3) 0%, rgba(3, 4, 13, 0.42) 26%, rgba(3, 4, 13, 0.3) 42%, rgba(3, 4, 13, 0) 56%)',
        }}
      />
      {/* faint warm breathing glow over the nebula in the right third */}
      <div
        className='deep-space-glow absolute inset-y-0 right-0'
        style={{
          width: '42%',
          background:
            'radial-gradient(ellipse 70% 62% at 58% 66%, rgba(255, 186, 120, 1) 0%, rgba(255, 186, 120, 0.35) 40%, rgba(255, 186, 120, 0) 75%)',
        }}
      />
    </div>
  );
};

/**
 * The team's astrophoto in the free strip to the left of the wheel: `object-fit: cover`,
 * right edge and bottom faded with CSS masks, a 120 s vertical drift (CSS-only,
 * `deep-space-strip-drift`; the picture is `STRIP_DRIFT` taller than its box so no edge
 * shows). Nothing is rendered while the strip would be narrower than `STRIP_MIN_WIDTH`,
 * the box stays at opacity 0 until the picture is loaded (no flash) and disappears for
 * good when the file is missing.
 */
const TeamAstrophotoStrip = () => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<LoadState>(cachedStripState);
  const width = useStripWidth();
  const isWide = width >= STRIP_MIN_WIDTH;

  useEffect(() => {
    // A cached image can be complete before React attaches onLoad; the <img> exists only while the strip is wide enough
    const image = imageRef.current;
    if (isWide && image?.complete && image.naturalWidth > 0) {
      cachedStripState = 'ready';
      setState('ready');
    }
  }, [isWide]);

  if (state === 'missing' || !isWide) {
    return null;
  }

  return (
    <div
      aria-hidden='true'
      className='pointer-events-none absolute top-0 left-0 h-full overflow-hidden'
      style={{
        width,
        opacity: state === 'ready' ? 0.92 : 0,
        transition: 'opacity 1600ms ease-out, width 400ms ease',
        maskImage: STRIP_EDGE_MASK,
        WebkitMaskImage: STRIP_EDGE_MASK,
      }}
    >
      <img
        ref={imageRef}
        src={TEAM_ASTROPHOTO_IMAGE}
        alt=''
        draggable={false}
        decoding='async'
        className='deep-space-strip absolute top-0 left-0 w-full'
        style={{
          height: `calc(100% + ${STRIP_DRIFT}px)`,
          objectFit: 'cover',
          objectPosition: '50% 40%',
          maskImage: STRIP_BOTTOM_MASK,
          WebkitMaskImage: STRIP_BOTTOM_MASK,
        }}
        onLoad={() => {
          cachedStripState = 'ready';
          setState('ready');
        }}
        onError={() => {
          cachedStripState = 'missing';
          setState('missing');
        }}
      />
    </div>
  );
};

/**
 * Photoreal backdrop rendered under the constellation particles of the "deep space"
 * theme: the shared photo with its darkening gradient and warm glow, then the team's
 * astrophoto strip. The strip comes later in DOM order, so the darkening gradient over
 * the wheel area does not dim it, while the particles canvas still paints over both.
 */
const DeepSpaceBackdrop = () => (
  // First in DOM order inside the theme root, so the particles canvas paints over it
  <>
    <DeepSpacePhoto />
    <TeamAstrophotoStrip />
  </>
);

export default DeepSpaceBackdrop;
