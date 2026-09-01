import { brokerFetch, getActiveBrokerId, setActiveBrokerId, type BrokerId } from '@/services/brokers';

// ── Trading venue ───────────────────────────────────────────────────────────
// The terminal can trade through more than one venue (Alpaca paper, Alpaca
// live, Kraken). Selection lives in brokers.ts; these helpers keep the older
// paper/live vocabulary working for callers that only care about that.

export type TradingEnv = 'paper' | 'live';

export function getTradingEnv(): TradingEnv {
  return getActiveBrokerId() === 'alpaca-paper' ? 'paper' : 'live';
}

export function setTradingEnv(env: TradingEnv) {
  setActiveBrokerId(env === 'live' ? 'alpaca-live' : 'alpaca-paper');
}

export { getActiveBrokerId, setActiveBrokerId, type BrokerId };

/** Route a request to whichever venue is currently selected. */
function venueFetch<T>(path: string, params?: Record<string, string>, method = 'GET', body?: unknown): Promise<T> {
  return brokerFetch<T>(getActiveBrokerId(), path, params, method, body);
}

// ── Shared shapes ───────────────────────────────────────────────────────────
// Both connectors normalize into these, so the UI is venue-agnostic.

export interface AlpacaAccount {
  id?: string;
  account_number?: string;
  status?: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity?: string;
  long_market_value?: string;
  short_market_value?: string;
  initial_margin?: string;
  maintenance_margin?: string;
  daytrade_count?: number;
  pattern_day_trader?: boolean;
  /** Present on crypto venues: raw per-asset balances. */
  balances?: Record<string, string>;
  broker?: string;
}

export interface AlpacaPosition {
  asset_id?: string;
  symbol: string;
  qty: string;
  avg_entry_price: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  change_today: string;
  side: string;
}

export interface AlpacaQuote {
  ap: number; // ask price
  as: number; // ask size
  bp: number; // bid price
  bs: number; // bid size
  t: string;  // timestamp
}

export interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n: number;
  vw: number;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  status: string;
  symbol: string;
  qty: string;
  filled_qty: string;
  side: string;
  type: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  filled_avg_price: string | null;
  submitted_at: string;
  filled_at: string | null;
  created_at: string;
}

export const alpaca = {
  getAccount: () => venueFetch<AlpacaAccount>('account'),

  getPositions: () => venueFetch<AlpacaPosition[]>('positions'),

  getQuotes: (symbols: string[]) =>
    venueFetch<{ quotes: Record<string, AlpacaQuote> }>('quotes', { symbols: symbols.join(',') }),

  getBars: (symbols: string[], timeframe = '1Day', start?: string, end?: string) => {
    const params: Record<string, string> = { symbols: symbols.join(','), timeframe };
    // Kraken takes minutes as an integer interval; map the common timeframes.
    if (getActiveBrokerId() === 'kraken') {
      params.interval = timeframe.startsWith('5') ? '5' : timeframe.startsWith('1Day') ? '1440' : '60';
    }
    if (start) params.start = start;
    if (end) params.end = end;
    return venueFetch<{ bars: Record<string, AlpacaBar[]> }>('bars', params);
  },

  getOrders: (status = 'all', limit = 50) =>
    venueFetch<AlpacaOrder[]>('orders', { status, limit: String(limit) }),

  submitOrder: (order: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
    limit_price?: number;
    stop_price?: number;
  }) => venueFetch<AlpacaOrder>('orders', {}, 'POST', order),
};
