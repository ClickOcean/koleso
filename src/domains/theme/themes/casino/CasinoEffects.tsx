import { useEffect, useRef } from 'react';

import {
  BULB_COUNT,
  BULB_RADIUS,
  BULB_RING_OFFSET,
  RIM_INNER,
  RIM_OUTER,
  SOCKET_RADIUS,
  bulbAngle,
} from './casinoTokens';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 50; // 20 fps
const CHASE_PERIOD = 3;
const IDLE_STEP_MS = 400;
const SPIN_STEP_MS = 70;
const BOOST_MS = 600;
const FLASH_MS = 1300;

interface MarqueeState {
  step: number;
  accumulator: number;
  haloPhase: number;
  /** Full-ring flash when a spin starts, decays to 0 */
  boost: number;
  /** Winner celebration: a few pulses after the wheel stops */
  flash: number;
  wasSpinning: boolean;
}

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
 * Marquee bulbs chasing around the rim, faster while spinning, with a warm
 * halo around the wheel. The sockets are drawn here rather than on the wheel
 * canvas so they stay fixed while the wheel rotates underneath.
 */
const CasinoEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpinningRef = useRef(isSpinning);
  const stateRef = useRef<MarqueeState>({
    step: 0,
    accumulator: 0,
    haloPhase: 0,
    boost: 0,
    flash: 0,
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

      const state = stateRef.current;
      const spinning = isSpinningRef.current;

      if (spinning && !state.wasSpinning) {
        state.boost = 1;
      }
      if (!spinning && state.wasSpinning) {
        state.flash = 1;
      }
      state.wasSpinning = spinning;
      state.boost = Math.max(0, state.boost - delta / BOOST_MS);
      state.flash = Math.max(0, state.flash - delta / FLASH_MS);

      const stepMs = spinning ? SPIN_STEP_MS : IDLE_STEP_MS;
      state.accumulator += delta;
      while (state.accumulator >= stepMs) {
        state.accumulator -= stepMs;
        state.step = (state.step + 1) % CHASE_PERIOD;
      }
      state.haloPhase += (delta / (spinning ? 420 : 1700)) * 2 * Math.PI;

      const pulse = state.flash > 0 ? Math.max(0, Math.sin((1 - state.flash) * Math.PI * 3)) : 0;
      const everyBulb = Math.max(state.boost, pulse * 0.9);
      const haloWave = (Math.sin(state.haloPhase) + 1) / 2;
      const haloAlpha = (spinning ? 0.16 + haloWave * 0.1 : 0.07 + haloWave * 0.04) + everyBulb * 0.14;

      const { canvasSize, center, wheelRadius, scale } = layout;
      const rimInner = wheelRadius - RIM_INNER * scale;
      const rimOuter = wheelRadius + RIM_OUTER * scale;
      const bulbRing = wheelRadius + BULB_RING_OFFSET * scale;
      const socketRadius = SOCKET_RADIUS * scale;
      const bulbRadius = BULB_RADIUS * scale;

      ctx.clearRect(0, 0, canvasSize, canvasSize);
      ctx.save();

      // warm halo spilling outwards from the rim
      const haloReach = rimOuter + 52 * scale;
      const outerHalo = ctx.createRadialGradient(center, center, rimOuter - 2 * scale, center, center, haloReach);
      outerHalo.addColorStop(0, `rgba(255, 178, 70, ${haloAlpha})`);
      outerHalo.addColorStop(0.35, `rgba(255, 150, 50, ${haloAlpha * 0.45})`);
      outerHalo.addColorStop(1, 'rgba(255, 130, 40, 0)');
      ctx.fillStyle = outerHalo;
      ctx.beginPath();
      ctx.arc(center, center, haloReach, 0, 2 * Math.PI);
      ctx.arc(center, center, rimOuter - 2 * scale, 0, 2 * Math.PI, true);
      ctx.fill();

      // and a little onto the felt
      const innerReach = rimInner - 40 * scale;
      const innerHalo = ctx.createRadialGradient(center, center, innerReach, center, center, rimInner);
      innerHalo.addColorStop(0, 'rgba(255, 190, 90, 0)');
      innerHalo.addColorStop(1, `rgba(255, 190, 90, ${haloAlpha * 0.6})`);
      ctx.fillStyle = innerHalo;
      ctx.beginPath();
      ctx.arc(center, center, rimInner, 0, 2 * Math.PI);
      ctx.arc(center, center, innerReach, 0, 2 * Math.PI, true);
      ctx.fill();

      // sockets with unlit bulbs
      for (let i = 0; i < BULB_COUNT; i++) {
        const angle = bulbAngle(i);
        const x = center + Math.cos(angle) * bulbRing;
        const y = center + Math.sin(angle) * bulbRing;

        ctx.fillStyle = '#0f0902';
        ctx.beginPath();
        ctx.arc(x, y, socketRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#6b4b10';
        ctx.lineWidth = 1.1 * scale;
        ctx.stroke();

        const glass = ctx.createRadialGradient(x - bulbRadius * 0.3, y - bulbRadius * 0.3, 0, x, y, bulbRadius);
        glass.addColorStop(0, '#8c6a34');
        glass.addColorStop(1, '#3a280c');
        ctx.fillStyle = glass;
        ctx.beginPath();
        ctx.arc(x, y, bulbRadius, 0, 2 * Math.PI);
        ctx.fill();
      }

      // lit bulbs: the chase head is bright, the one it just left still glows
      for (let i = 0; i < BULB_COUNT; i++) {
        const phase = (((i - state.step) % CHASE_PERIOD) + CHASE_PERIOD) % CHASE_PERIOD;
        let brightness = phase === 0 ? 1 : phase === 1 ? (spinning ? 0.45 : 0.15) : 0;
        brightness = Math.max(brightness, everyBulb);
        if (brightness < 0.03) {
          continue;
        }

        const angle = bulbAngle(i);
        const x = center + Math.cos(angle) * bulbRing;
        const y = center + Math.sin(angle) * bulbRing;

        const glowRadius = (13 + 7 * brightness) * scale;
        const glow = ctx.createRadialGradient(x, y, bulbRadius * 0.5, x, y, glowRadius);
        glow.addColorStop(0, `rgba(255, 200, 100, ${0.6 * brightness})`);
        glow.addColorStop(0.45, `rgba(255, 160, 60, ${0.2 * brightness})`);
        glow.addColorStop(1, 'rgba(255, 140, 40, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.globalAlpha = brightness;
        const filament = ctx.createRadialGradient(x - bulbRadius * 0.3, y - bulbRadius * 0.3, 0, x, y, bulbRadius);
        filament.addColorStop(0, '#fffdf2');
        filament.addColorStop(0.45, '#ffe9a3');
        filament.addColorStop(1, '#f0a325');
        ctx.fillStyle = filament;
        ctx.beginPath();
        ctx.arc(x, y, bulbRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

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

export default CasinoEffects;
