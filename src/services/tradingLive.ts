import { useState, useEffect, useCallback, useRef } from 'react';
import { alpaca, getTradingEnv, type AlpacaAccount, type AlpacaPosition, type AlpacaOrder, type AlpacaBar } from '@/services/alpaca';
import type { EquityPoint, DailyPnlPoint } from '@/types/models';
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

export interface PortfolioHistoryPoint {
  timestamp: number;
  equity: number;
  profit_loss: number;
  profit_loss_pct: number;
}

async function fetchPortfolioHistory(period = '1M', timeframe = '1D'): Promise<PortfolioHistoryPoint[]> {
  const headers = await getAuthHeaders();
  const qs = new URLSearchParams({ env: getTradingEnv(), period, timeframe });
  const res = await fetch(`${FUNC_URL}/portfolio-history?${qs}`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.timestamp || !data.equity) return [];
  return (data.timestamp as number[]).map((t: number, i: number) => ({
    timestamp: t * 1000,
    equity: data.equity[i] ?? 0,
    profit_loss: data.profit_loss[i] ?? 0,
    profit_loss_pct: data.profit_loss_pct[i] ?? 0,
  }));
}

async function cancelAllOrders(): Promise<{ cancelled: number }> {
  const headers = await getAuthHeaders();
  const qs = new URLSearchParams({ env: getTradingEnv() });
  const res = await fetch(`${FUNC_URL}/orders?${qs}`, { method: 'DELETE', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || 'Failed to cancel orders');
  }
  return res.json();
}

export interface LiveTicker {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  sparkline: number[];
}

export interface LiveTradingState {
  connected: boolean;
  loading: boolean;
  error: string | null;
  account: AlpacaAccount | null;
  positions: AlpacaPosition[];
  orders: AlpacaOrder[];
  equityCurve: EquityPoint[];
  dailyPnl: DailyPnlPoint[];
  drawdown: EquityPoint[];
  tickers: LiveTicker[];
  spyCandles: { t: number; o: number; h: number; l: number; c: number; v: number }[];
  exposure: { name: string; value: number }[];
  lastSync: Date | null;
}

const TICKER_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'META'];

const INITIAL: LiveTradingState = {
  connected: false,
  loading: false,
  error: null,
  account: null,
  positions: [],
  orders: [],
  equityCurve: [],
  dailyPnl: [],
  drawdown: [],
  tickers: [],
  spyCandles: [],
  exposure: [],
  lastSync: null,
};

function historyToEquity(pts: PortfolioHistoryPoint[]): EquityPoint[] {
  return pts.map((p) => ({ t: p.timestamp, value: p.equity }));
}

function historyToDailyPnl(pts: PortfolioHistoryPoint[]): DailyPnlPoint[] {
  return pts.map((p) => ({
    date: new Date(p.timestamp).toISOString().slice(0, 10),
    pnl: p.profit_loss,
  }));
}

function historyToDrawdown(pts: PortfolioHistoryPoint[]): EquityPoint[] {
  let peak = pts[0]?.equity ?? 0;
  return pts.map((p) => {
    if (p.equity > peak) peak = p.equity;
    return { t: p.timestamp, value: peak > 0 ? ((p.equity - peak) / peak) * 100 : 0 };
  });
}

function barsToCandles(bars: AlpacaBar[]): { t: number; o: number; h: number; l: number; c: number; v: number }[] {
  return bars.map((b) => ({
    t: new Date(b.t).getTime(),
    o: b.o,
    h: b.h,
    l: b.l,
    c: b.c,
    v: b.v,
  }));
}

export function useLiveTrading(refreshMs = 30_000) {
  const [state, setState] = useState<LiveTradingState>(INITIAL);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setState((p) => ({ ...p, loading: true, error: null }));
    try {
      const [account, positions, orders, quotesRes, historyPts, spyBarsRes] = await Promise.all([
        alpaca.getAccount(),
        alpaca.getPositions(),
        alpaca.getOrders('all', 50),
        alpaca.getQuotes(TICKER_SYMBOLS),
        fetchPortfolioHistory('1M', '1D'),
        alpaca.getBars(['SPY'], '5Min'),
      ]);

      if (!mountedRef.current) return;

      const quotes = quotesRes.quotes ?? {};
      const cash = parseFloat(account.cash);

      const tickers: LiveTicker[] = TICKER_SYMBOLS.filter((s) => quotes[s]).map((s) => {
        const q = quotes[s];
        const mid = (q.ap + q.bp) / 2;
        return {
          symbol: s,
          price: mid,
          change: 0,
          changePct: 0,
          sparkline: Array.from({ length: 20 }, () => mid * (0.998 + Math.random() * 0.004)),
        };
      });

      const exposure = [
        ...positions.map((p) => ({ name: p.symbol, value: Math.abs(parseFloat(p.market_value)) })),
        ...(cash > 0 ? [{ name: 'Cash', value: cash }] : []),
      ];

      const spyBars = spyBarsRes.bars?.SPY ?? [];

      setState({
        connected: true,
        loading: false,
        error: null,
        account,
        positions,
        orders,
        equityCurve: historyToEquity(historyPts),
        dailyPnl: historyToDailyPnl(historyPts),
        drawdown: historyToDrawdown(historyPts),
        tickers,
        spyCandles: barsToCandles(spyBars),
        exposure: exposure.length > 0 ? exposure : [{ name: 'Cash', value: cash || 0 }],
        lastSync: new Date(),
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setState((p) => ({
        ...p,
        loading: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        connected: false,
      }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const iv = setInterval(refresh, refreshMs);
    return () => {
      mountedRef.current = false;
      clearInterval(iv);
    };
  }, [refresh, refreshMs]);

  return { ...state, refresh, cancelAllOrders };
}
