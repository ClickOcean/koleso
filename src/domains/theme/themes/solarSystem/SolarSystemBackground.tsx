import { useEffect, useRef } from 'react';

import { createFlyerSystem } from './spaceFlyers';
import { scaleSprite, sprites } from './spriteImages';

const FRAME_INTERVAL = 50; // ~20 fps
/** Сдвиг колеса больше этого — не дрожание, а переезд (панель показали/скрыли): фон перескакивает сразу */
const SNAP_DISTANCE = 40;
const SPACE = '#03040d';
/** Shared photo backdrop: empty space on the left, Andromeda upper right, the Pillars of Creation lower right */
const BACKDROP_IMAGE = '/themes/shared/deep-space.jpg';
/** Where the Pillars start, as fractions of the photo's width and height; they reach its right and bottom edges */
const PILLARS_LEFT = 0.65;
const PILLARS_TOP = 0.45;
/** Extra px painted around the viewport in the cached layer, so the parallax drift never exposes an edge */
const BACKDROP_PAD = 16;
/** A window drag fires `resize` continuously; the cached layer is repainted once the size has settled */
const RESIZE_REPAINT_DELAY = 150;
/** Parallax drift of the backdrop: two slow sines (px, seconds) and a slow scale breathing */
const DRIFT_X_AMPLITUDE = 12;
const DRIFT_X_PERIOD = 97;
const DRIFT_Y_AMPLITUDE = 10;
const DRIFT_Y_PERIOD = 73;
const BREATH_SCALE = 0.02;
const BREATH_PERIOD = 90;
/** Warm additive pulse over the Pillars: its semi-axes as a fraction of the Pillars region */
const PULSE_PERIOD = 12;
const PULSE_ALPHA_MIN = 0.02;
const PULSE_ALPHA_MAX = 0.06;
const PULSE_REACH = 0.6;
/** Dark halo around the wheel: solid up to the inner multiple of the wheel radius, clear at the outer one */
const VIGNETTE_INNER = 0.9;
const VIGNETTE_OUTER = 1.75;
/** Sides of the offscreen sprites the per-frame gradients are baked into once */
const GLOW_SPRITE_SIZE = 256;
const VIGNETTE_SPRITE_SIZE = 512;
/** Stars per square px of the viewport; fewer over the photo, which carries its own stars */
const STAR_DENSITY = 1 / 2400;
const STAR_DENSITY_OVER_PHOTO = STAR_DENSITY * 0.6;
const TWINKLE_COUNT = 48;
const ASTEROID_COUNT = 440;
/** Asteroid belt, as multiples of the wheel radius */
const BELT_INNER = 1.78;
const BELT_OUTER = 1.86;
/** Seconds per revolution of the belt */
const BELT_PERIOD = 110;
const MOON_PERIOD = 4.5;
const ORBIT_STROKE = 'rgba(255, 255, 255, 0.08)';
const TAU = 2 * Math.PI;

type PlanetName = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

interface Planet {
  name: PlanetName;
  /** Orbit radius as a multiple of the wheel radius */
  orbit: number;
  /** Body radius in px when the wheel radius is 400px */
  size: number;
  /** Seconds per revolution */
  period: number;
  color: string;
  light: string;
  dark: string;
}

interface Ring {
  /** Semi-axes as multiples of the body radius */
  rx: number;
  ry: number;
  tilt: number;
  /** Stroke width as a multiple of the body radius */
  width: number;
  color: string;
  /** Optional dark division at this fraction of `rx` */
  gap?: number;
}

interface SunFrame {
  x: number;
  y: number;
  radius: number;
}

/** Viewport size and the right edge of the wheel's content area, in viewport px */
interface BackdropFrame {
  width: number;
  height: number;
  /** The sidebar's left edge while it is open, else the viewport's right edge */
  contentRight: number;
  /** Левый край колеса в px окна, 0 пока колесо не разложено (тогда полосы слева нет) */
  wheelLeft: number;
}

/** Where the photo lands, in viewport coordinates */
interface BackdropFit {
  offsetX: number;
  offsetY: number;
  drawnWidth: number;
  drawnHeight: number;
}

interface Backdrop {
  image: HTMLImageElement;
  fit: BackdropFit;
}

interface Twinkle {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
}

interface Asteroid {
  angle: number;
  /** 0 = inner edge of the belt, 1 = outer edge */
  band: number;
  size: number;
  bright: boolean;
}

/**
 * Корона (corona.jpg, 1200×1200 на чистом чёрном): чёрный диск Луны стоит не точно по центру кадра —
 * его центр измерен: (0.4975, 0.485) стороны, радиус 0.1938 стороны; стримеры видны примерно до 0.36 от
 * этого центра (вырез берётся шире — см. CORONA_CROP_RATIO — и гасится радиально). Диск прячется под колесо, стримеры выходят на ~1.8 радиуса Солнца.
 */
const CORONA_CENTER_X = 0.4975;
const CORONA_CENTER_Y = 0.485;
const CORONA_INNER_RATIO = 0.1938;
/** Половина стороны выреза из фото (доля стороны фото): шире видимых стримеров, чтобы было где погасить край */
const CORONA_CROP_RATIO = 0.47;
/** Радиальная растушёвка выреза: полная яркость до этой доли полустороны, ноль у края */
const CORONA_FEATHER_START = 0.6;
const CORONA_UNDER_WHEEL = 0.97;
/** Битмап короны не больше этого (px по стороне): дальше он растягивается, стримеры это прощают */
const CORONA_BITMAP_MAX = 1100;
/** Один оборот короны, с */
const CORONA_PERIOD = 360;
const CORONA_BREATH_PERIOD = 9;
const CORONA_ALPHA_MIN = 0.7;
const CORONA_ALPHA_MAX = 1;

/** Доля ширины спрайта планеты, которую занимает сам шар; у Сатурна и Урана остальное — кольца */
const PLANET_BODY_RATIO: Partial<Record<PlanetName, number>> = { saturn: 0.42, uranus: 0.7 };
const PLANET_BODY_RATIO_DEFAULT = 0.92;

