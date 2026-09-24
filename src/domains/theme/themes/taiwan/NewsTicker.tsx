import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { ENTER_MS, SPIN_PROGRAM, TW_CREAM, TW_GOLD, TW_JADE, TW_SERIF, TW_TICKER_HEIGHT } from './taiwanTokens';
import { useSpinWindow } from './useSpinCue';

import type { CSSProperties } from 'react';
import type { WheelFrame } from './useWheelFrame';

const TICKER_HEIGHT = TW_TICKER_HEIGHT;
/** Pairs per half of the track; the track is two identical halves so the crawl loops seamlessly */
const PAIRS_PER_HALF = 5;
/** Her arrow sticks this far out of the top of the bar, so the hidden bar goes down by that much more */
const ARROW_OVERHANG = 40;
/** Above the wheel and its winner overlay, below Mantine modals and notifications */
const TICKER_Z_INDEX = 150;

const labelStyle: CSSProperties = {
  fontFamily: TW_SERIF,
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: TW_CREAM,
};

/**
 * A TV-news crawl along the bottom: "Pelosi ▲ · Buffett ▲" on repeat. Both are up, but her
 * arrow is huge, glowing and sticks far out of the bar, while his is a tiny one. At its seconds of
 * the spin (`SPIN_PROGRAM`) the whole bar rolls up from the bottom and back down. It lies over the wheel area (portal into <body>, since the
 * background sits under the app), so no room is reserved for it, and stops at the sidebar. The
 * crawl stops with reduced motion.
 */
const NewsTicker = ({ frame }: { frame: WheelFrame }) => {
  const { t } = useTranslation();
  const isShown = useSpinWindow(SPIN_PROGRAM.ticker);

  const pair = (key: string) => (
    <span key={key} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 10, paddingRight: 56 }}>
      <span style={labelStyle}>{t('themes.taiwan.tickerPelosi')}</span>
      <span
        style={{
          fontSize: 58,
          lineHeight: `${TICKER_HEIGHT}px`,
          color: TW_JADE,
          textShadow: '0 0 14px rgba(53, 208, 127, 0.85), 0 0 3px rgba(0, 0, 0, 0.6)',
          transform: 'translateY(-10px)',
        }}
      >
        ▲
      </span>
      <span style={{ ...labelStyle, color: TW_GOLD, padding: '0 14px' }}>·</span>
      <span style={labelStyle}>{t('themes.taiwan.tickerBuffett')}</span>
      <span style={{ fontSize: 11, lineHeight: `${TICKER_HEIGHT}px`, color: TW_JADE }}>▲</span>
    </span>
  );

  const half = (prefix: string) => (
    <span style={{ display: 'inline-flex' }}>
      {Array.from({ length: PAIRS_PER_HALF }, (_, index) => pair(`${prefix}-${index}`))}
    </span>
  );

  return createPortal(
    <div
      aria-hidden='true'
      className='taiwan-enter'
      data-shown={isShown}
      style={{
        position: 'fixed',
        left: 0,
        width: frame.contentRight,
        bottom: 0,
        zIndex: TICKER_Z_INDEX,
        transform: `translateY(${TICKER_HEIGHT + ARROW_OVERHANG}px)`,
        ['--taiwan-enter' as string]: `${ENTER_MS}ms`,
        height: TICKER_HEIGHT,
        display: 'flex',
        alignItems: 'flex-end',
        overflowX: 'clip',
        overflowY: 'visible',
        background: 'linear-gradient(0deg, rgba(10, 4, 4, 0.9), rgba(10, 4, 4, 0.62))',
        borderTop: '1px solid rgba(212, 169, 60, 0.55)',
        pointerEvents: 'none',
      }}
    >
      <div className='taiwan-ticker-track' style={{ lineHeight: `${TICKER_HEIGHT}px` }}>
        {half('a')}
        {half('b')}
      </div>
    </div>,
    document.body,
  );
};

export default NewsTicker;
