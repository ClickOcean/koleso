import { useEffect, useRef } from 'react';

import { ARCADE_OUTLINE } from './palette';
import { getPixelTextMetrics, renderPixelText } from './pixelText';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const IDLE_INTERVAL = 83; // 12 fps while idle
const SPIN_INTERVAL = 41; // 24 fps while spinning
/** Distance between marquee bulbs, tuned for an 800px wheel */
const MARQUEE_SPACING = 28;
const MARQUEE_STEP_IDLE = 260; // ms per chase step while idle
const SPARKLE_INTERVAL = 650;
const SPARKLE_FRAMES = 4;
const MAX_PARTICLES = 320;
const SPIN_SPAWN_PER_FRAME = 7;
const WIN_BURST_COUNT = 90;
const FLASH_DURATION = 700;
const LABEL_BLINK = 620;
const LABEL_TEXT = 'INSERT COIN';
const BURST_COLORS = ['#fde047', '#ffffff', '#22d3ee', '#ff3fb3', '#a8e02a'];
const BULB_OFF = '#4a3a05';
const BULB_DIM = '#a37f0a';
const BULB_ON = '#fde047';
const BULB_WHITE = '#ffffff';

interface Particle {
  x: number;
  y: number;
  /** px per second */
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: boolean;
}

interface Sparkle {
  angle: number;
  frame: number;
}

const random = (min: number, max: number): number => min + Math.random() * (max - min);
const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const resizeCanvas = (canvas: HTMLCanvasElement | null, size: number): void => {
  if (!canvas) {
    return;
  }

  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
};

const createScanlinePattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  const tile = document.createElement('canvas');
  tile.width = 1;
  tile.height = 3;
  const tileCtx = tile.getContext('2d');
  if (!tileCtx) {
    return null;
  }
  tileCtx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  tileCtx.fillRect(0, 0, 1, 1);

  return ctx.createPattern(tile, 'repeat');
};

/** Plus-shaped twinkle that grows and shrinks over four frames */
const drawSparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, cell: number): void => {
  const arms = frame === 1 || frame === 2 ? frame : 0;
  const px = Math.round(x - cell / 2);
  const py = Math.round(y - cell / 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px, py, cell, cell);
  for (let arm = 1; arm <= arms; arm++) {
    ctx.fillRect(px + arm * cell, py, cell, cell);
    ctx.fillRect(px - arm * cell, py, cell, cell);
    ctx.fillRect(px, py + arm * cell, cell, cell);
    ctx.fillRect(px, py - arm * cell, cell, cell);
  }
};

/**
 * Cabinet dressing over the wheel: chasing marquee bulbs around the rim, CRT
 * scanlines, an occasional pixel twinkle and a blinking "INSERT COIN" in the
 * bottom-left corner of the wheel's square. While spinning the marquee chases
 * every frame and square sparks burst off the rim; when the spin ends a pixel
 * firework goes off at the pointer.
 */
const ArcadeEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpinningRef = useRef(isSpinning);
  const particlesRef = useRef<Particle[]>([]);
  const sparklesRef = useRef<Sparkle[]>([]);
  const phaseRef = useRef(0);

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    resizeCanvas(canvasRef.current, layout.canvasSize);
  }, [layout.canvasSize]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) {
      return;
    }

    const { canvasSize, center, wheelRadius, scale } = layout;
    const cell = Math.max(2, Math.round(scale * 4));
    const bulbSize = Math.max(3, Math.round(scale * 6));
    const bulbEdge = Math.max(1, Math.round(scale * 1.5));
    const marqueeRadius = wheelRadius + scale * 12;
    const bulbCount = Math.max(24, Math.round((2 * Math.PI * marqueeRadius) / (scale * MARQUEE_SPACING)));
    const { pixel: labelPixel, fontSize: labelFontSize } = getPixelTextMetrics(scale);
    const label = renderPixelText(LABEL_TEXT, { fontSize: labelFontSize, fill: '#fde047', outline: ARCADE_OUTLINE });
    const labelMargin = Math.max(2, Math.round(scale * 4));
    const scanlines = createScanlinePattern(ctx);

    let frameId: number | null = null;
    let lastFrame = 0;
    let chaseClock = 0;
    let sparkleClock = 0;
    let flashUntil = 0;
    let wasSpinning = isSpinningRef.current;

    const spawn = (particle: Particle) => {
      const particles = particlesRef.current;
      if (particles.length >= MAX_PARTICLES) {
        particles.shift();
      }
      particles.push(particle);
    };

    const spawnRimSpark = () => {
      const angle = Math.random() * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const radial = scale * random(140, 300);
      const tangential = scale * random(80, 160);
      const maxLife = random(350, 750);

      spawn({
        x: center + cos * (wheelRadius + scale * 3),
        y: center + sin * (wheelRadius + scale * 3),
        vx: cos * radial - sin * tangential,
        vy: sin * radial + cos * tangential,
        size: scale * random(3, 6),
        color: pick(BURST_COLORS),
        life: maxLife,
        maxLife,
        gravity: false,
      });
    };

    const spawnWinBurst = () => {
      const originX = center;
      const originY = center - wheelRadius + scale * 24;

      for (let index = 0; index < WIN_BURST_COUNT; index++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = scale * random(80, 360);
        const maxLife = random(500, 1000);

        spawn({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: scale * random(3, 7),
          color: pick(BURST_COLORS),
          life: maxLife,
          maxLife,
          gravity: true,
        });
      }
    };

    const drawMarquee = (spinning: boolean, flashing: boolean) => {
      const phase = phaseRef.current;

      for (let index = 0; index < bulbCount; index++) {
        const angle = (index * 2 * Math.PI) / bulbCount;
        const x = Math.round(center + Math.cos(angle) * marqueeRadius);
        const y = Math.round(center + Math.sin(angle) * marqueeRadius);
        const slot = (index + phase) % 4;
        let color = BULB_OFF;

        if (flashing) {
          color = BULB_WHITE;
        } else if (spinning) {
          color = slot % 2 === 0 ? BULB_ON : BULB_WHITE;
        } else if (slot === 0) {
          color = BULB_ON;
        } else if (slot === 2) {
          color = BULB_DIM;
        }

        ctx.fillStyle = ARCADE_OUTLINE;
        ctx.fillRect(
          x - bulbSize / 2 - bulbEdge,
          y - bulbSize / 2 - bulbEdge,
          bulbSize + bulbEdge * 2,
          bulbSize + bulbEdge * 2,
        );
        ctx.fillStyle = color;
        ctx.fillRect(x - bulbSize / 2, y - bulbSize / 2, bulbSize, bulbSize);
      }
    };

    const drawParticles = (delta: number) => {
      const seconds = delta / 1000;
      const particles = particlesRef.current;

      for (let index = particles.length - 1; index >= 0; index--) {
        const particle = particles[index];
        particle.life -= delta;
        if (particle.gravity) {
          particle.vy += scale * 320 * seconds;
        }
        particle.x += particle.vx * seconds;
        particle.y += particle.vy * seconds;

        if (
          particle.life <= 0 ||
          particle.x < -particle.size ||
          particle.y < -particle.size ||
          particle.x > canvasSize + particle.size ||
          particle.y > canvasSize + particle.size
        ) {
          particles.splice(index, 1);
          continue;
        }

        const size = Math.max(1, Math.round(particle.size * (0.4 + (0.6 * particle.life) / particle.maxLife)));
        ctx.fillStyle = particle.color;
        ctx.fillRect(Math.round(particle.x - size / 2), Math.round(particle.y - size / 2), size, size);
      }
    };

    const drawLabel = (timestamp: number) => {
      if (!label || Math.floor(timestamp / LABEL_BLINK) % 2 !== 0) {
        return;
      }

      const width = label.width * labelPixel;
      const height = label.height * labelPixel;
      // bottom-left corner of the wheel's square, like a HUD credit counter. The page
      // clips everything below the wheel's edge, but the square's corners are always
      // on screen and lie outside the rim and the marquee.
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        label.canvas,
        Math.round(center - wheelRadius + labelMargin),
        Math.round(center + wheelRadius - labelMargin - height),
        width,
        height,
      );
      ctx.restore();
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);

      const spinning = isSpinningRef.current;
      if (timestamp - lastFrame < (spinning ? SPIN_INTERVAL : IDLE_INTERVAL)) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 120) : IDLE_INTERVAL;
      lastFrame = timestamp;

      if (wasSpinning && !spinning) {
        spawnWinBurst();
        flashUntil = timestamp + FLASH_DURATION;
      }
      wasSpinning = spinning;

      // marquee chase: one step per frame while spinning, on a slow clock otherwise
      if (spinning) {
        phaseRef.current += 1;
        chaseClock = 0;
      } else {
        chaseClock += delta;
        while (chaseClock >= MARQUEE_STEP_IDLE) {
          phaseRef.current += 1;
          chaseClock -= MARQUEE_STEP_IDLE;
        }
      }

      if (spinning) {
        for (let index = 0; index < SPIN_SPAWN_PER_FRAME; index++) {
          spawnRimSpark();
        }
      }

      sparkleClock += delta;
      if (!spinning && sparkleClock >= SPARKLE_INTERVAL) {
        sparkleClock = 0;
        sparklesRef.current.push({ angle: Math.random() * Math.PI * 2, frame: 0 });
      }

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // CRT scanlines fixed to the screen, so they do not rotate with the wheel
      if (scanlines) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, wheelRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = scanlines;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        ctx.restore();
      }

      drawMarquee(spinning, timestamp < flashUntil);

      const sparkles = sparklesRef.current;
      const sparkleRadius = wheelRadius - cell * 2.5;
      for (let index = sparkles.length - 1; index >= 0; index--) {
        const sparkle = sparkles[index];
        drawSparkle(
          ctx,
          center + Math.cos(sparkle.angle) * sparkleRadius,
          center + Math.sin(sparkle.angle) * sparkleRadius,
          sparkle.frame,
          cell,
        );
        sparkle.frame += 1;
        if (sparkle.frame >= SPARKLE_FRAMES) {
          sparkles.splice(index, 1);
        }
      }

      drawParticles(delta);

      if (!spinning) {
        drawLabel(timestamp);
      }
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [layout]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden='true'
      style={{
        position: 'absolute',
        inset: 0,
        left: `${-layout.overflowPadding}px`,
        top: `${-layout.overflowPadding}px`,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  );
};

export default ArcadeEffects;
