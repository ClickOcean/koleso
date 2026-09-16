import { useEffect, useRef } from 'react';

import { BUBBLE_BAND_INNER, BUBBLE_BAND_OUTER, FOAM_RING_OFFSET } from './beerPartyTokens';
import { foamImage } from './foamImage';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 45; // ~22 fps
const IDLE_BUBBLES = 22;
const SPIN_BUBBLES = 64;
const FLY_COUNT = 3;
const IDLE_POP_MS = 850;
const SPIN_POP_MS = 110;
const POP_LIFE_MS = 420;
const SPARK_LIFE_MS = 650;
const SPARKS_PER_FRAME = 3;
const TOP = -Math.PI / 2;
const TWO_PI = 2 * Math.PI;

interface Bubble {
  angle: number;
  /** 0 at the outer edge of the band, 1 at its inner edge */
  depth: number;
  size: number;
  /** radians per second */
  speed: number;
  wobble: number;
  alpha: number;
}

interface Pop {
  x: number;
  y: number;
  age: number;
  size: number;
}

interface Fly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  retargetIn: number;
  wing: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

interface EffectsState {
  bubbles: Bubble[];
  pops: Pop[];
  flies: Fly[];
  sparks: Spark[];
  popAccumulator: number;
  clock: number;
  wasSpinning: boolean;
}

/** Wraps an angle into (-PI, PI] */
const normalizeAngle = (angle: number): number => {
  let wrapped = angle % TWO_PI;
  if (wrapped > Math.PI) {
    wrapped -= TWO_PI;
  }
  if (wrapped <= -Math.PI) {
    wrapped += TWO_PI;
  }

  return wrapped;
};

const createBubble = (nearBottom: boolean): Bubble => ({
  angle: nearBottom ? Math.PI / 2 + (Math.random() - 0.5) * 2.4 : Math.random() * TWO_PI,
  depth: Math.random(),
  size: 1.4 + Math.random() * 2.4,
  speed: 0.22 + Math.random() * 0.3,
  wobble: Math.random() * TWO_PI,
  alpha: 0.35 + Math.random() * 0.4,
});

const createFly = (center: number, wheelRadius: number): Fly => {
  const angle = Math.random() * TWO_PI;
  const x = center + Math.cos(angle) * wheelRadius * 1.12;
  const y = center + Math.sin(angle) * wheelRadius * 1.12;

  return { x, y, vx: 0, vy: 0, targetX: x, targetY: y, retargetIn: 0, wing: 0 };
};

const resizeCanvas = (canvas: HTMLCanvasElement | null, size: number): void => {
  if (!canvas) {
    return;
  }

  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
};

/**
 * Bubbles crawling up the glass wall inside the rim and popping under the pointer,
 * foam bubbles bursting on the ring, and a few lazy flies buzzing around the wheel.
 * A spin shakes the glass: a burst of bubbles, flies scatter, bottle-cap sparks.
 */
const BeerPartyEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpinningRef = useRef(isSpinning);
  const stateRef = useRef<EffectsState>({
    bubbles: Array.from({ length: IDLE_BUBBLES }, () => createBubble(false)),
    pops: [],
    flies: [],
    sparks: [],
    popAccumulator: 0,
    clock: 0,
    wasSpinning: isSpinning,
  });

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    resizeCanvas(canvasRef.current, layout.canvasSize);
  }, [layout.canvasSize]);

  useEffect(() => {
    let frameId: number | null = null;
    let lastFrame = 0;

    const { canvasSize, center, wheelRadius, scale } = layout;
    const state = stateRef.current;
    // flies live in canvas pixels, so they are re-seated whenever the wheel is resized
    state.flies = Array.from({ length: FLY_COUNT }, () => createFly(center, wheelRadius));

    const bandOuter = wheelRadius - BUBBLE_BAND_OUTER * scale;
    const bandInner = wheelRadius - BUBBLE_BAND_INNER * scale;
    const foamRadius = wheelRadius + FOAM_RING_OFFSET * scale;
    const flyMin = wheelRadius + 30 * scale;
    const flyMax = Math.min(wheelRadius + 108 * scale, canvasSize / 2 - 8 * scale);

    const pickTarget = (fly: Fly, spinning: boolean) => {
      const angle = Math.random() * TWO_PI;
      const scatter = 45 * scale;
      const reach = spinning
        ? flyMin + scatter + Math.random() * (flyMax - flyMin - scatter)
        : flyMin + Math.random() * (flyMax - flyMin) * 0.75;

      fly.targetX = center + Math.cos(angle) * reach;
      fly.targetY = center + Math.sin(angle) * reach;
      fly.retargetIn = spinning ? 120 + Math.random() * 220 : 350 + Math.random() * 800;
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);

      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 250) : FRAME_INTERVAL;
      lastFrame = timestamp;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) {
        return;
      }

      const spinning = isSpinningRef.current;
      const dt = delta / 1000;
      state.clock += dt;

      if (spinning && !state.wasSpinning) {
        while (state.bubbles.length < SPIN_BUBBLES) {
          state.bubbles.push(createBubble(true));
        }
        state.flies.forEach((fly) => pickTarget(fly, true));
      }
      state.wasSpinning = spinning;

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // generated foam photo over the rim, clipped to the foam band; the drawn foam underneath is the fallback
      const foam = foamImage.get();
      if (foam) {
        const outer = wheelRadius + scale * 30;
        const inner = wheelRadius - scale * 6;
        const drawSize = (outer * 2) / 0.95;
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, outer, 0, TWO_PI);
        ctx.arc(center, center, inner, 0, TWO_PI, true);
        ctx.clip();
        ctx.drawImage(foam, center - drawSize / 2, center - drawSize / 2, drawSize, drawSize);
        ctx.restore();
      }

      // bubbles rising along the glass wall towards the pointer, popping when they get there
      const targetCount = spinning ? SPIN_BUBBLES : IDLE_BUBBLES;
      const speedFactor = spinning ? 2.6 : 1;
      state.bubbles = state.bubbles.filter((bubble) => {
        const before = normalizeAngle(bubble.angle - TOP);
        const direction = before > 0 ? -1 : 1;
        const rate = bubble.speed * speedFactor * (0.3 + 0.7 * Math.abs(Math.cos(bubble.angle)));
        bubble.angle += direction * rate * dt;
        const after = normalizeAngle(bubble.angle - TOP);

        if (Math.abs(after) < 0.05 || Math.sign(after) !== Math.sign(before)) {
          const distance = bandOuter - bubble.depth * (bandOuter - bandInner);
          state.pops.push({
            x: center + Math.cos(bubble.angle) * distance,
            y: center + Math.sin(bubble.angle) * distance,
            age: 0,
            size: bubble.size * scale * 1.6,
          });
          if (state.bubbles.length > targetCount) {
            return false;
          }
          Object.assign(bubble, createBubble(true));

          return true;
        }

        const distance =
          bandOuter - bubble.depth * (bandOuter - bandInner) + Math.sin(state.clock * 3 + bubble.wobble) * 1.5 * scale;
        const x = center + Math.cos(bubble.angle) * distance;
        const y = center + Math.sin(bubble.angle) * distance;
        const size = bubble.size * scale;

        ctx.fillStyle = `rgba(255, 252, 240, ${bubble.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TWO_PI);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.3, 0, TWO_PI);
        ctx.fill();

        return true;
      });
      while (state.bubbles.length < IDLE_BUBBLES) {
        state.bubbles.push(createBubble(false));
      }

      // foam bubbles bursting on the ring
      state.popAccumulator += delta;
      const popEvery = spinning ? SPIN_POP_MS : IDLE_POP_MS;
      while (state.popAccumulator >= popEvery) {
        state.popAccumulator -= popEvery;
        const angle = Math.random() * TWO_PI;
        const distance = foamRadius + (Math.random() - 0.5) * 10 * scale;
        state.pops.push({
          x: center + Math.cos(angle) * distance,
          y: center + Math.sin(angle) * distance,
          age: 0,
          size: (3 + Math.random() * 4) * scale,
        });
      }

      state.pops = state.pops.filter((pop) => {
        pop.age += delta;
        const t = pop.age / POP_LIFE_MS;
        if (t >= 1) {
          return false;
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${((1 - t) * 0.85).toFixed(2)})`;
        ctx.lineWidth = Math.max(1, (1.4 - t) * scale);
        ctx.beginPath();
        ctx.arc(pop.x, pop.y, pop.size * (0.6 + 1.3 * t), 0, TWO_PI);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 250, 235, ${((1 - t) * 0.9).toFixed(2)})`;
        for (let index = 0; index < 3; index++) {
          const angle = index * (TWO_PI / 3) + pop.size;
          const reach = pop.size * (0.8 + 2.2 * t);
          ctx.beginPath();
          ctx.arc(
            pop.x + Math.cos(angle) * reach,
            pop.y + Math.sin(angle) * reach,
            Math.max(0.6, (1.4 - t) * scale),
            0,
            TWO_PI,
          );
          ctx.fill();
        }

        return true;
      });

      // bottle-cap sparks flung off the rim while spinning
      if (spinning) {
        for (let index = 0; index < SPARKS_PER_FRAME; index++) {
          if (Math.random() > 0.7) {
            continue;
          }
          const angle = Math.random() * TWO_PI;
          const distance = wheelRadius + 12 * scale;
          const outward = (120 + Math.random() * 160) * scale;
          const tangent = (Math.random() - 0.5) * 220 * scale;
          state.sparks.push({
            x: center + Math.cos(angle) * distance,
            y: center + Math.sin(angle) * distance,
            vx: Math.cos(angle) * outward - Math.sin(angle) * tangent,
            vy: Math.sin(angle) * outward + Math.cos(angle) * tangent,
            age: 0,
          });
        }
      }

      ctx.lineCap = 'round';
      state.sparks = state.sparks.filter((spark) => {
        spark.age += delta;
        const t = spark.age / SPARK_LIFE_MS;
        if (t >= 1) {
          return false;
        }

        spark.vy += 380 * scale * dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;

        ctx.strokeStyle = `rgba(255, 214, 96, ${((1 - t) * 0.9).toFixed(2)})`;
        ctx.lineWidth = Math.max(1, 1.6 * scale);
        ctx.beginPath();
        ctx.moveTo(spark.x - spark.vx * 0.035, spark.y - spark.vy * 0.035);
        ctx.lineTo(spark.x, spark.y);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 245, 200, ${(1 - t).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, Math.max(0.8, 1.4 * scale), 0, TWO_PI);
        ctx.fill();

        return true;
      });

      // flies: erratic hops between random spots around the wheel, further out and faster while spinning
      const maxSpeed = (spinning ? 420 : 150) * scale;
      const jitter = (spinning ? 2600 : 1400) * scale;
      state.flies.forEach((fly) => {
        fly.retargetIn -= delta;
        if (fly.retargetIn <= 0) {
          pickTarget(fly, spinning);
        }

        fly.vx += ((fly.targetX - fly.x) * 5 + (Math.random() - 0.5) * jitter) * dt;
        fly.vy += ((fly.targetY - fly.y) * 5 + (Math.random() - 0.5) * jitter) * dt;
        const speed = Math.hypot(fly.vx, fly.vy);
        if (speed > maxSpeed) {
          fly.vx *= maxSpeed / speed;
          fly.vy *= maxSpeed / speed;
        }
        fly.x += fly.vx * dt;
        fly.y += fly.vy * dt;
        fly.wing = fly.wing === 0 ? 1 : 0;

        const flap = fly.wing === 0 ? 0.55 : 1;
        ctx.save();
        ctx.translate(fly.x, fly.y);
        ctx.rotate(Math.atan2(fly.vy, fly.vx));

        ctx.fillStyle = 'rgba(220, 226, 240, 0.5)';
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.ellipse(-0.6 * scale, side * 2.2 * scale, 3.2 * scale, 1.5 * scale, side * flap, 0, TWO_PI);
          ctx.fill();
        });

        ctx.fillStyle = '#1a1208';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.8 * scale, 1.7 * scale, 0, 0, TWO_PI);
        ctx.fill();
        ctx.fillStyle = '#2c1c0a';
        ctx.beginPath();
        ctx.arc(2.6 * scale, 0, 1.2 * scale, 0, TWO_PI);
        ctx.fill();

        ctx.restore();
      });
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

export default BeerPartyEffects;
