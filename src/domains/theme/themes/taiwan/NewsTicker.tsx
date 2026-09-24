import { useTranslation } from 'react-i18next';

import { TW_CREAM, TW_GOLD, TW_JADE, TW_SERIF, TW_TICKER_HEIGHT } from './taiwanTokens';

import type { CSSProperties } from 'react';

const TICKER_HEIGHT = TW_TICKER_HEIGHT;
/** Pairs per half of the track; the track is two identical halves so the crawl loops seamlessly */
const PAIRS_PER_HALF = 5;

const labelStyle: CSSProperties = {
  fontFamily: TW_SERIF,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: TW_CREAM,
};

/**
 * A TV-news crawl along the bottom: "Pelosi ▲ · Buffett ▲" on repeat. Both are up, but her
 * arrow is huge, glowing and sticks far out of the bar, while his is a tiny one. The bar lies under
 * the wheel, so it shows left and right of it. The crawl stops with reduced motion.
 */
const NewsTicker = () => {
  const { t } = useTranslation();

  const pair = (key: string) => (
    <span key={key} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 10, paddingRight: 56 }}>
      <span style={labelStyle}>{t('themes.taiwan.tickerPelosi')}</span>
      <span
        style={{
          fontSize: 50,
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

  return (
    <div
      aria-hidden='true'
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
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
    </div>
  );
};

export default NewsTicker;
