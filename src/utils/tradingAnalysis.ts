// ─── tradingAnalysis.ts ── Pure, deterministic trading analysis engine ───────
// No React, no browser APIs, no side effects. Every function is pure.

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

export const DEFAULT_UNIVERSE = [
  'SPY','QQQ','IWM','DIA','AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA'] as const;

export const COMMISSION_PER_TRADE = 0;
export const SLIPPAGE_BPS = 10;
export const PLANNED_EQUITY = 100;
export const DAILY_STOP_PCT = 0.05;
export const DRAWDOWN_PAUSE_PCT = 0.10;

// ─── CORE TYPES ──────────────────────────────────────────────────────────────

export type OHLCV = {
  timestamp: string; open: number; high: number; low: number; close: number; volume: number;
};
export type Quote = {
  symbol: string; price: number; bid: number; ask: number; volume: number; timestamp: string;
};
export type StrategyFamily = 'trend_continuation' | 'controlled_pullback' | 'volatility_breakout';
export type SignalDirection = 'long' | 'short';

export interface SymbolFeatures {
  symbol: string; momentum5: number | null; momentum20: number | null;
  ema20: number | null; ema50: number | null; trendEma: number | null;
  rsi14: number | null; atr14: number | null; atrPct: number | null;
  volumeZ: number | null; realizedVol: number | null; gap: number | null;
  relStrength: number | null; spreadPct: number | null;
}

export interface QualificationCheck { name: string; passed: boolean; detail: string; }
export interface TradeCandidate {
  symbol: string; strategy: StrategyFamily; direction: SignalDirection;
  entryZone: number; stop: number; target: number; riskReward: number;
  pWin: number; ciLow: number; ciHigh: number; evAfterCosts: number;
  modelScore: number; suggestedRiskDollars: number; reason: string;
  excludeReason: string | null; qualified: boolean;
  qualificationChecks: QualificationCheck[];
}

export interface HistoricalOutcome {
  date: string; strategyFamily: StrategyFamily; symbol: string;
  entryPrice: number; exitPrice: number; won: boolean; returnPct: number;
}

export interface CalibrationResult { pWin: number; ciLow: number; ciHigh: number; sampleSize: number; }

export interface TradingPerformance {
  wins: number; losses: number; breakeven: number; pending: number;
  winRate: number | null; roi: number | null; netPL: number | null;
  avgWin: number | null; avgLoss: number | null; payoffRatio: number | null;
  profitFactor: number | null; expectancy: number | null;
  maxDrawdown: number | null; longestLosingStreak: number | null;
  sharpe: number | null; sortino: number | null; brier: number | null;
  logLoss: number | null; calError: number | null; avgSlippage: number | null;
  sampleSize: number;
}

// ─── FEATURE COMPUTATIONS ────────────────────────────────────────────────────

export function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

export function ema(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let value = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < closes.length; i++) {
    value = closes[i] * k + value * (1 - k);
  }
  return value;
}

