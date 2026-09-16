import { type ISourceOptions, MoveDirection, OutMode } from '@tsparticles/engine';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useEffect, useMemo, useState } from 'react';

let initializeParticlesPromise: Promise<void> | null = null;

const initializeParticles = (): Promise<void> => {
  initializeParticlesPromise ??= initParticlesEngine(async (engine) => {
    await loadSlim(engine);
  });

  return initializeParticlesPromise;
};

const PARTICLE_OPTIONS: ISourceOptions = {
  autoPlay: true,
  background: { color: { value: 'transparent' } },
  detectRetina: true,
  fullScreen: { enable: false },
  fpsLimit: 60,
  interactivity: {
    detectsOn: 'canvas',
    events: { resize: { enable: true } },
  },
  particles: {
    color: { value: ['#69e6ff', '#f5d76e', '#f7f7fb'] },
    links: {
      color: '#b8f3ff',
      distance: 145,
      enable: true,
      opacity: 0.24,
      triangles: { enable: true, color: '#69e6ff', opacity: 0.025 },
      width: 1,
    },
    move: {
      direction: MoveDirection.none,
      enable: true,
      outModes: { default: OutMode.out },
      random: false,
      speed: 0.45,
      straight: false,
    },
    number: { density: { enable: true }, value: 90 },
    opacity: { value: { min: 0.28, max: 0.72 } },
    shape: { type: 'polygon', options: { polygon: { sides: 6 } } },
    size: { value: { min: 1.2, max: 4.2 } },
  },
  pauseOnBlur: true,
  pauseOnOutsideViewport: true,
};

/**
 * Full-screen "constellations" backdrop: slow-moving hexagon particles linked
 * by thin lines over a deep-space gradient. Rendered once behind the page.
 */
const GeometryBackground = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const options = useMemo(() => PARTICLE_OPTIONS, []);

  useEffect(() => {
    let isMounted = true;

    void initializeParticles().then(() => {
      if (isMounted) {
        setIsInitialized(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className='absolute inset-0 z-0 h-full w-full overflow-hidden bg-[radial-gradient(circle_at_18%_20%,rgba(105,230,255,0.16),transparent_30%),linear-gradient(135deg,#090b12_0%,#181324_52%,#0a1317_100%)]'>
      {isInitialized ? (
        <Particles id='geometry-background' className='absolute inset-0 h-full w-full' options={options} />
      ) : null}
    </div>
  );
};

export default GeometryBackground;
