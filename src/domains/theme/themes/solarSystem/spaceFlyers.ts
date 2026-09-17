import { scaleSprite, sprites } from './spriteImages';

import type { SpriteKey } from './spriteImages';

const TAU = 2 * Math.PI;
/** Milliseconds between attempts to launch a new visitor */
const SPAWN_MIN_MS = 4500;
const SPAWN_MAX_MS = 9000;
const MAX_FLYERS = 3;
/** Гости появляются за краем экрана и исчезают, полностью выйдя за него (комета длинная) */
const SPAWN_MARGIN = 200;
const DESPAWN_MARGIN = 280;

export type FlyerKind = 'comet' | 'asteroid' | 'station' | 'probe';

interface SpriteSpec {
  key: SpriteKey;
  /** Ширина спрайта на экране при sizeScale = 1, px */
  width: number;
}

/**
 * Фотоспрайты из `public/themes/solarSystem/flyers/` (см. spriteImages.ts). У кометы ядро справа,
 * хвост уходит влево, поэтому при повороте на курс она летит ядром вперёд.
 */
const SPRITE_OF: Record<FlyerKind, SpriteSpec> = {
  comet: { key: 'comet', width: 290 },
  asteroid: { key: 'asteroid', width: 70 },
  station: { key: 'iss', width: 118 },
  probe: { key: 'probe', width: 110 },
};

interface Flyer {
  kind: FlyerKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Spin of the body itself, radians per second */
  spin: number;
  rotation: number;
  scale: number;
  /** Lumpy silhouette for asteroids (векторный запасной вариант) */
  lumps: number[];
  /** Спрайт, уменьшенный под свой экранный размер один раз; null, пока картинка не приехала */
  bitmap: HTMLCanvasElement | null;
}

const KINDS: FlyerKind[] = ['comet', 'asteroid', 'asteroid', 'station', 'probe', 'comet'];

const pickKind = (): FlyerKind => KINDS[Math.floor(Math.random() * KINDS.length)];

/** Уменьшенная копия спрайта под экранный размер гостя; делается один раз, дальше только drawImage */
const ensureBitmap = (flyer: Flyer): HTMLCanvasElement | null => {
  if (flyer.bitmap) {
    return flyer.bitmap;
  }

  const { key, width } = SPRITE_OF[flyer.kind];
  const image = sprites.get(key);
  if (!image) {
    return null;
  }

  const drawnWidth = width * flyer.scale;
  flyer.bitmap = scaleSprite(image, drawnWidth, (drawnWidth * image.naturalHeight) / image.naturalWidth);

  return flyer.bitmap;
};

/**
 * A visitor starts just outside a random edge and crosses the screen along a
 * straight line aimed at a random point on the opposite side.
 */
const createFlyer = (width: number, height: number, sizeScale: number): Flyer => {
  const kind = pickKind();
  const edge = Math.floor(Math.random() * 4); // 0 top, 1 right, 2 bottom, 3 left
  const margin = SPAWN_MARGIN * sizeScale;
  let x = 0;
  let y = 0;
  let tx = 0;
  let ty = 0;

  switch (edge) {
    case 0:
      x = Math.random() * width;
      y = -margin;
      tx = Math.random() * width;
      ty = height + margin;
      break;
    case 1:
      x = width + margin;
      y = Math.random() * height;
      tx = -margin;
      ty = Math.random() * height;
      break;
    case 2:
      x = Math.random() * width;
      y = height + margin;
      tx = Math.random() * width;
      ty = -margin;
      break;
    default:
      x = -margin;
      y = Math.random() * height;
      tx = width + margin;
      ty = Math.random() * height;
  }

  const speed = (kind === 'comet' ? 150 : kind === 'asteroid' ? 70 : 55) * (0.8 + Math.random() * 0.5);
  const distance = Math.hypot(tx - x, ty - y) || 1;

  const flyer: Flyer = {
    kind,
    x,
    y,
    vx: ((tx - x) / distance) * speed,
    vy: ((ty - y) / distance) * speed,
    // астероид крутится сам по себе, станция и зонд лишь медленно покачиваются на курсе
    spin: kind === 'asteroid' ? (Math.random() - 0.5) * 1.2 : (Math.random() - 0.5) * 0.3,
    rotation: Math.random() * TAU,
    scale: sizeScale * (0.8 + Math.random() * 0.6),
    lumps: Array.from({ length: 9 }, () => 0.7 + Math.random() * 0.5),
    bitmap: null,
  };
  ensureBitmap(flyer);

  return flyer;
};

/** Ориентация спрайта: комета, станция и зонд летят по курсу, астероид вращается свободно */
const spriteRotation = (flyer: Flyer): number => {
  if (flyer.kind === 'asteroid') {
    return flyer.rotation;
  }

  const heading = Math.atan2(flyer.vy, flyer.vx);
  const tumble = flyer.kind === 'comet' ? 0 : Math.sin(flyer.rotation) * 0.18;

  return heading + tumble;
};