/**
 * Чёрная дыра вдалеке (спрайт в духе «Интерстеллара»): небольшая, медленно проходит по верхней части
 * экрана, вокруг неё фон линзируется — кольца звёздного поля растягиваются наружу, как у Гаргантюа.
 */
const HOLE_WIDTH_RATIO = 0.085;
const HOLE_WIDTH_MIN = 120;
const HOLE_WIDTH_MAX = 200;
/** Скорость дрейфа, px/с, и пауза между проходами, с */
const HOLE_SPEED = 7;
const HOLE_REST_MIN = 30;
const HOLE_REST_MAX = 80;
/** Полоса высоты, в которой проходит дыра (доли высоты окна): над колесом, под заголовком */
const HOLE_BAND_TOP = 0.09;
const HOLE_BAND_BOTTOM = 0.2;
/** Линза: кольца от радиуса спрайта до этого множителя, увеличение внутреннего кольца → внешнего */
const LENS_RINGS = 9;
const LENS_REACH = 1.9;
const LENS_INNER_MAGNIFY = 1.42;
const LENS_OUTER_MAGNIFY = 1.04;

/** Полоса с фото сотрудника слева от колеса: зазор до колеса, минимальная ширина, растушёвка краёв */
const STRIP_WHEEL_GAP = 24;
const STRIP_MIN_WIDTH = 140;
const STRIP_ALPHA = 0.92;
const STRIP_FEATHER = 120;
/** Снимок занимает не меньше этой доли высоты; если полоса узкая, он обрезается по бокам */
const STRIP_MIN_HEIGHT_RATIO = 0.78;

const PLANETS: Planet[] = [
  { name: 'mercury', orbit: 1.16, size: 6, period: 18, color: '#9a9a9a', light: '#dedede', dark: '#3a3a3a' },
  { name: 'venus', orbit: 1.3, size: 10, period: 30, color: '#e6c78f', light: '#fff3d2', dark: '#6d5530' },
  { name: 'earth', orbit: 1.46, size: 11, period: 45, color: '#2f7fd6', light: '#a8dcff', dark: '#0f2a5a' },
  { name: 'mars', orbit: 1.62, size: 8, period: 70, color: '#c1440e', light: '#ff9a6a', dark: '#4a1704' },
  { name: 'jupiter', orbit: 2.05, size: 28, period: 120, color: '#d9b48c', light: '#f7e5c8', dark: '#5a4128' },
  { name: 'saturn', orbit: 2.35, size: 24, period: 170, color: '#e3cf9a', light: '#fff5d6', dark: '#5f4f2c' },
  { name: 'uranus', orbit: 2.6, size: 16, period: 240, color: '#9fe3ec', light: '#e6fbff', dark: '#2a6b74' },
  { name: 'neptune', orbit: 2.85, size: 16, period: 320, color: '#2b4fd8', light: '#8faaff', dark: '#0d1c5e' },
];

const RINGS: Partial<Record<PlanetName, Ring>> = {
  saturn: { rx: 2.3, ry: 0.62, tilt: -0.42, width: 0.55, color: 'rgba(232, 214, 168, 0.55)', gap: 0.9 },
  uranus: { rx: 1.9, ry: 0.36, tilt: 1.25, width: 0.16, color: 'rgba(200, 240, 255, 0.4)' },
};

/** Remembered across mounts, so switching back to the theme does not flash the procedural look */
let loadedBackdrop: HTMLImageElement | null = null;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Centre and radius of the wheel in canvas coordinates, or a centre-left guess until it is laid out */
const measureWheel = (canvas: HTMLCanvasElement): SunFrame => {
  const bounds = canvas.getBoundingClientRect();
  const rect = document.querySelector('[class*="wheelContent"]')?.getBoundingClientRect();

  if (rect && rect.width > 40) {
    return {
      x: rect.left + rect.width / 2 - bounds.left,
      y: rect.top + rect.height / 2 - bounds.top,
      radius: rect.width / 2,
    };
  }

  const { innerWidth, innerHeight } = window;

  return { x: innerWidth * 0.36, y: innerHeight * 0.52, radius: Math.min(innerWidth * 0.3, innerHeight * 0.38) };
};

/**
 * Right edge of the wheel's content area: the sidebar's left edge while it is open, the
 * viewport's right edge in presentation mode. The header icons also carry "sidebar" in their
 * class names, hence `div` plus the size guard; a stacked narrow layout puts the sidebar under
 * the wheel and counts as no sidebar too.
 */
const measureContentRight = (width: number): number => {
  const rect = document.querySelector('div[class*="sidebar"]')?.getBoundingClientRect();

  if (rect && rect.width > 40 && rect.left > width * 0.4) {
    return Math.round(rect.left);
  }

  return width;
};

/** Левый край колеса; до раскладки wheelContent — пустой div на всю ширину, поэтому считается только квадрат */
const measureWheelLeft = (): number => {
  const rect = document.querySelector('[class*="wheelContent"]')?.getBoundingClientRect();
  const isLaidOut = rect != null && rect.width > 40 && Math.abs(rect.width - rect.height) < 2;

  return isLaidOut ? Math.round(rect.left) : 0;
};

const measureFrame = (): BackdropFrame => {
  const { innerWidth, innerHeight } = window;

  return {
    width: innerWidth,
    height: innerHeight,
    contentRight: measureContentRight(innerWidth),
    wheelLeft: measureWheelLeft(),
  };
};

/**
 * Cover the viewport height and the content width (plus the drift padding), then align the
 * photo's right edge with the right edge of the content area: Andromeda and the Pillars land
 * between the wheel and the sidebar, and what gets cropped is the empty left side of the photo.
 */
const fitBackdrop = (image: HTMLImageElement, frame: BackdropFrame): BackdropFit => {
  const factor = Math.max(
    (frame.height + 2 * BACKDROP_PAD) / image.naturalHeight,
    (frame.contentRight + BACKDROP_PAD) / image.naturalWidth,
  );
  const drawnWidth = image.naturalWidth * factor;
  const drawnHeight = image.naturalHeight * factor;

  return {
    offsetX: frame.contentRight - drawnWidth,
    offsetY: (frame.height - drawnHeight) / 2,
    drawnWidth,
    drawnHeight,
  };
};

