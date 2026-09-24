import NewsTicker from './NewsTicker';
import PlaneFlyover from './PlaneFlyover';
import TaiwanCats from './TaiwanCats';
import TaiwanCharacters from './TaiwanCharacters';
import TaiwanSlideshow from './TaiwanSlideshow';
import { useWheelFrame } from './useWheelFrame';

/**
 * The Taiwan scene, back to front: photos of Taiwan in rotation, a light shade at the top and on
 * the left for the headings and the wheel, then, timed to the spin, the cats, Pelosi and Buffett,
 * the government jet and the Airbus, and the news crawl at the bottom. Without the photos the page
 * stays a deep lacquer-black with the same layers on top.
 */
const TaiwanBackground = () => {
  const frame = useWheelFrame();

  return (
    <div
      className='absolute inset-0 z-0 h-full w-full overflow-hidden'
      style={{
        background: 'radial-gradient(ellipse at 80% 40%, rgba(179, 18, 31, 0.22) 0%, rgba(8, 4, 5, 0) 60%), #080405',
      }}
    >
      <TaiwanSlideshow frame={frame} />
      <div
        className='absolute inset-0'
        style={{
          zIndex: 3,
          background:
            'linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 20%), linear-gradient(90deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.2) 35%, rgba(0, 0, 0, 0) 60%)',
        }}
      />
      <div className='absolute inset-0' style={{ zIndex: 4 }}>
        <TaiwanCats frame={frame} />
        <TaiwanCharacters frame={frame} />
        <PlaneFlyover frame={frame} />
        <NewsTicker frame={frame} />
      </div>
    </div>
  );
};

export default TaiwanBackground;
