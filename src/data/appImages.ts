// Centralized imagery for the whole terminal — trading, markets, and research.
// All Pexels (license-free, hotlinkable). Sized for banners.

const px = (id: number, w = 1200) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const APP_IMAGES = {
  // markets / trading
  tradingFloor: px(159888),      // stock exchange board
  candles: px(6770610),          // candlestick chart on screen
  tickerTape: px(534216),        // financial newspaper / numbers
  skyline: px(325185),           // financial-district skyline at dusk
  analytics: px(590022),         // laptop with charts
  ledger: px(210990),            // charts + pen on paper
  vault: px(730547),             // cash / bankroll
  desk: px(7567443),             // multi-monitor trading desk
  bull: px(844124),              // abstract green up-move
} as const;

/** Small square thumbnails for empty states, stat tiles, and chips. */
export const THUMBS = {
  chart: px(6801648, 320),
  equity: px(7567434, 320),
  pnl: px(6771607, 320),
  positions: px(210607, 320),
  trophy: px(260352, 320),
  ticker: px(6779727, 320),
  bankroll: px(730547, 320),
  research: px(590041, 320),
  market: px(534216, 320),
} as const;

/** Header banner image for each route. */
export function pageHero(pathname: string): string {
  const p = pathname.replace(/\/+$/, '');
  switch (p) {
    case '/dashboard': return APP_IMAGES.desk;
    case '/signals': return APP_IMAGES.candles;
    case '/portfolio': return APP_IMAGES.ledger;
    case '/performance': return APP_IMAGES.analytics;
    case '/settings': return APP_IMAGES.skyline;
    case '/sports/intel': return APP_IMAGES.analytics;
    default: return APP_IMAGES.tradingFloor;
  }
}
