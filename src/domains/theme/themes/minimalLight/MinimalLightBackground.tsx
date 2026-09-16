/**
 * Plain white page with a barely-there light-grey radial gradient that is
 * brightest where the wheel sits. Static by design: no canvas, no motion.
 */
const MinimalLightBackground = () => {
  return (
    <div
      className='absolute inset-0 z-0 h-full w-full overflow-hidden bg-white'
      style={{
        backgroundColor: '#ffffff',
        backgroundImage: 'radial-gradient(circle at 42% 48%, #ffffff 0%, #fafafa 42%, #f3f4f6 100%)',
      }}
    />
  );
};

export default MinimalLightBackground;
