import { supabase } from '@/lib/supabase';

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-connector`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

async function alpacaFetch<T>(path: string, params?: Record<string, string>, method = 'GET', body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const qs = new URLSearchParams({ env: 'paper', ...params });
  const url = `${FUNC_URL}/${path}?${qs}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Alpaca request failed (${res.status})`);
  }
  return res.json();
}

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  daytrade_count: number;
  pattern_day_trader: boolean;
}

export interface AlpacaPosition {
  asset_id: string;
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
  getAccount: () => alpacaFetch<AlpacaAccount>('account'),

  getPositions: () => alpacaFetch<AlpacaPosition[]>('positions'),

  getQuotes: (symbols: string[]) =>
    alpacaFetch<{ quotes: Record<string, AlpacaQuote> }>('quotes', { symbols: symbols.join(',') }),

  getBars: (symbols: string[], timeframe = '1Day', start?: string, end?: string) => {
    const params: Record<string, string> = { symbols: symbols.join(','), timeframe };
    if (start) params.start = start;
    if (end) params.end = end;
    return alpacaFetch<{ bars: Record<string, AlpacaBar[]> }>('bars', params);
  },

  getOrders: (status = 'all', limit = 50) =>
    alpacaFetch<AlpacaOrder[]>('orders', { status, limit: String(limit) }),

  submitOrder: (order: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
    limit_price?: number;
    stop_price?: number;
  }) => alpacaFetch<AlpacaOrder>('orders', { env: 'paper' }, 'POST', order),
};