export function rsi14(closes: number[]): number | null {
  if (closes.length < 15) return null;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= 14; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss += -d;
  }
  avgGain /= 14; avgLoss /= 14;
  for (let i = 15; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * 13 + (d > 0 ? d : 0)) / 14;
    avgLoss = (avgLoss * 13 + (d < 0 ? -d : 0)) / 14;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function atr14(bars: OHLCV[]): number | null {
  if (bars.length < 15) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const h = bars[i].high, l = bars[i].low, pc = bars[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let atr = trs.slice(0, 14).reduce((s, v) => s + v, 0) / 14;
  for (let i = 14; i < trs.length; i++) {
    atr = (atr * 13 + trs[i]) / 14;
  }
  return atr;
}

export function atrPercent(atr: number | null, price: number): number | null {
  if (atr === null || price === 0) return null;
  return atr / price;
}

export function volumeZScore(volumes: number[], period = 20): number | null {
  if (volumes.length < period + 1) return null;
  const window = volumes.slice(-(period + 1), -1);
  const mean = window.reduce((s, v) => s + v, 0) / period;
  const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (volumes[volumes.length - 1] - mean) / std;
}

export function realizedVolatility(closes: number[], period = 20): number | null {
  if (closes.length < period + 1) return null;
  const logReturns: number[] = [];
  const start = closes.length - period - 1;
  for (let i = start + 1; i < closes.length; i++) {
    if (closes[i - 1] <= 0) return null;
    logReturns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = logReturns.reduce((s, v) => s + v, 0) / logReturns.length;
  const variance = logReturns.reduce((s, v) => s + (v - mean) ** 2, 0) / (logReturns.length - 1);
  return Math.sqrt(variance * 252);
}

export function momentum(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  const base = closes[closes.length - 1 - period];
  if (base === 0) return null;
  return closes[closes.length - 1] / base - 1;
}

export function relativeStrength(symbolCloses: number[], benchmarkCloses: number[]): number | null {
  const len = Math.min(symbolCloses.length, benchmarkCloses.length);
  if (len < 2) return null;
  const sRet = symbolCloses[len - 1] / symbolCloses[0] - 1;
  const bRet = benchmarkCloses[len - 1] / benchmarkCloses[0] - 1;
  if (bRet === 0) return null;
  return sRet / bRet;
}

export function gapPercent(prevClose: number, open: number): number | null {
  if (prevClose === 0) return null;
  return (open - prevClose) / prevClose;
}

export function spreadPercent(bid: number, ask: number, mid: number): number | null {
  if (mid === 0) return null;
  return (ask - bid) / mid;
}

export function distanceFromLevel(price: number, level: number): number | null {
  if (level === 0) return null;
  return (price - level) / level;
}

// ─── FEATURE EXTRACTION ─────────────────────────────────────────────────────

export function extractFeatures(
  symbol: string, bars: OHLCV[], benchmarkCloses?: number[],
): SymbolFeatures {
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  const ema20Val = ema(closes, 20);
  const ema50Val = ema(closes, 50);
  const atr14Val = atr14(bars);
  const lastClose = closes.length > 0 ? closes[closes.length - 1] : 0;
  const prevClose = bars.length >= 2 ? bars[bars.length - 2].close : null;
  const lastOpen = bars.length >= 1 ? bars[bars.length - 1].open : null;

  return {
    symbol,
    momentum5: momentum(closes, 5),
    momentum20: momentum(closes, 20),
    ema20: ema20Val,
    ema50: ema50Val,
    trendEma: ema20Val !== null && ema50Val !== null ? ema20Val - ema50Val : null,
    rsi14: rsi14(closes),
    atr14: atr14Val,
    atrPct: atrPercent(atr14Val, lastClose),
    volumeZ: volumeZScore(volumes),
    realizedVol: realizedVolatility(closes),
    gap: prevClose !== null && lastOpen !== null ? gapPercent(prevClose, lastOpen) : null,
    relStrength: benchmarkCloses ? relativeStrength(closes, benchmarkCloses) : null,
    spreadPct: null, // populated from live quote, not bars
  };
}

// ─── STRATEGY ELIGIBILITY ────────────────────────────────────────────────────

function allNotNull(...vals: (number | null)[]): vals is number[] {
  return vals.every(v => v !== null);
}

export function isTrendContinuationEligible(f: SymbolFeatures): boolean {
  if (!allNotNull(f.ema20, f.ema50, f.rsi14, f.momentum20, f.volumeZ)) return false;
  return f.ema20! > f.ema50! && f.rsi14! >= 40 && f.rsi14! <= 70
    && f.momentum20! > 0 && f.volumeZ! > 0;
}

export function isPullbackEligible(f: SymbolFeatures): boolean {
  if (!allNotNull(f.ema20, f.ema50, f.rsi14, f.momentum5, f.momentum20)) return false;
  return f.ema20! > f.ema50! && f.rsi14! >= 30 && f.rsi14! <= 50
    && f.momentum5! < 0 && f.momentum20! > 0;
}

export function isBreakoutEligible(f: SymbolFeatures): boolean {
  if (!allNotNull(f.atrPct, f.volumeZ, f.momentum5)) return false;
  return f.atrPct! > 0.02 && f.volumeZ! > 1.5 && Math.abs(f.momentum5!) > 0.03;
}

// ─── WALK-FORWARD / CALIBRATION ──────────────────────────────────────────────

function wilsonCI(wins: number, n: number, z = 1.96): { lo: number; hi: number } {
  const p = wins / n;
  const denom = 1 + z * z / n;
  const center = p + z * z / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);
  return { lo: Math.max(0, (center - margin) / denom), hi: Math.min(1, (center + margin) / denom) };
}

export function calibrateWinRate(
  outcomes: HistoricalOutcome[], minSample = 100,
): CalibrationResult | null {
  if (outcomes.length < minSample) return null;
  const wins = outcomes.filter(o => o.won).length;
  const n = outcomes.length;
  const ci = wilsonCI(wins, n);
  return { pWin: wins / n, ciLow: ci.lo, ciHigh: ci.hi, sampleSize: n };
}

export function pooledCalibration(
  outcomes: HistoricalOutcome[], minSample = 30,
): CalibrationResult | null {
  if (outcomes.length < minSample) return null;
  const wins = outcomes.filter(o => o.won).length;
  const n = outcomes.length;
  const ci = wilsonCI(wins, n);
  return { pWin: wins / n, ciLow: ci.lo, ciHigh: ci.hi, sampleSize: n };
}

export function brierScoreCalc(
  predictions: Array<{ predicted: number; actual: 0 | 1 }>,
): number | null {
  if (predictions.length < 30) return null;
  const sum = predictions.reduce((s, p) => s + (p.predicted - p.actual) ** 2, 0);
  return sum / predictions.length;
}

// ─── EXPECTED VALUE ──────────────────────────────────────────────────────────

export function estimatedCosts(entryPrice: number, shares: number): number {
  return COMMISSION_PER_TRADE + entryPrice * shares * (SLIPPAGE_BPS / 10000);
}

export function computeEV(
  pWin: number, avgWinDollar: number, avgLossDollar: number, costs: number,
): number {
  return pWin * avgWinDollar - (1 - pWin) * avgLossDollar - costs;
}

// ─── POSITION SIZING ─────────────────────────────────────────────────────────

export function quarterKelly(pWin: number, avgWin: number, avgLoss: number): number {
  if (avgLoss === 0) return 0;
  const b = avgWin / avgLoss;
  const kelly = (pWin * b - (1 - pWin)) / b;
  return Math.max(0, Math.min(1, kelly / 4));
}

export function sizeTrade(
  equity: number, kellyFrac: number, riskPerCapPct = 0.01, absCapPct = 0.02,
): { fraction: number; cappedBy: string } {
  const riskCap = riskPerCapPct;
  const absCap = absCapPct;
  if (kellyFrac <= riskCap) return { fraction: kellyFrac, cappedBy: 'kelly' };
  if (riskCap <= absCap) return { fraction: riskCap, cappedBy: 'risk_per_cap' };
  return { fraction: absCap, cappedBy: 'abs_cap' };
}

// ─── SIGNAL GENERATION ───────────────────────────────────────────────────────

interface GenerateParams {
  equity?: number;
  bars?: OHLCV[];
  brier?: number | null;
  dailyPL?: number;
  peakEquity?: number;
  openPositions?: number;
  positionLimit?: number;
  isMarketOpen?: boolean;
}

export function generateCandidate(
  symbol: string,
  features: SymbolFeatures,
  quote: Quote,
  histOutcomes: HistoricalOutcome[],
  params: GenerateParams = {},
): TradeCandidate | null {
  // Determine strategy
  let strategy: StrategyFamily | null = null;
  let direction: SignalDirection = 'long';

  if (isTrendContinuationEligible(features)) {
    strategy = 'trend_continuation';
    direction = 'long';
  } else if (isPullbackEligible(features)) {
    strategy = 'controlled_pullback';
    direction = 'long';
  } else if (isBreakoutEligible(features)) {
    strategy = 'volatility_breakout';
    direction = features.momentum5! > 0 ? 'long' : 'short';
  }
  if (!strategy) return null;

  const entry = quote.price;
  const atrVal = features.atr14 ?? entry * 0.02;
  const stop = direction === 'long' ? entry - 1.5 * atrVal : entry + 1.5 * atrVal;
  const target = direction === 'long' ? entry + 3 * atrVal : entry - 3 * atrVal;
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  const rr = risk > 0 ? reward / risk : 0;

  // Calibration
  const stratOutcomes = histOutcomes.filter(o => o.strategyFamily === strategy);
  const cal = pooledCalibration(stratOutcomes, 30);
  const pWin = cal?.pWin ?? 0.5;
  const ciLow = cal?.ciLow ?? 0;
  const ciHigh = cal?.ciHigh ?? 1;

  // Position sizing
  const equity = params.equity ?? PLANNED_EQUITY;
  const kf = quarterKelly(pWin, reward, risk);
  const { fraction } = sizeTrade(equity, kf);
  const suggestedRisk = equity * fraction;

  // EV
  const shares = risk > 0 ? Math.floor(suggestedRisk / risk) : 0;
  const costs = estimatedCosts(entry, Math.max(shares, 1));
  const ev = computeEV(pWin, reward, risk, costs);

  const mid = (quote.bid + quote.ask) / 2;
  const sp = spreadPercent(quote.bid, quote.ask, mid);

  const modelScore = pWin * rr - (1 - pWin);

  const reason = `${strategy}: EMA trend ${features.trendEma !== null && features.trendEma > 0 ? 'up' : 'down'}, `
    + `RSI=${features.rsi14?.toFixed(1)}, RR=${rr.toFixed(2)}`;

  const candidate: TradeCandidate = {
    symbol, strategy, direction, entryZone: entry, stop, target,
    riskReward: rr, pWin, ciLow, ciHigh, evAfterCosts: ev,
    modelScore, suggestedRiskDollars: suggestedRisk,
    reason, excludeReason: null, qualified: false,
    qualificationChecks: [],
  };

  // Run gates
  const gateResult = checkCandidateGates(candidate, {
    barCount: params.bars?.length ?? 0,
    eligibleObs: stratOutcomes.length,
    oosObs: Math.floor(stratOutcomes.length * 0.3),
    brier: params.brier ?? null,
    quoteAgeMs: Date.now() - new Date(quote.timestamp).getTime(),
    spreadPct: sp,
    isMarketOpen: params.isMarketOpen ?? false,
    equity,
    dailyPL: params.dailyPL ?? 0,
    peakEquity: params.peakEquity ?? equity,
    openPositions: params.openPositions ?? 0,
    positionLimit: params.positionLimit ?? 3,
  });

  candidate.qualified = gateResult.qualified;
  candidate.qualificationChecks = gateResult.checks;
  if (!gateResult.qualified) {
    const failed = gateResult.checks.find(c => !c.passed);
    candidate.excludeReason = failed?.detail ?? 'failed qualification';
  }

  return candidate;
}

// ─── CORRELATION GUARD ───────────────────────────────────────────────────────

export function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 5) return null;
  const mx = xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const my = ys.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? null : num / denom;
}

