import { useEffect, useRef } from 'react';

import { RIM_INNER } from './taiwanTokens';

import type { CSSProperties } from 'react';
import type { EffectsProps, WheelPartLayout } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 40; // 25 fps
const MAX_GLINTS = 8;
const MAX_SPARKS = 140;
const IDLE_GLINTS_PER_SECOND = 1.2;
const SPIN_SPARKS_PER_SECOND = 60;
/** Length of a spark's trail, in seconds of its flight */
const SPARK_TRAIL = 0.09;
/** Glints flash on the middle of the gold rim */
const GLINT_RADIUS = (RIM_INNER + 1) / 2;

interface Glint {
  x: number;
  y: number;
  size: number;
  rotation: number;
  age: number;
  life: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

interface EffectState {
  glints: Glint[];
  sparks: Spark[];
  /** Fractional spawn budgets so low rates still emit evenly */
  glintBudget: number;
  sparkBudget: number;
  /** 0..1, eases towards 1 while spinning: sparks grow, glints fade out */
  energy: number;
}

const createState = (): EffectState => ({ glints: [], sparks: [], glintBudget: 0, sparkBudget: 0, energy: 0 });

const createGlint = ({ center, wheelRadius, scale }: WheelPartLayout): Glint => {
  const angle = Math.random() * 2 * Math.PI;
  const radius = wheelRadius * GLINT_RADIUS;

  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
    size: (5 + Math.random() * 4) * scale,
    rotation: Math.random() * Math.PI,
    age: 0,
    life: 0.6 + Math.random() * 0.4,
  };
};

/** Sparks leave the rim along the direction of the spin (clockwise) and a little outwards */
const createSpark = ({ center, wheelRadius, scale }: WheelPartLayout): Spark => {
  const angle = Math.random() * 2 * Math.PI;
  const speed = (110 + Math.random() * 150) * scale;
  const outward = 0.35 + Math.random() * 0.4;

  return {
    x: center + Math.cos(angle) * wheelRadius,
    y: center + Math.sin(angle) * wheelRadius,
    vx: (-Math.sin(angle) + Math.cos(angle) * outward) * speed,
    vy: (Math.cos(angle) + Math.sin(angle) * outward) * speed,
    age: 0,
    life: 0.5 + Math.random() * 0.5,
  };
};

const canvasStyle = (layout: WheelPartLayout): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  left: `${-layout.overflowPadding}px`,
  top: `${-layout.overflowPadding}px`,
  zIndex: 2,
  pointerEvents: 'none',
});

/**
 * While idle a small glint flashes on the gold rim now and then; during a spin gold sparks fly
 * off the rim in the direction of the spin.
 */
const TaiwanEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpinningRef = useRef(isSpinning);
  const stateRef = useRef<EffectState>(createState());

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.width = layout.canvasSize;
    canvas.height = layout.canvasSize;
    canvas.style.width = `${layout.canvasSize}px`;
    canvas.style.height = `${layout.canvasSize}px`;
    // particle positions are canvas coordinates, so a new layout starts from scratch
    stateRef.current = createState();

    let frameId: number | null = null;
    let lastFrame = 0;

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);

      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 250) / 1000 : FRAME_INTERVAL / 1000;
      lastFrame = timestamp;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      const state = stateRef.current;
      const { canvasSize, scale } = layout;

      state.energy += ((isSpinningRef.current ? 1 : 0) - state.energy) * Math.min(1, delta * 3);

      state.glintBudget += IDLE_GLINTS_PER_SECOND * (1 - state.energy) * delta;
      while (state.glintBudget >= 1) {
        state.glintBudget -= 1;
        if (state.glints.length < MAX_GLINTS) {
          state.glints.push(createGlint(layout));
        }
      }

      state.sparkBudget += SPIN_SPARKS_PER_SECOND * state.energy * delta;
      while (state.sparkBudget >= 1) {
        state.sparkBudget -= 1;
        if (state.sparks.length < MAX_SPARKS) {
          state.sparks.push(createSpark(layout));
        }
      }

      state.glints = state.glints.filter((glint) => {
        glint.age += delta;

        return glint.age < glint.life;
      });

      state.sparks = state.sparks.filter((spark) => {
        spark.age += delta;
        spark.x += spark.vx * delta;
        spark.y += spark.vy * delta;

        return spark.age < spark.life;
      });

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      state.glints.forEach((glint) => {
        const alpha = Math.sin((glint.age / glint.life) * Math.PI);
        const reach = glint.size * (0.6 + alpha * 0.4);

        ctx.save();
        ctx.translate(glint.x, glint.y);
        ctx.rotate(glint.rotation);
        ctx.strokeStyle = `rgba(255, 246, 214, ${alpha * 0.95})`;
        ctx.lineWidth = Math.max(0.8, 1.2 * scale);
        ctx.beginPath();
        ctx.moveTo(-reach, 0);
        ctx.lineTo(reach, 0);
        ctx.moveTo(0, -reach);
        ctx.lineTo(0, reach);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 252, 235, ${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, glint.size * 0.22, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255, 190, 70, 0.9)';
      ctx.shadowBlur = 8 * scale;
      state.sparks.forEach((spark) => {
        const alpha = 1 - spark.age / spark.life;
        const tailX = spark.x - spark.vx * SPARK_TRAIL;
        const tailY = spark.y - spark.vy * SPARK_TRAIL;
        const trail = ctx.createLinearGradient(tailX, tailY, spark.x, spark.y);
        trail.addColorStop(0, 'rgba(255, 150, 40, 0)');
        trail.addColorStop(1, `rgba(255, 214, 120, ${alpha})`);
        ctx.strokeStyle = trail;
        ctx.lineWidth = Math.max(1.5, 3 * scale);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(spark.x, spark.y);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 250, 225, ${alpha})`;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, Math.max(1, 2 * scale), 0, 2 * Math.PI);
        ctx.fill();
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

  return <canvas ref={canvasRef} aria-hidden='true' style={canvasStyle(layout)} />;
};

export default TaiwanEffects;