const drawSprite = (ctx: CanvasRenderingContext2D, flyer: Flyer, bitmap: HTMLCanvasElement): void => {
  ctx.save();
  ctx.translate(flyer.x, flyer.y);
  ctx.rotate(spriteRotation(flyer));

  if (flyer.kind === 'comet') {
    // мягкое свечение вокруг ядра (оно у правого края спрайта)
    const nucleusX = bitmap.width * 0.44;
    const glowRadius = bitmap.width * 0.09;
    const glow = ctx.createRadialGradient(nucleusX, 0, 0, nucleusX, 0, glowRadius);
    glow.addColorStop(0, 'rgba(235, 245, 255, 0.55)');
    glow.addColorStop(0.5, 'rgba(160, 200, 255, 0.18)');
    glow.addColorStop(1, 'rgba(120, 170, 255, 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(nucleusX, 0, glowRadius, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  ctx.restore();
};

// --- векторный запасной вариант: рисуется только если файл спрайта не удалось загрузить ---

const drawComet = (ctx: CanvasRenderingContext2D, flyer: Flyer): void => {
  const heading = Math.atan2(flyer.vy, flyer.vx);
  const size = 6 * flyer.scale;
  const tail = 140 * flyer.scale;

  ctx.save();
  ctx.translate(flyer.x, flyer.y);
  ctx.rotate(heading);

  // tail streams behind the head
  const tailGradient = ctx.createLinearGradient(0, 0, -tail, 0);
  tailGradient.addColorStop(0, 'rgba(210, 240, 255, 0.75)');
  tailGradient.addColorStop(0.4, 'rgba(140, 200, 255, 0.3)');
  tailGradient.addColorStop(1, 'rgba(90, 140, 255, 0)');
  ctx.fillStyle = tailGradient;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.9);
  ctx.quadraticCurveTo(-tail * 0.5, -size * 2.2, -tail, -size * 0.6);
  ctx.lineTo(-tail, size * 0.6);
  ctx.quadraticCurveTo(-tail * 0.5, size * 2.2, 0, size * 0.9);
  ctx.closePath();
  ctx.fill();

  const coma = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 3);
  coma.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  coma.addColorStop(0.4, 'rgba(200, 240, 255, 0.55)');
  coma.addColorStop(1, 'rgba(140, 200, 255, 0)');
  ctx.fillStyle = coma;
  ctx.beginPath();
  ctx.arc(0, 0, size * 3, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#eaf7ff';
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, TAU);
  ctx.fill();
  ctx.restore();
};

const drawAsteroid = (ctx: CanvasRenderingContext2D, flyer: Flyer): void => {
  const size = 11 * flyer.scale;

  ctx.save();
  ctx.translate(flyer.x, flyer.y);
  ctx.rotate(flyer.rotation);

  ctx.beginPath();
  flyer.lumps.forEach((lump, index) => {
    const angle = (index / flyer.lumps.length) * TAU;
    const r = size * lump;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();

  const rock = ctx.createRadialGradient(-size * 0.4, -size * 0.4, size * 0.1, 0, 0, size * 1.2);
  rock.addColorStop(0, '#b9b3a8');
  rock.addColorStop(0.6, '#6f6a62');
  rock.addColorStop(1, '#2f2c28');
  ctx.fillStyle = rock;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  [
    [0.25, -0.1, 0.22],
    [-0.3, 0.3, 0.16],
  ].forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.arc(dx * size, dy * size, r * size, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
};

/** Космический аппарат без спрайта: светлое тело с двумя панелями, летит по курсу */
const drawCraft = (ctx: CanvasRenderingContext2D, flyer: Flyer): void => {
  const s = flyer.scale;

  ctx.save();
  ctx.translate(flyer.x, flyer.y);
  ctx.rotate(spriteRotation(flyer));

  ctx.strokeStyle = '#cfd6dd';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(-40 * s, 0);
  ctx.lineTo(40 * s, 0);
  ctx.stroke();

  [-1, 1].forEach((side) => {
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(side > 0 ? 14 * s : -40 * s, -6 * s, 26 * s, 12 * s);
  });

  const body = ctx.createLinearGradient(0, -6 * s, 0, 6 * s);
  body.addColorStop(0, '#f8fafc');
  body.addColorStop(1, '#94a3b8');
  ctx.fillStyle = body;
  ctx.fillRect(-12 * s, -5 * s, 24 * s, 10 * s);
  ctx.restore();
};

export interface FlyerSystem {
  update(deltaSeconds: number, width: number, height: number, sizeScale: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

/**
 * Occasional visitors crossing deep space: a comet, asteroids, the space station
 * and a Voyager-like probe, drawn from photo sprites (vector shapes only if a sprite
 * file is missing). At most a few at once, each on its own straight path.
 */
export const createFlyerSystem = (): FlyerSystem => {
  let flyers: Flyer[] = [];
  let nextSpawnIn = 1.5;

  sprites.preload(['comet', 'asteroid', 'iss', 'probe']);

  return {
    update(delta, width, height, sizeScale) {
      nextSpawnIn -= delta;
      if (nextSpawnIn <= 0) {
        nextSpawnIn = (SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS)) / 1000;
        if (flyers.length < MAX_FLYERS) {
          flyers.push(createFlyer(width, height, sizeScale));
        }
      }

      const margin = DESPAWN_MARGIN * sizeScale;
      flyers.forEach((flyer) => {
        flyer.x += flyer.vx * delta;
        flyer.y += flyer.vy * delta;
        flyer.rotation += flyer.spin * delta;
      });
      flyers = flyers.filter(
        (flyer) => flyer.x > -margin && flyer.x < width + margin && flyer.y > -margin && flyer.y < height + margin,
      );
    },
    draw(ctx) {
      flyers.forEach((flyer) => {
        const bitmap = ensureBitmap(flyer);
        if (bitmap) {
          drawSprite(ctx, flyer, bitmap);
          return;
        }
        if (!sprites.failed(SPRITE_OF[flyer.kind].key)) {
          // спрайт ещё грузится: секунду-другую гость просто не виден
          return;
        }

        switch (flyer.kind) {
          case 'comet':
            drawComet(ctx, flyer);
            break;
          case 'asteroid':
            drawAsteroid(ctx, flyer);
            break;
          default:
            drawCraft(ctx, flyer);
        }
      });
    },
  };
};
