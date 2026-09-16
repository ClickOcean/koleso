import { useEffect, useRef } from 'react';

import { drawProminence } from './prominence';
import { OVERSCAN } from './solarTokens';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_IDLE = 66; // ~15 fps
const FRAME_SPIN = 42; // ~24 fps
/** How much more the corona rages while the wheel spins */
const SPIN_INTENSITY = 2.7;
/** Sizes below are px for an 800px wheel and are multiplied by layout.scale when drawn */
const MAX_REACH = OVERSCAN - 10;
const TONGUE_EVERY_MS = 820;
const MAX_TONGUES = 10;
const SPARK_EVERY_MS = 120;
const MAX_SPARKS = 60;
const FLARE_CHECK_MS = 600;
const FLARE_CHANCE = 0.4;
const FLARE_SPARKS = 14;
const TAU = 2 * Math.PI;

interface Tongue {
  angle: number;
  height: number;
  halfWidth: number;
  lean: number;
  age: number;
  duration: number;
}

interface Spark {
  angle: number;
  /** Distance outside the rim */
  offset: number;
  /** Outward speed, px per second */
  speed: number;
  /** Sideways drift, radians per second */
  drift: number;
  size: number;
  age: number;
  duration: number;
  /** White-hot instead of orange */
  hot: boolean;
}

interface Flare {
  angle: number;
  /** Half of the arc it lights up, radians */
  span: number;
  age: number;
  duration: number;
}

interface CoronaState {
  tongues: Tongue[];
  sparks: Spark[];
  flares: Flare[];
  tongueClock: number;
  sparkClock: number;
  flareClock: number;
  shimmer: number;
}

const createTongue = (spinning: boolean): Tongue => ({
  angle: Math.random() * TAU,
  height: Math.min(MAX_REACH - 6, (28 + Math.random() * 46) * (spinning ? 1.55 : 1)),
  halfWidth: 9 + Math.random() * 12,
  lean: (Math.random() - 0.5) * 44,
  age: 0,
  duration: (1300 + Math.random() * 1400) * (spinning ? 0.7 : 1),
});

const createSpark = (spinning: boolean, angle = Math.random() * TAU, boost = 1): Spark => ({
  angle,
  offset: 2 + Math.random() * 6,
  speed: (18 + Math.random() * 40) * (spinning ? 1.9 : 1) * boost,
  drift: (Math.random() - 0.5) * 0.25,
  size: 1.1 + Math.random() * 1.6,
  age: 0,
  duration: 1200 + Math.random() * 1400,
  hot: Math.random() < 0.4,
});

const createFlare = (): Flare => ({
  angle: Math.random() * TAU,
  span: 0.12 + Math.random() * 0.14,
  age: 0,
  duration: 650 + Math.random() * 300,
});

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
 * Living corona over the wheel: prominences arching out of the rim, plasma sparks
 * drifting outward and a breathing halo. While spinning everything is denser and
 * faster, and bright flares burst on the rim now and then.
 */
const SolarSystemEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpinningRef = useRef(isSpinning);
  const stateRef = useRef<CoronaState>({
    tongues: [],
    sparks: [],
    flares: [],
    tongueClock: 0,
    sparkClock: 0,
    flareClock: 0,
    shimmer: 0,
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

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);

      const spinning = isSpinningRef.current;
      if (timestamp - lastFrame < (spinning ? FRAME_SPIN : FRAME_IDLE)) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 250) : FRAME_IDLE;
      lastFrame = timestamp;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) {
        return;
      }

      const state = stateRef.current;
      const intensity = spinning ? SPIN_INTENSITY : 1;
      const { canvasSize, center, wheelRadius, scale } = layout;

      // spawn
      state.tongueClock += delta;
      if (state.tongueClock >= TONGUE_EVERY_MS / intensity) {
        state.tongueClock = 0;
        if (state.tongues.length < MAX_TONGUES * intensity) {
          state.tongues.push(createTongue(spinning));
        }
      }

      state.sparkClock += delta;
      if (state.sparkClock >= SPARK_EVERY_MS / intensity) {
        state.sparkClock = 0;
        if (state.sparks.length < MAX_SPARKS * intensity) {
          state.sparks.push(createSpark(spinning));
          if (spinning) {
            state.sparks.push(createSpark(spinning));
          }
        }
      }

      state.flareClock += delta;
      if (spinning && state.flareClock >= FLARE_CHECK_MS) {
        state.flareClock = 0;
        if (state.flares.length < 2 && Math.random() < FLARE_CHANCE) {
          const flare = createFlare();
          state.flares.push(flare);
          for (let index = 0; index < FLARE_SPARKS; index++) {
            state.sparks.push(createSpark(true, flare.angle + (Math.random() - 0.5) * flare.span * 2, 1.6));
          }
        }
      }

      // advance
      state.tongues.forEach((tongue) => {
        tongue.age += delta;
      });
      state.tongues = state.tongues.filter((tongue) => tongue.age < tongue.duration);

      state.sparks.forEach((spark) => {
        spark.age += delta;
        spark.offset += (spark.speed * delta) / 1000;
        spark.angle += (spark.drift * delta) / 1000;
      });
      state.sparks = state.sparks.filter((spark) => spark.age < spark.duration && spark.offset < MAX_REACH);

      state.flares.forEach((flare) => {
        flare.age += delta;
      });
      state.flares = state.flares.filter((flare) => flare.age < flare.duration);

      state.shimmer += (delta / (spinning ? 900 : 2600)) * TAU;

      // draw
      ctx.clearRect(0, 0, canvasSize, canvasSize);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // breathing halo just outside the rim
      const wave = (Math.sin(state.shimmer) + 1) / 2;
      const haloAlpha = (spinning ? 0.14 : 0.05) + wave * (spinning ? 0.08 : 0.04);
      const haloReach = wheelRadius + scale * 44;
      const halo = ctx.createRadialGradient(center, center, wheelRadius - scale * 2, center, center, haloReach);
      halo.addColorStop(0, `rgba(255, 210, 110, ${haloAlpha})`);
      halo.addColorStop(0.5, `rgba(255, 150, 50, ${haloAlpha * 0.4})`);
      halo.addColorStop(1, 'rgba(255, 120, 30, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(center, center, haloReach, 0, TAU);
      ctx.arc(center, center, wheelRadius - scale * 2, 0, TAU, true);
      ctx.fill();

      // shimmer: three soft bright bands sweeping around the disc, brighter towards the rim
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, wheelRadius - scale * 5, 0, TAU);
      ctx.clip();
      const sweep = state.shimmer * (spinning ? 1.6 : 0.55);
      for (let band = 0; band < 3; band++) {
        const angle = sweep + (band * TAU) / 3;
        for (let layer = 0; layer < 4; layer++) {
          const halfSpan = 0.55 - layer * 0.12;
          const glow = ctx.createRadialGradient(center, center, wheelRadius * 0.25, center, center, wheelRadius);
          glow.addColorStop(0, 'rgba(255, 245, 200, 0)');
          glow.addColorStop(1, `rgba(255, 245, 200, ${spinning ? 0.05 : 0.035})`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, wheelRadius, angle - halfSpan, angle + halfSpan);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();

      // prominences grow quickly, then fade
      state.tongues.forEach((tongue) => {
        const t = tongue.age / tongue.duration;
        const grow = 1 - Math.pow(1 - Math.min(1, t / 0.55), 2);
        const fade = t < 0.25 ? t / 0.25 : (1 - t) / 0.75;

        drawProminence(
          ctx,
          center,
          center,
          {
            angle: tongue.angle,
            base: wheelRadius - scale * 6,
            height: tongue.height * scale * grow,
            halfWidth: tongue.halfWidth * scale,
            lean: tongue.lean * scale * grow,
          },
          { alpha: fade * (spinning ? 0.7 : 0.5), hot: fade * 0.45 },
        );
      });

      // sparks with a short trail behind them
      ctx.lineCap = 'round';
      state.sparks.forEach((spark) => {
        const t = spark.age / spark.duration;
        const alpha = Math.sin(Math.PI * t) * 0.95;
        const r = wheelRadius + spark.offset * scale;
        const tail = wheelRadius + Math.max(0, spark.offset - spark.speed * 0.08) * scale;
        const x = center + Math.cos(spark.angle) * r;
        const y = center + Math.sin(spark.angle) * r;
        const size = spark.size * scale;

        ctx.strokeStyle = spark.hot ? `rgba(255, 230, 170, ${alpha * 0.45})` : `rgba(255, 150, 50, ${alpha * 0.45})`;
        ctx.lineWidth = size * 0.9;
        ctx.beginPath();
        ctx.moveTo(center + Math.cos(spark.angle) * tail, center + Math.sin(spark.angle) * tail);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.fillStyle = spark.hot ? `rgba(255, 244, 210, ${alpha})` : `rgba(255, 176, 70, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
      });

      // flare bursts: a white-hot blob on the rim and a widening bright arc
      state.flares.forEach((flare) => {
        const t = flare.age / flare.duration;
        const env = Math.sin(Math.PI * t);
        const r = wheelRadius + scale * 3;
        const x = center + Math.cos(flare.angle) * r;
        const y = center + Math.sin(flare.angle) * r;
        const blobRadius = scale * 70 * (0.5 + 0.7 * t);

        const blob = ctx.createRadialGradient(x, y, 0, x, y, blobRadius);
        blob.addColorStop(0, `rgba(255, 250, 225, ${0.9 * env})`);
        blob.addColorStop(0.3, `rgba(255, 210, 110, ${0.5 * env})`);
        blob.addColorStop(1, 'rgba(255, 150, 40, 0)');
        ctx.fillStyle = blob;
        ctx.beginPath();
        ctx.arc(x, y, blobRadius, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 240, 190, ${0.85 * env})`;
        ctx.lineWidth = scale * 5;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = scale * 18;
        ctx.shadowColor = 'rgba(255, 200, 90, 0.9)';
        ctx.beginPath();
        ctx.arc(center, center, r, flare.angle - flare.span * (0.4 + t), flare.angle + flare.span * (0.4 + t));
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      ctx.restore();
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

export default SolarSystemEffects;
