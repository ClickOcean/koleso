import { useEffect, useRef } from 'react';

const FRAME_INTERVAL = 66; // ~15 fps
/** Bubbles per square pixel of viewport, clamped below */
const BUBBLE_DENSITY = 1 / 24000;
const MIN_BUBBLES = 30;
const MAX_BUBBLES = 90;
const BACKGROUND_IMAGE = '/themes/highSociety/background.jpg';

interface Bubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleWidth: number;
}

const createBubble = (width: number, height: number, y = Math.random() * height): Bubble => {
  const depth = Math.random();

  return {
    x: Math.random() * width,
    y,
    radius: 1.2 + depth * 2.6,
    speed: 9 + depth * 20,
    alpha: 0.25 + depth * 0.4,
    wobblePhase: Math.random() * 2 * Math.PI,
    wobbleSpeed: 0.6 + Math.random() * 0.9,
    wobbleWidth: 4 + Math.random() * 10,
  };
};

/**
 * The generated ballroom scene (people and champagne on the right, dark bokeh on the
 * left) as a cover background, darkened on the left where the wheel sits, with slow
 * golden bubbles rising over it at low opacity. Without the image the page stays a
 * warm black with the same bubbles.
 */
const HighSocietyBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    let bubbles: Bubble[] = [];
    let frameId: number | null = null;
    let lastFrame = 0;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      const count = Math.min(MAX_BUBBLES, Math.max(MIN_BUBBLES, Math.round(innerWidth * innerHeight * BUBBLE_DENSITY)));
      bubbles = Array.from({ length: count }, () => createBubble(innerWidth, innerHeight));
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 250) / 1000 : FRAME_INTERVAL / 1000;
      lastFrame = timestamp;

      const { width, height } = canvas;
      const seconds = timestamp / 1000;

      ctx.clearRect(0, 0, width, height);

      bubbles.forEach((bubble, index) => {
        const x = bubble.x + Math.sin(seconds * bubble.wobbleSpeed + bubble.wobblePhase) * bubble.wobbleWidth;

        ctx.fillStyle = `rgba(255, 220, 130, ${bubble.alpha * 0.25})`;
        ctx.strokeStyle = `rgba(255, 232, 160, ${bubble.alpha})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(x, bubble.y, bubble.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 240, ${bubble.alpha})`;
        ctx.beginPath();
        ctx.arc(x - bubble.radius * 0.35, bubble.y - bubble.radius * 0.35, bubble.radius * 0.3, 0, 2 * Math.PI);
        ctx.fill();

        bubble.y -= bubble.speed * delta;
        if (bubble.y < -bubble.radius - bubble.wobbleWidth) {
          bubbles[index] = createBubble(width, height, height + bubble.radius);
        }
      });
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
        // warm black with a faint gold glow on the right: what shows if the image never loads
        background: 'radial-gradient(ellipse at 88% 42%, rgba(201, 162, 39, 0.14) 0%, rgba(5, 4, 3, 0) 55%), #050403',
      }}
    >
      <div
        className='absolute inset-0'
        style={{
          backgroundImage: `url('${BACKGROUND_IMAGE}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* darken the left where the wheel sits so ivory and gold stay readable */}
      <div
        className='absolute inset-0'
        style={{
          background:
            'linear-gradient(90deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.66) 28%, rgba(0, 0, 0, 0.38) 45%, rgba(0, 0, 0, 0) 58%)',
        }}
      />
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' style={{ opacity: 0.3 }} />
      {/* soft vignette keeps the corners quiet */}
      <div
        className='absolute inset-0'
        style={{
          background:
            'linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0) 22%, rgba(0, 0, 0, 0) 78%, rgba(0, 0, 0, 0.45) 100%)',
        }}
      />
    </div>
  );
};

export default HighSocietyBackground;
