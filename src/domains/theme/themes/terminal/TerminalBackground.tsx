import { useEffect, useRef } from 'react';

import { randomLogLine } from './fakeLog';
import { MONO, SCREEN_BLACK, amber } from './palette';

const FRAME_INTERVAL = 40; // 25 fps
const FONT_SIZE = 13;
const LINE_HEIGHT = 19;
const GRID_STEP = 48;
const SCROLL_SPEED = 26; // px per second
const TYPE_SPEED = 60; // characters per second for the newest line
const MARGIN = 28;

interface LogLine {
  text: string;
  /** seconds since the line appeared; drives the typing reveal and the fade to base brightness */
  age: number;
}

interface LogColumn {
  x: number;
  align: CanvasTextAlign;
  maxChars: number;
  /** vertical scroll inside the current line, 0..LINE_HEIGHT */
  offset: number;
  lines: LogLine[];
}

const buildColumn = (x: number, align: CanvasTextAlign, height: number, maxChars: number): LogColumn => ({
  x,
  align,
  maxChars,
  offset: Math.random() * LINE_HEIGHT,
  lines: Array.from({ length: Math.ceil(height / LINE_HEIGHT) + 1 }, () => ({ text: randomLogLine(), age: 10 })),
});

/**
 * Amber CRT backdrop: a faint grid over near-black, two columns of scrolling
 * fake system log in the left and right margins, CSS scanlines and a curved
 * screen vignette on top. Everything stays dim so the wheel keeps the focus.
 */
const TerminalBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    const font = `${FONT_SIZE}px ${MONO}`;
    let columns: LogColumn[] = [];
    let frameId: number | null = null;
    let lastFrame = 0;

    const resize = () => {
      const { innerWidth: width, innerHeight: height } = window;
      canvas.width = width;
      canvas.height = height;

      ctx.font = font;
      const charWidth = ctx.measureText('0').width || FONT_SIZE * 0.6;
      const maxChars = Math.max(12, Math.floor(Math.min(width * 0.19, 300) / charWidth));
      columns = [buildColumn(MARGIN, 'left', height, maxChars), buildColumn(width - MARGIN, 'right', height, maxChars)];
    };

    const drawGrid = (width: number, height: number) => {
      ctx.lineWidth = 1;
      for (let x = 0.5, index = 0; x < width; x += GRID_STEP, index++) {
        ctx.strokeStyle = amber(index % 4 === 0 ? 0.07 : 0.035);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0.5, index = 0; y < height; y += GRID_STEP, index++) {
        ctx.strokeStyle = amber(index % 4 === 0 ? 0.07 : 0.035);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    const drawColumn = (column: LogColumn, height: number, dt: number) => {
      column.offset += SCROLL_SPEED * dt;
      while (column.offset >= LINE_HEIGHT) {
        column.offset -= LINE_HEIGHT;
        column.lines.shift();
        column.lines.push({ text: randomLogLine(), age: 0 });
      }

      ctx.textAlign = column.align;
      const count = column.lines.length;
      column.lines.forEach((line, index) => {
        line.age += dt;
        const y = height - MARGIN - (count - 1 - index) * LINE_HEIGHT - column.offset;
        if (y < -LINE_HEIGHT) {
          return;
        }

        const shown = Math.min(line.text.length, Math.floor(line.age * TYPE_SPEED));
        const typing = shown < line.text.length;
        const text = (typing ? `${line.text.slice(0, shown)}▮` : line.text).slice(0, column.maxChars);
        const alpha = 0.13 + 0.32 * Math.max(0, 1 - line.age / 3);
        ctx.fillStyle = amber(alpha);
        ctx.fillText(text, column.x, y);
      });
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const dt = Math.min(lastFrame ? timestamp - lastFrame : FRAME_INTERVAL, 200) / 1000;
      lastFrame = timestamp;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      drawGrid(width, height);

      ctx.font = font;
      ctx.textBaseline = 'alphabetic';
      columns.forEach((column) => drawColumn(column, height, dt));
    };

    resize();
    window.addEventListener('resize', resize);
    frameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div
      className='absolute inset-0 z-0 h-full w-full overflow-hidden'
      style={{
        backgroundColor: SCREEN_BLACK,
        backgroundImage: 'radial-gradient(circle at 42% 50%, rgba(255, 176, 0, 0.07) 0%, rgba(255, 176, 0, 0) 38%)',
      }}
    >
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' style={{ opacity: 0.9 }} />
      <div
        className='absolute inset-0'
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.22) 0px, rgba(0, 0, 0, 0.22) 1px, rgba(0, 0, 0, 0) 1px, rgba(0, 0, 0, 0) 3px)',
        }}
      />
      <div
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0) 48%, rgba(0, 0, 0, 0.38) 74%, rgba(0, 0, 0, 0.82) 100%)',
        }}
      />
      <div
        className='absolute inset-0'
        style={{ borderRadius: '3% / 4%', boxShadow: 'inset 0 0 120px 12px rgba(0, 0, 0, 0.85)' }}
      />
    </div>
  );
};

export default TerminalBackground;
