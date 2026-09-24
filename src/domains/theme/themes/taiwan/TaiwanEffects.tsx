import { useEffect, useRef } from 'react';

import { CAT_RING_INNER, TW_SERIF } from './taiwanTokens';

import type { CSSProperties } from 'react';
import type { EffectsProps, WheelPartLayout } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 40; // 25 fps
const MAX_SNORES = 10;
const MAX_SPARKS = 140;
const IDLE_SNORES_PER_SECOND = 0.8;
const SPIN_SPARKS_PER_SECOND = 60;
/** Length of a spark's trail, in seconds of its flight */
const SPARK_TRAIL = 0.09;
/** Radius the snores rise from: the middle of the cat ring */
const SNORE_RADIUS = (CAT_RING_INNER + 1) / 2;

interface Snore {
  x: number;
  y: number;
  drift: number;
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
  snores: Snore[];
  sparks: Spark[];
  /** Fractional spawn budgets so low rates still emit evenly */
  snoreBudget: number;
  sparkBudget: number;
  /** 0..1, eases towards 1 while spinning: sparks grow, snores stop */
  energy: number;
}

const createState = (): EffectState => ({ snores: [], sparks: [], snoreBudget: 0, sparkBudget: 0, energy: 0 });

/** Snores come from the upper half of the ring so they rise into free space, not across the sectors */
const createSnore = ({ center, wheelRadius }: WheelPartLayout): Snore => {
  const angle = -Math.PI / 2 + (Math.random() * 2 - 1) * Math.PI * 0.42;
  const radius = wheelRadius * SNORE_RADIUS;

  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
    drift: Math.cos(angle) * 10,
    age: 0,
    life: 2.2 + Math.random() * 0.8,
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
 * While idle a sleepy "z" floats up from the ring of cats now and then; during a spin the
 * cats wake up, the snores stop and gold sparks fly off the rim.
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

      state.snoreBudget += IDLE_SNORES_PER_SECOND * (1 - state.energy) * delta;
      while (state.snoreBudget >= 1) {
        state.snoreBudget -= 1;
        if (state.snores.length < MAX_SNORES) {
          state.snores.push(createSnore(layout));
        }
      }

      state.sparkBudget += SPIN_SPARKS_PER_SECOND * state.energy * delta;
      while (state.sparkBudget >= 1) {
        state.sparkBudget -= 1;
        if (state.sparks.length < MAX_SPARKS) {
          state.sparks.push(createSpark(layout));
        }
      }

      state.snores = state.snores.filter((snore) => {
        snore.age += delta;
        snore.x += snore.drift * scale * delta;
        snore.y -= 16 * scale * delta;

        return snore.age < snore.life;
      });

      state.sparks = state.sparks.filter((spark) => {
        spark.age += delta;
        spark.x += spark.vx * delta;
        spark.y += spark.vy * delta;

        return spark.age < spark.life;
      });

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      state.snores.forEach((snore) => {
        const progress = snore.age / snore.life;
        const alpha = Math.sin(progress * Math.PI) * 0.9;
        ctx.font = `italic bold ${(11 + progress * 9) * scale}px ${TW_SERIF}`;
        ctx.lineWidth = 3 * scale;
        ctx.strokeStyle = `rgba(40, 10, 6, ${alpha * 0.8})`;
        ctx.strokeText('z', snore.x, snore.y);
        ctx.fillStyle = `rgba(255, 244, 222, ${alpha})`;
        ctx.fillText('z', snore.x, snore.y);
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