/** Faint procedural nebulae: the look before the photo arrives, and the fallback if it never does */
const paintNebulae = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const reach = Math.max(width, height);
  const nebula = (x: number, y: number, radius: number, color: string) => {
    const cloud = ctx.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, color);
    cloud.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(0, 0, width, height);
  };
  nebula(width * 0.82, height * 0.18, reach * 0.5, 'rgba(70, 40, 130, 0.16)');
  nebula(width * 0.15, height * 0.9, reach * 0.45, 'rgba(20, 70, 120, 0.14)');
  nebula(width * 0.6, height * 0.72, reach * 0.35, 'rgba(120, 40, 80, 0.08)');
};

/**
 * The photo, right-aligned to the content area. Everything right of that edge (the strip under
 * the sidebar, or only the drift padding in presentation mode) continues it with a mirrored,
 * darkened copy, so there is no seam where the panel begins and the drift never uncovers an edge.
 */
const paintPhoto = (ctx: CanvasRenderingContext2D, frame: BackdropFrame, backdrop: Backdrop): void => {
  const { image, fit } = backdrop;
  const seam = frame.contentRight + BACKDROP_PAD;
  const top = fit.offsetY + BACKDROP_PAD;

  ctx.drawImage(image, fit.offsetX + BACKDROP_PAD, top, fit.drawnWidth, fit.drawnHeight);

  ctx.save();
  ctx.translate(seam, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, -fit.drawnWidth, top, fit.drawnWidth, fit.drawnHeight);
  ctx.restore();

  const shade = ctx.createLinearGradient(seam, 0, seam + 120, 0);
  shade.addColorStop(0, 'rgba(3, 4, 13, 0)');
  shade.addColorStop(1, 'rgba(3, 4, 13, 0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(seam, 0, frame.width + 2 * BACKDROP_PAD - seam, frame.height + 2 * BACKDROP_PAD);
};

/** Sparse procedural stars for depth; the brightest few get a halo */
const paintStars = (ctx: CanvasRenderingContext2D, width: number, height: number, density: number): void => {
  const count = Math.round(width * height * density);
  for (let index = 0; index < count; index++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const depth = Math.random();
    const radius = 0.35 + depth * depth * 1.4;
    const alpha = 0.3 + depth * 0.65;
    const tint = Math.random();

    ctx.fillStyle =
      tint < 0.15
        ? `rgba(180, 205, 255, ${alpha})`
        : tint < 0.27
        ? `rgba(255, 225, 190, ${alpha})`
        : `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();

    if (depth > 0.94) {
      const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 5);
      halo.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.35})`);
      halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, radius * 5, 0, TAU);
      ctx.fill();
    }
  }
};

/**
 * Фото сотрудника слева от колеса, слоем поверх космоса: подгоняется по ширине полосы (но не ниже
 * ${STRIP_MIN_HEIGHT_RATIO} высоты, тогда обрезается по бокам), все четыре края растушёваны, так что
 * снимок не заканчивается кромкой, а растворяется в фоне. Рисуется в кеш-слой, то есть один раз на изменение
 * геометрии.
 */
const paintStrip = (ctx: CanvasRenderingContext2D, frame: BackdropFrame, image: HTMLImageElement): void => {
  const stripWidth = frame.wheelLeft - STRIP_WHEEL_GAP;
  if (stripWidth < STRIP_MIN_WIDTH) {
    return;
  }

  const layerHeight = frame.height + 2 * BACKDROP_PAD;
  const factor = Math.min(
    layerHeight / image.naturalHeight,
    Math.max(stripWidth / image.naturalWidth, (layerHeight * STRIP_MIN_HEIGHT_RATIO) / image.naturalHeight),
  );
  const drawnWidth = image.naturalWidth * factor;
  const drawnHeight = image.naturalHeight * factor;

  const layer = document.createElement('canvas');
  layer.width = stripWidth;
  layer.height = Math.ceil(Math.min(layerHeight, drawnHeight));
  const layerCtx = layer.getContext('2d');
  if (!layerCtx) {
    return;
  }

  layerCtx.drawImage(image, (stripWidth - drawnWidth) / 2, (layer.height - drawnHeight) / 2, drawnWidth, drawnHeight);

  // растушёвка: два градиента прозрачности накладываются через destination-in
  layerCtx.globalCompositeOperation = 'destination-in';
  const featherX = Math.min(STRIP_FEATHER, layer.width * 0.35) / layer.width;
  const horizontal = layerCtx.createLinearGradient(0, 0, layer.width, 0);
  horizontal.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
  horizontal.addColorStop(Math.min(0.25, featherX * 0.6), 'rgba(0, 0, 0, 1)');
  horizontal.addColorStop(1 - featherX, 'rgba(0, 0, 0, 1)');
  horizontal.addColorStop(1, 'rgba(0, 0, 0, 0)');
  layerCtx.fillStyle = horizontal;
  layerCtx.fillRect(0, 0, layer.width, layer.height);

  const featherY = Math.min(STRIP_FEATHER, layer.height * 0.2) / layer.height;
  const vertical = layerCtx.createLinearGradient(0, 0, 0, layer.height);
  vertical.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vertical.addColorStop(featherY, 'rgba(0, 0, 0, 1)');
  vertical.addColorStop(1 - featherY, 'rgba(0, 0, 0, 1)');
  vertical.addColorStop(1, 'rgba(0, 0, 0, 0)');
  layerCtx.fillStyle = vertical;
  layerCtx.fillRect(0, 0, layer.width, layer.height);

  ctx.globalAlpha = STRIP_ALPHA;
  ctx.drawImage(layer, BACKDROP_PAD, BACKDROP_PAD + (frame.height - layer.height) / 2);
  ctx.globalAlpha = 1;
};

/**
 * Static backdrop, painted once per frame change: the photo (or the procedural nebulae until it
 * loads) with sparse stars on top. The canvas is `BACKDROP_PAD` larger than the viewport on every
 * side, so the parallax drift in `draw` never uncovers an edge.
 */