export function filterCorrelatedCandidates(
  candidates: TradeCandidate[],
  closesMap: Map<string, number[]>,
  maxCorr = 0.70,
): TradeCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.modelScore - a.modelScore);
  const kept: TradeCandidate[] = [];
  for (const c of sorted) {
    const cCloses = closesMap.get(c.symbol);
    if (!cCloses) { kept.push(c); continue; }
    let tooCorrelated = false;
    for (const k of kept) {
      const kCloses = closesMap.get(k.symbol);
      if (!kCloses) continue;
      const corr = pearsonCorrelation(cCloses, kCloses);
      if (corr !== null && Math.abs(corr) > maxCorr) { tooCorrelated = true; break; }
    }
    if (!tooCorrelated) kept.push(c);
  }
  return kept;
}

// ─── QUALIFICATION GATES ─────────────────────────────────────────────────────

interface GateParams {
  barCount: number;
  eligibleObs: number;
  oosObs: number;
  brier: number | null;
  quoteAgeMs: number;
  spreadPct: number | null;
  isMarketOpen: boolean;
  equity: number;
  dailyPL: number;
  peakEquity: number;
  openPositions: number;
  positionLimit: number;
}

export function checkCandidateGates(
  candidate: TradeCandidate, p: GateParams,
): { qualified: boolean; checks: QualificationCheck[] } {
  const ck = (name: string, passed: boolean, detail: string): QualificationCheck =>
    ({ name, passed, detail });

  const checks: QualificationCheck[] = [
    ck('enough_history', p.barCount >= 200,
      `${p.barCount} bars (need >=200)`),
    ck('eligible_observations', p.eligibleObs >= 100,
      `${p.eligibleObs} obs (need >=100)`),
    ck('oos_observations', p.oosObs >= 30,
      `${p.oosObs} OOS obs (need >=30)`),
    ck('model_calibrated', p.brier !== null && p.brier < 0.25,
      `brier=${p.brier?.toFixed(3) ?? 'N/A'} (need <0.25)`),
    ck('fresh_quote', p.quoteAgeMs < 15000,
      `quote age ${(p.quoteAgeMs / 1000).toFixed(1)}s (need <15s)`),
    ck('liquid_spread', p.spreadPct !== null && p.spreadPct < 0.005,
      `spread=${p.spreadPct !== null ? (p.spreadPct * 100).toFixed(2) + '%' : 'N/A'} (need <0.5%)`),
    ck('positive_ev', candidate.evAfterCosts > 0,
      `EV=$${candidate.evAfterCosts.toFixed(4)}`),
    ck('risk_reward', candidate.riskReward >= 1.5,
      `RR=${candidate.riskReward.toFixed(2)} (need >=1.5)`),
    ck('not_stale_data', p.barCount > 0,
      `barCount=${p.barCount}`),
    ck('market_hours', p.isMarketOpen,
      p.isMarketOpen ? 'market open' : 'market closed'),
    ck('buying_power', p.equity > 0,
      `equity=$${p.equity.toFixed(2)}`),
    ck('daily_loss_stop', p.dailyPL > -(p.equity * DAILY_STOP_PCT),
      `daily PL=$${p.dailyPL.toFixed(2)} (limit -$${(p.equity * DAILY_STOP_PCT).toFixed(2)})`),
    ck('drawdown_pause', p.equity >= p.peakEquity * (1 - DRAWDOWN_PAUSE_PCT),
      `equity=$${p.equity.toFixed(2)} vs pause=$${(p.peakEquity * (1 - DRAWDOWN_PAUSE_PCT)).toFixed(2)}`),
    ck('position_limit', p.openPositions < p.positionLimit,
      `${p.openPositions} open (limit ${p.positionLimit})`),
  ];

  return { qualified: checks.every(c => c.passed), checks };
}

