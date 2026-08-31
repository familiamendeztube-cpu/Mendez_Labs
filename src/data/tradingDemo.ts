// Deterministic demo data for trading charts when no live connection exists.
// Seeded from a simple PRNG so charts look realistic but are 100% static.

import type { EquityPoint, DailyPnlPoint } from '@/types/models';

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── Equity curve: 30 days of paper equity ────────────────────────────────────
export function demoEquityCurve(): EquityPoint[] {
  const rng = seededRandom(42);
  const points: EquityPoint[] = [];
  let value = 100_000;
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const t = now - i * 86400000;
    value += (rng() - 0.45) * 800;
    value = Math.max(95000, value);
    points.push({ t, value: Math.round(value * 100) / 100 });
  }
  return points;
}

// ── Daily P&L: 14 days ──────────────────────────────────────────────────────
export function demoDailyPnl(): DailyPnlPoint[] {
  const rng = seededRandom(99);
  const points: DailyPnlPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const pnl = Math.round((rng() - 0.42) * 500 * 100) / 100;
    points.push({ date: d.toISOString().slice(0, 10), pnl });
  }
  return points;
}

// ── Intraday price data (SPY-like) ──────────────────────────────────────────
export function demoIntradayCandles(): { t: number; o: number; h: number; l: number; c: number; v: number }[] {
  const rng = seededRandom(77);
  const candles: { t: number; o: number; h: number; l: number; c: number; v: number }[] = [];
  let price = 553.20;
  const base = new Date();
  base.setHours(9, 30, 0, 0);
  for (let i = 0; i < 78; i++) {
    const t = base.getTime() + i * 5 * 60000;
    const o = price;
    const change = (rng() - 0.48) * 1.2;
    const c = Math.round((o + change) * 100) / 100;
    const h = Math.round(Math.max(o, c, o + rng() * 0.8) * 100) / 100;
    const l = Math.round(Math.min(o, c, o - rng() * 0.8) * 100) / 100;
    const v = Math.round(500000 + rng() * 2000000);
    candles.push({ t, o, h, l, c, v });
    price = c;
  }
  return candles;
}

// ── Exposure donut ──────────────────────────────────────────────────────────
export const demoExposure = [
  { name: 'SPY', value: 32000 },
  { name: 'QQQ', value: 18000 },
  { name: 'AAPL', value: 12000 },
  { name: 'NVDA', value: 8000 },
  { name: 'Cash', value: 30000 },
];

// ── Mini sparkline data (for symbol cards) ──────────────────────────────────
export function demoSparkline(seed: number, points = 20): number[] {
  const rng = seededRandom(seed);
  const data: number[] = [];
  let v = 100;
  for (let i = 0; i < points; i++) {
    v += (rng() - 0.48) * 3;
    data.push(Math.round(v * 100) / 100);
  }
  return data;
}

// ── Universe symbols with demo metrics ──────────────────────────────────────
export interface SymbolTicker {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  sparkline: number[];
}

export function demoTickers(): SymbolTicker[] {
  const rng = seededRandom(123);
  const syms = [
    { symbol: 'SPY', base: 553.20 },
    { symbol: 'QQQ', base: 487.85 },
    { symbol: 'IWM', base: 221.30 },
    { symbol: 'DIA', base: 421.75 },
    { symbol: 'AAPL', base: 227.50 },
    { symbol: 'MSFT', base: 441.20 },
    { symbol: 'NVDA', base: 128.80 },
    { symbol: 'AMZN', base: 197.30 },
    { symbol: 'GOOGL', base: 171.45 },
    { symbol: 'META', base: 551.60 },
    { symbol: 'TSLA', base: 258.40 },
  ];
  return syms.map(({ symbol, base }) => {
    const changePct = (rng() - 0.45) * 4;
    const change = Math.round(base * changePct / 100 * 100) / 100;
    const price = Math.round((base + change) * 100) / 100;
    return { symbol, price, change, changePct: Math.round(changePct * 100) / 100, sparkline: demoSparkline(base) };
  });
}

// ── Drawdown curve ──────────────────────────────────────────────────────────
export function demoDrawdown(): EquityPoint[] {
  const eq = demoEquityCurve();
  let peak = eq[0].value;
  return eq.map(p => {
    if (p.value > peak) peak = p.value;
    return { t: p.t, value: peak > 0 ? ((p.value - peak) / peak) * 100 : 0 };
  });
}

// ── Win/Loss data ───────────────────────────────────────────────────────────
export const demoWinLoss = { won: 0, lost: 0 };