const paintStarfield = (
  frame: BackdropFrame,
  backdrop: Backdrop | null,
  strip: HTMLImageElement | null,
): HTMLCanvasElement => {
  const width = frame.width + 2 * BACKDROP_PAD;
  const height = frame.height + 2 * BACKDROP_PAD;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }

  ctx.fillStyle = SPACE;
  ctx.fillRect(0, 0, width, height);

  if (backdrop) {
    paintPhoto(ctx, frame, backdrop);
  } else {
    paintNebulae(ctx, width, height);
  }
  if (strip) {
    paintStrip(ctx, frame, strip);
  }
  paintStars(ctx, width, height, backdrop ? STAR_DENSITY_OVER_PHOTO : STAR_DENSITY);

  return canvas;
};

const createTwinkles = (width: number, height: number): Twinkle[] =>
  Array.from({ length: TWINKLE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: 0.8 + Math.random() * 1.3,
    phase: Math.random() * TAU,
    speed: 0.8 + Math.random() * 2.2,
  }));

const createAsteroid = (): Asteroid => ({
  angle: Math.random() * TAU,
  band: Math.random(),
  size: 0.7 + Math.random() * 1.3,
  bright: Math.random() < 0.3,
});

/** Square offscreen canvas with a radial gradient baked in, so frames blit a bitmap instead of filling a gradient */
const createGradientSprite = (size: number, innerRatio: number, inner: string, outer: string): HTMLCanvasElement => {
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext('2d');
  if (!ctx) {
    return sprite;
  }

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, half * innerRatio, half, half, half);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return sprite;
};

/** Warm glow, full alpha at the centre; `drawPillarsPulse` stretches it over the Pillars with the pulsing alpha */
const createGlowSprite = (): HTMLCanvasElement =>
  createGradientSprite(GLOW_SPRITE_SIZE, 0, 'rgba(255, 176, 96, 1)', 'rgba(255, 176, 96, 0)');

/** Dark halo: the sprite radius stands for `VIGNETTE_OUTER` wheel radii, the solid disc for `VIGNETTE_INNER` */
const createVignetteSprite = (): HTMLCanvasElement =>
  createGradientSprite(
    VIGNETTE_SPRITE_SIZE,
    VIGNETTE_INNER / VIGNETTE_OUTER,
    'rgba(3, 4, 13, 0.6)',
    'rgba(3, 4, 13, 0)',
  );

/** Gentle breathing of the nebula: a low-alpha additive glow, elliptical, over the Pillars only */
const drawPillarsPulse = (
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  fit: BackdropFit,
  driftX: number,
  driftY: number,
  seconds: number,
): void => {
  const width = fit.drawnWidth * (1 - PILLARS_LEFT);
  const height = fit.drawnHeight * (1 - PILLARS_TOP);
  const centerX = fit.offsetX + fit.drawnWidth - width / 2 + driftX;
  const centerY = fit.offsetY + fit.drawnHeight - height / 2 + driftY;
  const reachX = width * PULSE_REACH;
  const reachY = height * PULSE_REACH;
  const wave = 0.5 + 0.5 * Math.sin((TAU * seconds) / PULSE_PERIOD);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = PULSE_ALPHA_MIN + (PULSE_ALPHA_MAX - PULSE_ALPHA_MIN) * wave;
  ctx.drawImage(sprite, centerX - reachX, centerY - reachY, 2 * reachX, 2 * reachY);
  ctx.restore();
};

/** Dark halo under and around the wheel, so the Sun keeps its contrast against the photo */
const drawWheelVignette = (ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, sun: SunFrame): void => {
  const reach = sun.radius * VIGNETTE_OUTER;
  ctx.drawImage(sprite, sun.x - reach, sun.y - reach, 2 * reach, 2 * reach);
};

