import { useEffect, useRef } from 'react';

import { createFlyerSystem } from './spaceFlyers';

const FRAME_INTERVAL = 42; // ~24 fps
const MEASURE_INTERVAL = 1000;
const SPACE = '#03040d';
/** Stars per square px of the viewport */
const STAR_DENSITY = 1 / 2400;
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

const PLANETS: Planet[] = [
  { name: 'mercury', orbit: 1.16, size: 4, period: 18, color: '#9a9a9a', light: '#dedede', dark: '#3a3a3a' },
  { name: 'venus', orbit: 1.3, size: 7, period: 30, color: '#e6c78f', light: '#fff3d2', dark: '#6d5530' },
  { name: 'earth', orbit: 1.46, size: 8, period: 45, color: '#2f7fd6', light: '#a8dcff', dark: '#0f2a5a' },
  { name: 'mars', orbit: 1.62, size: 6, period: 70, color: '#c1440e', light: '#ff9a6a', dark: '#4a1704' },
  { name: 'jupiter', orbit: 2.05, size: 20, period: 120, color: '#d9b48c', light: '#f7e5c8', dark: '#5a4128' },
  { name: 'saturn', orbit: 2.35, size: 17, period: 170, color: '#e3cf9a', light: '#fff5d6', dark: '#5f4f2c' },
  { name: 'uranus', orbit: 2.6, size: 12, period: 240, color: '#9fe3ec', light: '#e6fbff', dark: '#2a6b74' },
  { name: 'neptune', orbit: 2.85, size: 12, period: 320, color: '#2b4fd8', light: '#8faaff', dark: '#0d1c5e' },
];

const RINGS: Partial<Record<PlanetName, Ring>> = {
  saturn: { rx: 2.3, ry: 0.62, tilt: -0.42, width: 0.55, color: 'rgba(232, 214, 168, 0.55)', gap: 0.9 },
  uranus: { rx: 1.9, ry: 0.36, tilt: 1.25, width: 0.16, color: 'rgba(200, 240, 255, 0.4)' },
};

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

/** Static starfield with faint nebulae, painted once per viewport size */
const paintStarfield = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }

  ctx.fillStyle = SPACE;
  ctx.fillRect(0, 0, width, height);

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

  const count = Math.round(width * height * STAR_DENSITY);
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

/**
 * Deep space behind the wheel: a static starfield with a few twinkling stars, and
 * the Solar System orbiting the wheel itself. The wheel's position is measured
 * every second (and on resize), so the orbits stay centred on it whatever the layout.
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
    let starfield: HTMLCanvasElement | null = null;
    let twinkles: Twinkle[] = [];
    let target = measureWheel(canvas);
    let sun: SunFrame = { ...target };
    let frameId: number | null = null;
    let lastFrame = 0;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      starfield = paintStarfield(innerWidth, innerHeight);
      twinkles = createTwinkles(innerWidth, innerHeight);
      target = measureWheel(canvas);
      sun = { ...target };
    };

    const measure = () => {
      target = measureWheel(canvas);
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 250) / 1000 : FRAME_INTERVAL / 1000;
      lastFrame = timestamp;

      const seconds = timestamp / 1000;
      const { width, height } = canvas;

      // ease towards the freshly measured wheel position
      sun = {
        x: sun.x + (target.x - sun.x) * 0.2,
        y: sun.y + (target.y - sun.y) * 0.2,
        radius: sun.radius + (target.radius - sun.radius) * 0.2,
      };
      const R = sun.radius;
      const s = clamp(R / 400, 0.55, 1.35);

      if (starfield) {
        ctx.drawImage(starfield, 0, 0);
      } else {
        ctx.fillStyle = SPACE;
        ctx.fillRect(0, 0, width, height);
      }

      drawTwinkles(ctx, twinkles, seconds);

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

        drawPlanet(ctx, planet, x, y, radius, angle, moonAngleRef.current);
      });
    };

    resize();
    window.addEventListener('resize', resize);
    const measureTimer = window.setInterval(measure, MEASURE_INTERVAL);
    frameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.clearInterval(measureTimer);
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
