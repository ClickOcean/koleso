import { useEffect, useRef } from 'react';

import { randomHexChar, randomLogSegment } from './fakeLog';
import { AMBER_HOT, MONO, amber } from './palette';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 50; // 20 fps: enough for text drift, flicker and roll bars
const STREAM_FONT_SIZE = 12.5; // px for an 800 px wheel
const STREAM_OFFSET = 27; // ring radius = wheelRadius + scale * STREAM_OFFSET
const ROLL_BAR_HEIGHT = 56; // px for an 800 px wheel
const IDLE_SPEED = 0.14; // radians per second
const SPIN_SPEED = 1.1;

interface StreamGlyph {
  char: string;
  brightness: number;
}

/** Fills a cyclic buffer with fake log tokens separated by gaps. */
const buildStream = (length: number): StreamGlyph[] => {
  const glyphs: StreamGlyph[] = [];
  while (glyphs.length < length) {
    `${randomLogSegment()}   `.split('').forEach((char) => {
      if (glyphs.length < length) {
        glyphs.push({ char, brightness: 0 });
      }
    });
  }
  return glyphs;
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
 * Three CRT effects on one canvas over the wheel: a stream of fake log text
 * running clockwise around the rim, phosphor flicker over the disk and
 * horizontal roll bars that sweep down the screen while spinning.
 */
const TerminalEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const rollRef = useRef({ y: 0, intensity: 0 });
  const isSpinningRef = useRef(isSpinning);

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
    const ringRadius = wheelRadius + scale * STREAM_OFFSET;
    const fontSize = Math.max(10, scale * STREAM_FONT_SIZE);
    const font = `${fontSize}px ${MONO}`;

    ctx.font = font;
    const charWidth = ctx.measureText('0').width || fontSize * 0.6;
    const glyphCount = Math.max(8, Math.floor((2 * Math.PI * ringRadius) / (charWidth * 1.05)));
    const stepAngle = (2 * Math.PI) / glyphCount;
    const glyphs = buildStream(glyphCount);
    const barHeight = ROLL_BAR_HEIGHT * scale;
    const rollCycle = wheelRadius * 2 + barHeight * 2;

    let frameId: number | null = null;
    let lastFrame = 0;

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);

      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const dt = Math.min(lastFrame ? timestamp - lastFrame : FRAME_INTERVAL, 200) / 1000;
      lastFrame = timestamp;

      const spinning = isSpinningRef.current;
      rotationRef.current += (spinning ? SPIN_SPEED : IDLE_SPEED) * dt;

      // a few glyphs get rewritten every frame so the log looks alive
      const rewrites = spinning ? 5 : 1;
      for (let i = 0; i < rewrites; i++) {
        const index = Math.floor(Math.random() * glyphs.length);
        if (glyphs[index].char !== ' ') {
          glyphs[index] = { char: randomHexChar(), brightness: 1 };
        }
      }
      glyphs.forEach((glyph) => {
        glyph.brightness = Math.max(0, glyph.brightness - dt * 1.4);
      });

      // roll bars fade in and out instead of popping
      const roll = rollRef.current;
      roll.intensity += ((spinning ? 1 : 0) - roll.intensity) * Math.min(1, dt * 4);
      if (roll.intensity > 0.01) {
        roll.y = (roll.y + dt * wheelRadius * 1.6) % rollCycle;
      }

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // 1. log stream around the rim: a faint phosphor band and the glyphs on it
      ctx.save();
      ctx.strokeStyle = amber(spinning ? 0.09 : 0.05);
      ctx.lineWidth = fontSize * 1.6;
      ctx.beginPath();
      ctx.arc(center, center, ringRadius, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      glyphs.forEach((glyph, index) => {
        if (glyph.char === ' ') {
          return;
        }
        const angle = rotationRef.current + index * stepAngle;
        const alpha = 0.4 + glyph.brightness * 0.6;

        ctx.save();
        ctx.translate(center + Math.cos(angle) * ringRadius, center + Math.sin(angle) * ringRadius);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = glyph.brightness > 0.6 ? AMBER_HOT : amber(alpha);
        ctx.fillText(glyph.char, 0, 0);
        ctx.restore();
      });
      ctx.restore();

      // 2. phosphor flicker: tiny random brightness changes over the whole disk
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, wheelRadius, 0, 2 * Math.PI);
      ctx.clip();

      const diskX = center - wheelRadius;
      const diskSize = wheelRadius * 2;
      ctx.fillStyle = amber(Math.random() * (spinning ? 0.05 : 0.025));
      ctx.fillRect(diskX, diskX, diskSize, diskSize);
      if (Math.random() < (spinning ? 0.12 : 0.03)) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + Math.random() * 0.08})`;
        ctx.fillRect(diskX, diskX, diskSize, diskSize);
      }

      // 3. roll bars: a wide bright band with a dark tear line, plus a thin trailing bar
      if (roll.intensity > 0.01) {
        const mainTop = diskX - barHeight + roll.y;
        const band = ctx.createLinearGradient(0, mainTop, 0, mainTop + barHeight);
        band.addColorStop(0, amber(0));
        band.addColorStop(0.55, amber(0.16 * roll.intensity));
        band.addColorStop(1, amber(0));
        ctx.fillStyle = band;
        ctx.fillRect(diskX, mainTop, diskSize, barHeight);

        ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * roll.intensity})`;
        ctx.fillRect(diskX, mainTop + barHeight, diskSize, Math.max(1, scale * 2));

        const thinTop = diskX - barHeight + ((roll.y + rollCycle * 0.45) % rollCycle);
        ctx.fillStyle = amber(0.07 * roll.intensity);
        ctx.fillRect(diskX, thinTop, diskSize, Math.max(2, scale * 6));
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

export default TerminalEffects;