const drawTwinkles = (ctx: CanvasRenderingContext2D, twinkles: Twinkle[], seconds: number): void => {
  twinkles.forEach((star) => {
    const glow = 0.5 + 0.5 * Math.sin(seconds * star.speed + star.phase);
    const radius = star.radius * (0.7 + 0.5 * glow);

    ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + 0.75 * glow})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, radius, 0, TAU);
    ctx.fill();

    if (glow > 0.85) {
      const spike = radius * 4;
      ctx.strokeStyle = `rgba(255, 255, 255, ${((glow - 0.85) / 0.15) * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(star.x - spike, star.y);
      ctx.lineTo(star.x + spike, star.y);
      ctx.moveTo(star.x, star.y - spike);
      ctx.lineTo(star.x, star.y + spike);
      ctx.stroke();
    }
  });
};

const drawBelt = (ctx: CanvasRenderingContext2D, asteroids: Asteroid[], sun: SunFrame, beltAngle: number): void => {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  [BELT_INNER, BELT_OUTER].forEach((band) => {
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.radius * band, 0, TAU);
    ctx.stroke();
  });

  [false, true].forEach((bright) => {
    ctx.fillStyle = bright ? 'rgba(225, 215, 195, 0.5)' : 'rgba(200, 190, 170, 0.24)';
    ctx.beginPath();
    asteroids.forEach((asteroid) => {
      if (asteroid.bright !== bright) {
        return;
      }

      // inner asteroids run a little faster, like a real belt
      const radius = sun.radius * (BELT_INNER + asteroid.band * (BELT_OUTER - BELT_INNER));
      const angle = asteroid.angle + beltAngle * (1.1 - asteroid.band * 0.2);
      ctx.rect(sun.x + Math.cos(angle) * radius, sun.y + Math.sin(angle) * radius, asteroid.size, asteroid.size);
    });
    ctx.fill();
  });
};

/** Sphere lit from the sun: highlight pulled towards the wheel centre, dark on the far side */
const fillBody = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sunAngle: number,
  light: string,
  color: string,
  dark: string,
): void => {
  const hx = x - Math.cos(sunAngle) * radius * 0.45;
  const hy = y - Math.sin(sunAngle) * radius * 0.45;
  const body = ctx.createRadialGradient(hx, hy, radius * 0.08, x, y, radius);
  body.addColorStop(0, light);
  body.addColorStop(0.5, color);
  body.addColorStop(1, dark);

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
};

/** Terminator overlay on top of surface features */
const shadeBody = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sunAngle: number): void => {
  const hx = x - Math.cos(sunAngle) * radius * 0.5;
  const hy = y - Math.sin(sunAngle) * radius * 0.5;
  const shade = ctx.createRadialGradient(hx, hy, 0, hx, hy, radius * 1.9);
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  shade.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
};

/** Surface details, drawn inside a clip to the body */
const drawFeatures = (ctx: CanvasRenderingContext2D, name: PlanetName, x: number, y: number, r: number): void => {
  switch (name) {
    case 'jupiter': {
      const bands: [number, number, string][] = [
        [-0.55, 0.16, 'rgba(169, 124, 80, 0.5)'],
        [-0.15, 0.12, 'rgba(243, 230, 207, 0.5)'],
        [0.2, 0.18, 'rgba(184, 134, 90, 0.55)'],
        [0.55, 0.12, 'rgba(142, 106, 68, 0.45)'],
      ];
      bands.forEach(([offset, thickness, color]) => {
        ctx.fillStyle = color;
        ctx.fillRect(x - r, y + offset * r - (thickness * r) / 2, 2 * r, thickness * r);
      });
      ctx.fillStyle = 'rgba(196, 84, 60, 0.85)';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.35, y + r * 0.3, r * 0.22, r * 0.13, 0, 0, TAU);
      ctx.fill();
      break;
    }
    case 'earth': {
      ctx.fillStyle = 'rgba(66, 160, 80, 0.9)';
      [
        [-0.35, -0.3, 0.32, 0.22, 0.4],
        [0.25, 0.1, 0.26, 0.36, -0.5],
        [-0.15, 0.45, 0.2, 0.12, 0.2],
      ].forEach(([dx, dy, rx, ry, tilt]) => {
        ctx.beginPath();
        ctx.ellipse(x + dx * r, y + dy * r, rx * r, ry * r, tilt, 0, TAU);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.92, r * 0.5, r * 0.18, 0, 0, TAU);
      ctx.fill();
      break;
    }
    case 'mars': {
      ctx.fillStyle = 'rgba(90, 30, 10, 0.45)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.2, y + r * 0.15, r * 0.5, r * 0.22, 0.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.9, r * 0.36, r * 0.16, 0, 0, TAU);
      ctx.fill();
      break;
    }
    case 'venus': {
      ctx.strokeStyle = 'rgba(255, 250, 235, 0.35)';
      ctx.lineWidth = r * 0.16;
      [-0.35, 0.3].forEach((offset) => {
        ctx.beginPath();
        ctx.ellipse(x, y + offset * r, r * 0.9, r * 0.28, 0.25, 0, Math.PI);
        ctx.stroke();
      });
      break;
    }
    case 'neptune': {
      ctx.fillStyle = 'rgba(10, 20, 90, 0.5)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.25, y - r * 0.2, r * 0.3, r * 0.16, 0.3, 0, TAU);
      ctx.fill();
      break;
    }
    default:
      break;
  }
};

/** One half of a ring system; the half behind the planet is drawn first, the front half over it */
const strokeRingHalf = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  ring: Ring,
  front: boolean,
): void => {
  const from = front ? 0 : Math.PI;
  const to = front ? Math.PI : TAU;

  ctx.strokeStyle = ring.color;
  ctx.lineWidth = r * ring.width;
  ctx.beginPath();
  ctx.ellipse(x, y, r * ring.rx, r * ring.ry, ring.tilt, from, to);
  ctx.stroke();

  if (ring.gap) {
    ctx.strokeStyle = 'rgba(3, 4, 13, 0.6)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.ellipse(x, y, r * ring.rx * ring.gap, r * ring.ry * ring.gap, ring.tilt, from, to);
    ctx.stroke();
  }
};

const drawPlanet = (
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  x: number,
  y: number,
  radius: number,
  angle: number,
  moonAngle: number,
): void => {
  const ring = RINGS[planet.name];
  const hasMoon = planet.name === 'earth';
  const moonRadius = Math.max(1.3, radius * 0.27);
  const moonX = x + Math.cos(moonAngle) * radius * 2.5;
  const moonY = y + Math.sin(moonAngle) * radius * 1.25;
  const moonBehind = Math.sin(moonAngle) < 0;

  const drawMoon = () => {
    fillBody(ctx, moonX, moonY, moonRadius, angle, '#eeeeee', '#b9b9b9', '#4a4a4a');
    shadeBody(ctx, moonX, moonY, moonRadius, angle);
  };

  if (ring) {
    strokeRingHalf(ctx, x, y, radius, ring, false);
  }
  if (hasMoon && moonBehind) {
    drawMoon();
  }

  fillBody(ctx, x, y, radius, angle, planet.light, planet.color, planet.dark);

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.clip();
  drawFeatures(ctx, planet.name, x, y, radius);
  ctx.restore();

  shadeBody(ctx, x, y, radius, angle);

  if (ring) {
    strokeRingHalf(ctx, x, y, radius, ring, true);
  }
  if (hasMoon && !moonBehind) {
    drawMoon();
  }
};

interface CoronaBitmap {
  /** Радиус Солнца, под который построен битмап */
  radius: number;
  canvas: HTMLCanvasElement;
}

/**
 * Чёрный фон фото короны переводится в прозрачность один раз: альфа = яркость пикселя, цвет
 * делится на неё (premultiplied-семантика), так что обычный source-over даёт тот же результат, что
 * 'screen'-смешивание, но без дорогого блендинга в каждом кадре.
 */
const blackToAlpha = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;
  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const alpha = Math.max(r, g, b);
    if (alpha === 0) {
      data[index + 3] = 0;
      continue;
    }
    data[index] = Math.min(255, Math.round((r * 255) / alpha));
    data[index + 1] = Math.min(255, Math.round((g * 255) / alpha));
    data[index + 2] = Math.min(255, Math.round((b * 255) / alpha));
    data[index + 3] = alpha;
  }
  ctx.putImageData(frame, 0, 0);
};

/**
 * Корона под размер Солнца: из фото берётся квадрат со стримерами вокруг измеренного центра диска,
 * уменьшается один раз (не больше CORONA_BITMAP_MAX по стороне) и переводится в RGBA; в кадре остаётся
 * один drawImage с поворотом. Пересобирается, когда радиус колеса заметно меняется.
 */
const buildCoronaBitmap = (image: HTMLImageElement, radius: number): CoronaBitmap => {
  const side = (radius * CORONA_UNDER_WHEEL) / CORONA_INNER_RATIO;
  const cropRatio = CORONA_CROP_RATIO * 2;
  const source = image.naturalWidth * cropRatio;
  const sourceLeft = image.naturalWidth * CORONA_CENTER_X - source / 2;
  const sourceTop = image.naturalHeight * CORONA_CENTER_Y - source / 2;
  const target = Math.max(2, Math.min(CORONA_BITMAP_MAX, Math.round(side * cropRatio)));

  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // ступенчатое уменьшение большого фото даёт чистые стримеры без «кипения» при вращении
    const scaled = scaleSprite(image, (image.naturalWidth * target) / source, (image.naturalHeight * target) / source);
    ctx.drawImage(scaled, (-sourceLeft * target) / source, (-sourceTop * target) / source);
    blackToAlpha(canvas);

    // квадратный край выреза гасим радиально, иначе при вращении видна диагональная граница
    const half = target / 2;
    const feather = ctx.createRadialGradient(half, half, half * CORONA_FEATHER_START, half, half, half * 0.985);
    feather.addColorStop(0, 'rgba(0, 0, 0, 1)');
    feather.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = feather;
    ctx.fillRect(0, 0, target, target);
    ctx.globalCompositeOperation = 'source-over';
  }

  return { radius, canvas };
};

/** Корона: RGBA-спрайт, поэтому обычный drawImage; масштаб — от радиуса, под который она собрана */
const drawCorona = (ctx: CanvasRenderingContext2D, bitmap: CoronaBitmap, sun: SunFrame, seconds: number): void => {
  const breath = 0.5 - 0.5 * Math.cos((TAU * seconds) / CORONA_BREATH_PERIOD);
  const size = ((sun.radius * CORONA_UNDER_WHEEL) / CORONA_INNER_RATIO) * CORONA_CROP_RATIO * 2;

  ctx.save();
  ctx.globalAlpha = CORONA_ALPHA_MIN + (CORONA_ALPHA_MAX - CORONA_ALPHA_MIN) * breath;
  ctx.translate(sun.x, sun.y);
  ctx.rotate((TAU * seconds) / CORONA_PERIOD);
  ctx.drawImage(bitmap.canvas, -size / 2, -size / 2, size, size);
  ctx.restore();
};

interface PlanetBitmap {
  width: number;
  canvas: HTMLCanvasElement;
}

/**
 * Планета из фотоспрайта. Спрайты освещены слева (правая треть в тени), поэтому поворот на угол орбиты
 * `angle` (направление от Солнца к планете) разворачивает освещённую сторону к Солнцу: при angle = 0 планета
 * правее Солнца и светится слева. Уменьшенная копия под текущий размер кешируется по имени.
 */
const drawPlanetSprite = (
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  image: HTMLImageElement,
  x: number,
  y: number,
  radius: number,
  angle: number,
  moonAngle: number,
  cache: Map<PlanetName, PlanetBitmap>,
): void => {
  const bodyRatio = PLANET_BODY_RATIO[planet.name] ?? PLANET_BODY_RATIO_DEFAULT;
  const width = Math.max(2, Math.round((2 * radius) / bodyRatio));
  let bitmap = cache.get(planet.name);
  if (!bitmap || Math.abs(bitmap.width - width) > 1) {
    bitmap = { width, canvas: scaleSprite(image, width, (width * image.naturalHeight) / image.naturalWidth) };
    cache.set(planet.name, bitmap);
  }

  const hasMoon = planet.name === 'earth';
  const moonRadius = Math.max(1.3, radius * 0.27);
  const moonX = x + Math.cos(moonAngle) * radius * 2.5;
  const moonY = y + Math.sin(moonAngle) * radius * 1.25;
  const moonBehind = Math.sin(moonAngle) < 0;
  const drawMoon = () => {
    fillBody(ctx, moonX, moonY, moonRadius, angle, '#eeeeee', '#b9b9b9', '#4a4a4a');
    shadeBody(ctx, moonX, moonY, moonRadius, angle);
  };

  if (hasMoon && moonBehind) {
    drawMoon();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(bitmap.canvas, -bitmap.canvas.width / 2, -bitmap.canvas.height / 2);
  ctx.restore();

  if (hasMoon && !moonBehind) {
    drawMoon();
  }
};

interface BlackHole {
  x: number;
  y: number;
  /** px/с; знак задаёт направление прохода */
  vx: number;
  width: number;
  /** Секунды до следующего появления, пока дыра за кадром */
  rest: number;
  bitmap: HTMLCanvasElement | null;
}

const createBlackHole = (width: number, height: number, sizeScale: number): BlackHole => ({
  x: width * 0.75,
  y: height * (HOLE_BAND_TOP + Math.random() * (HOLE_BAND_BOTTOM - HOLE_BAND_TOP)),
  vx: -HOLE_SPEED * sizeScale,
  width: clamp(width * HOLE_WIDTH_RATIO, HOLE_WIDTH_MIN, HOLE_WIDTH_MAX) * sizeScale,
  rest: 0,
  bitmap: null,
});

/** Дыра уходит за край — отдыхает и возвращается с другой стороны на новой высоте */
const updateBlackHole = (hole: BlackHole, delta: number, width: number, height: number): void => {
  if (hole.rest > 0) {
    hole.rest -= delta;
    if (hole.rest <= 0) {
      hole.vx = -hole.vx;
      hole.x = hole.vx > 0 ? -hole.width : width + hole.width;
      hole.y = height * (HOLE_BAND_TOP + Math.random() * (HOLE_BAND_BOTTOM - HOLE_BAND_TOP));
    }
    return;
  }

  hole.x += hole.vx * delta;
  if (hole.x < -hole.width || hole.x > width + hole.width) {
    hole.rest = HOLE_REST_MIN + Math.random() * (HOLE_REST_MAX - HOLE_REST_MIN);
  }
};

/**
 * Гравитационное линзирование: уже нарисованный фон вокруг дыры перерисовывается кольцами с
 * убывающим к краю увеличением, так что звёзды у горизонта растягиваются в дуги. Источник — сам холст,
 * поэтому вызывать сразу после фона и до планет; девять drawImage небольшого квадрата в кадре.
 */
const drawLensing = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, hole: BlackHole): void => {
  const inner = hole.width * 0.52;
  const outer = inner * LENS_REACH;
  const sourceHalf = outer * 1.1;
  const sx = Math.max(0, hole.x - sourceHalf);
  const sy = Math.max(0, hole.y - sourceHalf);
  const sw = Math.min(canvas.width, hole.x + sourceHalf) - sx;
  const sh = Math.min(canvas.height, hole.y + sourceHalf) - sy;
  if (sw <= 0 || sh <= 0) {
    return;
  }

  for (let ring = 0; ring < LENS_RINGS; ring++) {
    // увеличение спадает квадратично: сильнее всего у горизонта, к краю кольца почти исчезает
    const t = ring / (LENS_RINGS - 1);
    const magnify = LENS_OUTER_MAGNIFY + (LENS_INNER_MAGNIFY - LENS_OUTER_MAGNIFY) * (1 - t) * (1 - t);
    const r0 = inner + ((outer - inner) * ring) / LENS_RINGS;
    const r1 = inner + ((outer - inner) * (ring + 1)) / LENS_RINGS + 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, r1, 0, TAU);
    ctx.arc(hole.x, hole.y, r0, 0, TAU, true);
    ctx.clip();
    ctx.drawImage(
      canvas,
      sx,
      sy,
      sw,
      sh,
      hole.x + (sx - hole.x) * magnify,
      hole.y + (sy - hole.y) * magnify,
      sw * magnify,
      sh * magnify,
    );
    ctx.restore();
  }
};

const drawBlackHole = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, hole: BlackHole, seconds: number): void => {
  if (hole.rest > 0) {
    return;
  }

  const image = sprites.get('blackhole');
  if (!image) {
    return;
  }
  if (!hole.bitmap || Math.abs(hole.bitmap.width - hole.width) > 1) {
    hole.bitmap = scaleSprite(image, hole.width, (hole.width * image.naturalHeight) / image.naturalWidth);
  }

  drawLensing(ctx, canvas, hole);

  // диск чуть мерцает, как горячая плазма
  ctx.save();
  ctx.globalAlpha = 0.9 + 0.1 * Math.sin(seconds * 1.7);
  ctx.drawImage(hole.bitmap, hole.x - hole.bitmap.width / 2, hole.y - hole.bitmap.height / 2);
  ctx.restore();
};

/**
 * Deep space behind the wheel: the shared photo backdrop (Andromeda and the Pillars of
 * Creation kept in the gap between the wheel and the sidebar) drifting slowly, a few
 * twinkling stars, and the Solar System orbiting the wheel itself. The wheel's position
 * and the sidebar's edge are measured every second (and on resize), so the orbits stay
 * centred on the wheel and the photo stays aligned whatever the layout.
 */
const SolarSystemBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const anglesRef = useRef<number[]>(PLANETS.map(() => Math.random() * TAU));
  const moonAngleRef = useRef(Math.random() * TAU);
  const beltAngleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    const asteroids = Array.from({ length: ASTEROID_COUNT }, createAsteroid);
    const flyers = createFlyerSystem();
    const planetBitmaps = new Map<PlanetName, PlanetBitmap>();
    let coronaBitmap: CoronaBitmap | null = null;
    sprites.preload(['corona', 'astrophoto', 'blackhole', ...PLANETS.map((planet) => planet.name)]);
    let hole: BlackHole | null = null;
    const glowSprite = createGlowSprite();
    const vignetteSprite = createVignetteSprite();
    let frame = measureFrame();
    let image = loadedBackdrop;
    let backdrop: Backdrop | null = null;
    let starfield: HTMLCanvasElement | null = null;
    let twinkles: Twinkle[] = [];
    let target = measureWheel(canvas);
    let sun: SunFrame = { ...target };
    let frameId: number | null = null;
    let repaintTimer: number | null = null;
    let lastFrame = 0;

    const cancelPendingRepaint = () => {
      if (repaintTimer != null) {
        window.clearTimeout(repaintTimer);
        repaintTimer = null;
      }
    };

    // the cached layer is the expensive part: repaint it only when the photo arrives or the frame changes
    const repaint = () => {
      cancelPendingRepaint();
      backdrop = image ? { image, fit: fitBackdrop(image, frame) } : null;
      starfield = paintStarfield(frame, backdrop, sprites.get('astrophoto'));
    };

    const layout = () => {
      frame = measureFrame();
      canvas.width = frame.width;
      canvas.height = frame.height;
      twinkles = createTwinkles(frame.width, frame.height);
      target = measureWheel(canvas);
      sun = { ...target };
    };

    // a window drag fires resize continuously: the canvas follows at once (draw stretches the
    // stale layer over it meanwhile) and the layer is repainted once the size has settled
    const resize = () => {
      layout();
      cancelPendingRepaint();
      repaintTimer = window.setTimeout(repaint, RESIZE_REPAINT_DELAY);
    };

    // the sidebar comes and goes with presentation mode: follow its edge, keep the orbits on the wheel.
    // Замер идёт каждый кадр (три getBoundingClientRect — дёшево), иначе корона на секунду отставала от колеса
    const measure = () => {
      target = measureWheel(canvas);
      const contentRight = measureContentRight(frame.width);
      const wheelLeft = measureWheelLeft();
      if (contentRight !== frame.contentRight || Math.abs(wheelLeft - frame.wheelLeft) > 2) {
        frame = { ...frame, contentRight, wheelLeft };
        repaint();
      }
    };

    // until the photo loads (or if the file is missing) the procedural nebulae stay on screen
    const picture = new Image();
    if (!image) {
      picture.onload = () => {
        loadedBackdrop = picture;
        image = picture;
        repaint();
      };
      picture.src = BACKDROP_IMAGE;
    }
    // фото сотрудника приезжает — слой перерисовывается (если оно уже в кеше, слушатель зовётся сразу)
    const unsubscribeStrip = sprites.subscribe('astrophoto', () => repaint());

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (document.hidden || timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 250) / 1000 : FRAME_INTERVAL / 1000;
      lastFrame = timestamp;

      const seconds = timestamp / 1000;
      const { width, height } = canvas;

      measure();

      // мелкое дрожание сглаживаем, переезд колеса (панель показали/скрыли) повторяем мгновенно
      const jump = Math.hypot(target.x - sun.x, target.y - sun.y);
      if (jump > SNAP_DISTANCE || Math.abs(target.radius - sun.radius) > SNAP_DISTANCE) {
        sun = { ...target };
      } else {
        sun = {
          x: sun.x + (target.x - sun.x) * 0.3,
          y: sun.y + (target.y - sun.y) * 0.3,
          radius: sun.radius + (target.radius - sun.radius) * 0.3,
        };
      }
      const R = sun.radius;
      const s = clamp(R / 400, 0.55, 1.35);

      if (starfield) {
        // parallax: the cached layer drifts a few px along two slow sines and breathes in scale
        // around the viewport centre; the padding painted around it keeps the edges covered.
        // It is sized to the current padded frame rather than its own size, so a stale layer
        // still covers the canvas while a resize repaint is pending
        const driftX = DRIFT_X_AMPLITUDE * Math.sin((TAU * seconds) / DRIFT_X_PERIOD);
        const driftY = DRIFT_Y_AMPLITUDE * Math.sin((TAU * seconds) / DRIFT_Y_PERIOD + 1.7);
        const breath = 1 + BREATH_SCALE * (0.5 - 0.5 * Math.cos((TAU * seconds) / BREATH_PERIOD));
        const layerWidth = width + 2 * BACKDROP_PAD;
        const layerHeight = height + 2 * BACKDROP_PAD;
        const drawnWidth = layerWidth * breath;
        const drawnHeight = layerHeight * breath;

        ctx.drawImage(
          starfield,
          driftX - BACKDROP_PAD - (drawnWidth - layerWidth) / 2,
          driftY - BACKDROP_PAD - (drawnHeight - layerHeight) / 2,
          drawnWidth,
          drawnHeight,
        );
        if (backdrop) {
          drawPillarsPulse(ctx, glowSprite, backdrop.fit, driftX, driftY, seconds);
        }
      } else {
        ctx.fillStyle = SPACE;
        ctx.fillRect(0, 0, width, height);
      }

      // далёкая чёрная дыра: линзирует фон под собой, поэтому рисуется до всего остального
      hole ??= createBlackHole(width, height, s);
      updateBlackHole(hole, delta, width, height);
      drawBlackHole(ctx, canvas, hole, seconds);

      drawWheelVignette(ctx, vignetteSprite, sun);
      drawTwinkles(ctx, twinkles, seconds);

      // настоящая корона вокруг колеса: медленно вращается и дышит
      const coronaImage = sprites.get('corona');
      if (coronaImage) {
        if (!coronaBitmap || Math.abs(coronaBitmap.radius - target.radius) > 4) {
          coronaBitmap = buildCoronaBitmap(coronaImage, target.radius);
        }
        drawCorona(ctx, coronaBitmap, sun, seconds);
      }

      // comets, asteroids, a station and a probe passing through
      flyers.update(delta, width, height, s);
      flyers.draw(ctx);

      // the Sun lights the space around it
      const wash = ctx.createRadialGradient(sun.x, sun.y, R * 0.95, sun.x, sun.y, R * 1.8);
      wash.addColorStop(0, 'rgba(255, 160, 70, 0.16)');
      wash.addColorStop(0.5, 'rgba(255, 130, 50, 0.05)');
      wash.addColorStop(1, 'rgba(255, 120, 40, 0)');
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, R * 1.8, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = ORBIT_STROKE;
      ctx.lineWidth = 1;
      PLANETS.forEach((planet) => {
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, planet.orbit * R, 0, TAU);
        ctx.stroke();
      });

      beltAngleRef.current += (TAU * delta) / BELT_PERIOD;
      drawBelt(ctx, asteroids, sun, beltAngleRef.current);

      moonAngleRef.current = (moonAngleRef.current + (TAU * delta) / MOON_PERIOD) % TAU;
      const angles = anglesRef.current;

      PLANETS.forEach((planet, index) => {
        angles[index] = (angles[index] + (TAU * delta) / planet.period) % TAU;

        const angle = angles[index];
        const orbitRadius = planet.orbit * R;
        const x = sun.x + Math.cos(angle) * orbitRadius;
        const y = sun.y + Math.sin(angle) * orbitRadius;
        const radius = planet.size * s;
        const margin = radius * 3;

        if (x < -margin || x > width + margin || y < -margin || y > height + margin) {
          return;
        }

        const sprite = sprites.get(planet.name);
        if (sprite) {
          drawPlanetSprite(ctx, planet, sprite, x, y, radius, angle, moonAngleRef.current, planetBitmaps);
        } else {
          drawPlanet(ctx, planet, x, y, radius, angle, moonAngleRef.current);
        }
      });
    };

    layout();
    repaint();
    window.addEventListener('resize', resize);
    frameId = requestAnimationFrame(draw);

    return () => {
      picture.onload = null;
      unsubscribeStrip();
      window.removeEventListener('resize', resize);
      cancelPendingRepaint();
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div className='absolute inset-0 z-0 h-full w-full overflow-hidden' style={{ background: SPACE }}>
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' />
      {/* darken the far edges so the UI panels and the Sun stay the focus */}
      <div
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0) 48%, rgba(0, 0, 0, 0.4) 80%, rgba(0, 0, 0, 0.7) 100%)',
        }}
      />
    </div>
  );
};

export default SolarSystemBackground;