// ─── PERFORMANCE METRICS ─────────────────────────────────────────────────────

interface SettledTrade {
  entryPrice: number; exitPrice: number; direction: SignalDirection;
  returnPct: number; pnl: number; won: boolean; settled: boolean;
  predictedPWin?: number; expectedSlippage?: number; actualSlippage?: number;
}

export function computeTradingPerformance(trades: SettledTrade[]): TradingPerformance {
  const settled = trades.filter(t => t.settled);
  const pending = trades.length - settled.length;
  const wins = settled.filter(t => t.pnl > 0).length;
  const losses = settled.filter(t => t.pnl < 0).length;
  const breakeven = settled.filter(t => t.pnl === 0).length;
  const n = settled.length;

  const winTrades = settled.filter(t => t.pnl > 0);
  const lossTrades = settled.filter(t => t.pnl < 0);
  const avgWin = winTrades.length > 0
    ? winTrades.reduce((s, t) => s + t.pnl, 0) / winTrades.length : null;
  const avgLoss = lossTrades.length > 0
    ? Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.length) : null;
  const netPL = n > 0 ? settled.reduce((s, t) => s + t.pnl, 0) : null;

  const winRate = n > 0 ? wins / n : null;
  const roi = netPL !== null && PLANNED_EQUITY > 0 ? netPL / PLANNED_EQUITY : null;
  const payoffRatio = avgWin !== null && avgLoss !== null && avgLoss > 0 ? avgWin / avgLoss : null;
  const grossWin = winTrades.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : null;
  const expectancy = n > 0 && netPL !== null ? netPL / n : null;

  // Max drawdown from cumulative PnL
  let maxDD: number | null = null;
  if (n > 0) {
    let peak = 0, cum = 0; maxDD = 0;
    for (const t of settled) {
      cum += t.pnl;
      if (cum > peak) peak = cum;
      const dd = peak - cum;
      if (dd > maxDD) maxDD = dd;
    }
  }

  // Longest losing streak
  let longestLoss: number | null = null;
  if (n > 0) {
    let cur = 0; longestLoss = 0;
    for (const t of settled) {
      if (t.pnl < 0) { cur++; if (cur > longestLoss) longestLoss = cur; }
      else cur = 0;
    }
  }

  // Sharpe & Sortino (need >= 10 trades)
  let sharpe: number | null = null, sortino: number | null = null;
  if (n >= 10) {
    const returns = settled.map(t => t.returnPct);
    const mean = returns.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(returns.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
    sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : null;
    const downside = returns.filter(r => r < 0);
    if (downside.length > 1) {
      const dStd = Math.sqrt(downside.reduce((s, v) => s + v * v, 0) / downside.length);
      sortino = dStd > 0 ? (mean / dStd) * Math.sqrt(252) : null;
    }
  }

  // Brier, log-loss, calibration error
  const withPred = settled.filter(t => t.predictedPWin !== undefined);
  const brier = withPred.length >= 30
    ? withPred.reduce((s, t) => s + (t.predictedPWin! - (t.won ? 1 : 0)) ** 2, 0) / withPred.length
    : null;

  let logLoss: number | null = null;
  if (withPred.length >= 30) {
    const eps = 1e-15;
    logLoss = -withPred.reduce((s, t) => {
      const p = Math.max(eps, Math.min(1 - eps, t.predictedPWin!));
      return s + (t.won ? Math.log(p) : Math.log(1 - p));
    }, 0) / withPred.length;
  }

  const calError = withPred.length >= 30 && winRate !== null
    ? Math.abs((withPred.reduce((s, t) => s + t.predictedPWin!, 0) / withPred.length) - winRate)
    : null;

  // Average slippage
  const withSlip = settled.filter(t => t.actualSlippage !== undefined && t.expectedSlippage !== undefined);
  const avgSlippage = withSlip.length > 0
    ? withSlip.reduce((s, t) => s + (t.actualSlippage! - t.expectedSlippage!), 0) / withSlip.length
    : null;

  return {
    wins, losses, breakeven, pending, winRate, roi, netPL,
    avgWin, avgLoss, payoffRatio, profitFactor, expectancy,
    maxDrawdown: maxDD, longestLosingStreak: longestLoss,
    sharpe, sortino, brier, logLoss, calError, avgSlippage,
    sampleSize: n,
  };
}
