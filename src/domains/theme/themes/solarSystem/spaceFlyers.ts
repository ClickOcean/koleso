const TAU = 2 * Math.PI;
/** Milliseconds between attempts to launch a new visitor */
const SPAWN_MIN_MS = 4500;
const SPAWN_MAX_MS = 9000;
const MAX_FLYERS = 3;

export type FlyerKind = 'comet' | 'asteroid' | 'station' | 'probe';

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
  /** Lumpy silhouette for asteroids */
  lumps: number[];
}

const KINDS: FlyerKind[] = ['comet', 'asteroid', 'asteroid', 'station', 'probe', 'comet'];

const pickKind = (): FlyerKind => KINDS[Math.floor(Math.random() * KINDS.length)];

/**
 * A visitor starts just outside a random edge and crosses the screen along a
 * straight line aimed at a random point on the opposite side.
 */
const createFlyer = (width: number, height: number, sizeScale: number): Flyer => {
  const kind = pickKind();
  const edge = Math.floor(Math.random() * 4); // 0 top, 1 right, 2 bottom, 3 left
  const margin = 120 * sizeScale;
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

  return {
    kind,
    x,
    y,
    vx: ((tx - x) / distance) * speed,
    vy: ((ty - y) / distance) * speed,
    spin: kind === 'asteroid' ? (Math.random() - 0.5) * 1.6 : (Math.random() - 0.5) * 0.3,
    rotation: Math.random() * TAU,
    scale: sizeScale * (0.8 + Math.random() * 0.6),
    lumps: Array.from({ length: 9 }, () => 0.7 + Math.random() * 0.5),
  };
};

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

  // a couple of craters
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

/** Space station: a cylinder body with two long solar-panel wings, slowly tumbling */
const drawStation = (ctx: CanvasRenderingContext2D, flyer: Flyer): void => {
  const s = flyer.scale;

  ctx.save();
  ctx.translate(flyer.x, flyer.y);
  ctx.rotate(flyer.rotation);

  // truss
  ctx.strokeStyle = '#cfd6dd';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(-70 * s, 0);
  ctx.lineTo(70 * s, 0);
  ctx.stroke();

  // solar panels: dark blue cells with thin grid
  [-1, 1].forEach((side) => {
    const x = side * 22 * s;
    const w = side * 46 * s;
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(Math.min(x, x + w), -9 * s, Math.abs(w), 18 * s);
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.55)';
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 5; i++) {
      const gx = x + (w * i) / 5;
      ctx.beginPath();
      ctx.moveTo(gx, -9 * s);
      ctx.lineTo(gx, 9 * s);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(Math.min(x, x + w), 0);
    ctx.lineTo(Math.max(x, x + w), 0);
    ctx.stroke();
  });

  // modules
  const body = ctx.createLinearGradient(0, -8 * s, 0, 8 * s);
  body.addColorStop(0, '#f8fafc');
  body.addColorStop(1, '#94a3b8');
  ctx.fillStyle = body;
  ctx.fillRect(-16 * s, -6 * s, 32 * s, 12 * s);
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(0, -14 * s, 5 * s, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(0, -6 * s);
  ctx.lineTo(0, -9 * s);
  ctx.stroke();

  // blinking beacon
  ctx.fillStyle = `rgba(255, 80, 80, ${0.4 + 0.6 * Math.abs(Math.sin(flyer.rotation * 9))})`;
  ctx.beginPath();
  ctx.arc(14 * s, -6 * s, 1.6 * s, 0, TAU);
  ctx.fill();
  ctx.restore();
};

/** Deep-space probe: a dish antenna on a bus with a long boom, like Voyager */
const drawProbe = (ctx: CanvasRenderingContext2D, flyer: Flyer): void => {
  const s = flyer.scale;

  ctx.save();
  ctx.translate(flyer.x, flyer.y);
  ctx.rotate(flyer.rotation);

  // boom
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(48 * s, 18 * s);
  ctx.stroke();
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(44 * s, 14 * s, 8 * s, 8 * s);

  // bus
  ctx.fillStyle = '#d4d4d8';
  ctx.beginPath();
  ctx.moveTo(-8 * s, -7 * s);
  ctx.lineTo(8 * s, -7 * s);
  ctx.lineTo(11 * s, 0);
  ctx.lineTo(8 * s, 7 * s);
  ctx.lineTo(-8 * s, 7 * s);
  ctx.lineTo(-11 * s, 0);
  ctx.closePath();
  ctx.fill();

  // dish facing forward
  const dish = ctx.createRadialGradient(-6 * s, -4 * s, 2 * s, 0, 0, 22 * s);
  dish.addColorStop(0, '#ffffff');
  dish.addColorStop(0.6, '#cbd5e1');
  dish.addColorStop(1, '#64748b');
  ctx.fillStyle = dish;
  ctx.beginPath();
  ctx.ellipse(0, -12 * s, 22 * s, 9 * s, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(0, -12 * s, 2.2 * s, 0, TAU);
  ctx.fill();
  ctx.restore();
};

export interface FlyerSystem {
  update(deltaSeconds: number, width: number, height: number, sizeScale: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

/**
 * Occasional visitors crossing deep space: comets, asteroids, a space station
 * and a probe. At most a few at once, each on its own straight path.
 */
export const createFlyerSystem = (): FlyerSystem => {
  let flyers: Flyer[] = [];
  let nextSpawnIn = 1.5;

  return {
    update(delta, width, height, sizeScale) {
      nextSpawnIn -= delta;
      if (nextSpawnIn <= 0) {
        nextSpawnIn = (SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS)) / 1000;
        if (flyers.length < MAX_FLYERS) {
          flyers.push(createFlyer(width, height, sizeScale));
        }
      }

      const margin = 200 * sizeScale;
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
        switch (flyer.kind) {
          case 'comet':
            drawComet(ctx, flyer);
            break;
          case 'asteroid':
            drawAsteroid(ctx, flyer);
            break;
          case 'station':
            drawStation(ctx, flyer);
            break;
          default:
            drawProbe(ctx, flyer);
        }
      });
    },
  };
};
