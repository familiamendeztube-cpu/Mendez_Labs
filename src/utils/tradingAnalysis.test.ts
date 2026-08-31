// tradingAnalysis.test.ts — Pure analysis engine tests
// Run with: npx tsx src/utils/tradingAnalysis.test.ts
import assert from 'node:assert';
import {
  DEFAULT_UNIVERSE, COMMISSION_PER_TRADE, SLIPPAGE_BPS, PLANNED_EQUITY,
  DAILY_STOP_PCT, DRAWDOWN_PAUSE_PCT,
  sma, ema, rsi14, atr14, atrPercent, volumeZScore, realizedVolatility,
  momentum, relativeStrength, gapPercent, spreadPercent, distanceFromLevel,
  extractFeatures,
  isTrendContinuationEligible, isPullbackEligible, isBreakoutEligible,
  calibrateWinRate, pooledCalibration, brierScoreCalc,
  computeEV, estimatedCosts, quarterKelly, sizeTrade,
  pearsonCorrelation, filterCorrelatedCandidates,
  checkCandidateGates, generateCandidate, computeTradingPerformance,
  type OHLCV, type Quote, type SymbolFeatures, type HistoricalOutcome,
  type TradeCandidate,
} from './tradingAnalysis';

let passed = 0;
function ok(cond: boolean, msg: string) { assert(cond, msg); passed++; }

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBars(n: number, startClose = 100): OHLCV[] {
  return Array.from({ length: n }, (_, i) => {
    const c = startClose + i * 0.5;
    return { timestamp: `2024-01-${String(i + 1).padStart(2, '0')}`, open: c - 0.1, high: c + 1, low: c - 1, close: c, volume: 1000000 + i * 1000 };
  });
}

function makeFeatures(overrides: Partial<SymbolFeatures> = {}): SymbolFeatures {
  return {
    symbol: 'SPY', momentum5: 0.02, momentum20: 0.05,
    ema20: 450, ema50: 440, trendEma: 10,
    rsi14: 55, atr14: 5, atrPct: 0.011,
    volumeZ: 1.2, realizedVol: 0.15, gap: 0.001,
    relStrength: 1.1, spreadPct: 0.001,
    ...overrides,
  };
}

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return { symbol: 'SPY', price: 450, bid: 449.95, ask: 450.05, volume: 5000000, timestamp: new Date().toISOString(), ...overrides };
}

function makeOutcomes(n: number, winRatio = 0.6, strategy: string = 'trend_continuation'): HistoricalOutcome[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    strategyFamily: strategy as any,
    symbol: 'SPY',
    entryPrice: 450,
    exitPrice: i < n * winRatio ? 455 : 445,
    won: i < n * winRatio,
    returnPct: i < n * winRatio ? 0.011 : -0.011,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Constants
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(DEFAULT_UNIVERSE.length === 11, 'DEFAULT_UNIVERSE has 11 symbols');
  ok(DEFAULT_UNIVERSE.includes('SPY'), 'SPY in universe');
  ok(DEFAULT_UNIVERSE.includes('TSLA'), 'TSLA in universe');
  ok(COMMISSION_PER_TRADE === 0, 'Zero commission');
  ok(SLIPPAGE_BPS === 10, 'Slippage 10 bps');
  ok(PLANNED_EQUITY === 100, 'Planned equity $100');
  ok(DAILY_STOP_PCT === 0.05, 'Daily stop 5%');
  ok(DRAWDOWN_PAUSE_PCT === 0.10, 'Drawdown pause 10%');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: SMA
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(sma([], 5) === null, 'sma: empty array → null');
  ok(sma([1, 2, 3], 5) === null, 'sma: not enough data → null');
  ok(sma([1, 2, 3, 4, 5], 5) === 3, 'sma: [1..5] period 5 = 3');
  ok(sma([10, 20, 30], 2) === 25, 'sma: last 2 of [10,20,30] = 25');
  ok(sma([5, 5, 5, 5], 4) === 5, 'sma: constant → same');
  ok(sma([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3) === 9, 'sma: last 3 of 1..10 = 9');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: EMA
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(ema([], 5) === null, 'ema: empty → null');
  ok(ema([1, 2], 5) === null, 'ema: insufficient → null');
  const e5 = ema([1, 2, 3, 4, 5], 5);
  ok(e5 !== null, 'ema: 5 values period 5 → not null');
  ok(e5 === 3, 'ema: [1..5] period 5, no extra = sma seed = 3');
  const e5b = ema([1, 2, 3, 4, 5, 6], 5);
  ok(e5b !== null && e5b > 3, 'ema: with one extra value > seed');
  ok(typeof ema([10, 10, 10, 10, 10, 10], 5) === 'number', 'ema: constant series → number');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: RSI14
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(rsi14([]) === null, 'rsi14: empty → null');
  ok(rsi14(Array(14).fill(50)) === null, 'rsi14: 14 values → null (need 15+)');
  const rising = Array.from({ length: 20 }, (_, i) => 100 + i);
  const r = rsi14(rising);
  ok(r !== null && r === 100, 'rsi14: all up → 100');
  const falling = Array.from({ length: 20 }, (_, i) => 100 - i);
  const rf = rsi14(falling);
  ok(rf !== null && rf === 0, 'rsi14: all down → 0');
  const flat = Array(20).fill(50);
  ok(rsi14(flat) !== null, 'rsi14: flat → not null');
  const mixed = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5);
  const rm = rsi14(mixed);
  ok(rm !== null && rm > 0 && rm < 100, 'rsi14: mixed → between 0 and 100');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: ATR14
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(atr14([]) === null, 'atr14: empty → null');
  ok(atr14(makeBars(14)) === null, 'atr14: 14 bars → null');
  const a = atr14(makeBars(20));
  ok(a !== null && a > 0, 'atr14: 20 bars → positive');
  const flat = Array.from({ length: 20 }, (_, i) => ({
    timestamp: '', open: 100, high: 100, low: 100, close: 100, volume: 1000,
  }));
  ok(atr14(flat) === 0, 'atr14: flat bars → 0');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: atrPercent
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(atrPercent(null, 100) === null, 'atrPercent: null atr → null');
  ok(atrPercent(5, 0) === null, 'atrPercent: zero price → null');
  ok(atrPercent(5, 100) === 0.05, 'atrPercent: 5/100 = 0.05');
  ok(atrPercent(2, 200) === 0.01, 'atrPercent: 2/200 = 0.01');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: volumeZScore
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(volumeZScore([], 20) === null, 'volumeZ: empty → null');
  ok(volumeZScore(Array(20).fill(1000), 20) === null, 'volumeZ: exactly period → null (needs period+1)');
  const vols = Array(21).fill(1000);
  ok(volumeZScore(vols) === 0, 'volumeZ: constant → 0');
  const vols2 = Array.from({ length: 20 }, (_, i) => 1000 + i * 10);
  vols2.push(3000);
  const z = volumeZScore(vols2);
  ok(z !== null && z > 0, 'volumeZ: spike → positive z');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: realizedVolatility
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(realizedVolatility([]) === null, 'realVol: empty → null');
  ok(realizedVolatility(Array(20).fill(100)) === null, 'realVol: 20 values → null (needs 21)');
  const flat = Array(25).fill(100);
  ok(realizedVolatility(flat) === 0, 'realVol: flat → 0');
  const rising = Array.from({ length: 25 }, (_, i) => 100 + i);
  const rv = realizedVolatility(rising);
  ok(rv !== null && rv > 0, 'realVol: trending → positive');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: momentum
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(momentum([], 5) === null, 'momentum: empty → null');
  ok(momentum([100], 5) === null, 'momentum: 1 value → null');
  ok(Math.abs(momentum([100, 110], 1)! - 0.1) < 1e-10, 'momentum: 100→110 period 1 ≈ 0.1');
  ok(momentum([0, 100, 50], 2) === null, 'momentum: base=0 → null');
  ok(Math.abs(momentum([200, 100, 150, 200], 3)!) < 1e-10, 'momentum: 200→200 period 3 ≈ 0');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: relativeStrength
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(relativeStrength([], []) === null, 'relStr: empty → null');
  ok(relativeStrength([100], [100]) === null, 'relStr: 1 val → null');
  ok(Math.abs(relativeStrength([100, 110], [100, 105])! - 2) < 1e-10, 'relStr: 10%/5% ≈ 2');
  ok(relativeStrength([100, 110], [100, 100]) === null, 'relStr: bench 0% → null');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: gapPercent, spreadPercent, distanceFromLevel
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(gapPercent(0, 100) === null, 'gap: prevClose 0 → null');
  ok(Math.abs(gapPercent(100, 102)! - 0.02) < 1e-10, 'gap: 100→102 ≈ 0.02');
  ok(Math.abs(gapPercent(100, 98)! - (-0.02)) < 1e-10, 'gap: 100→98 ≈ -0.02');

  ok(spreadPercent(99, 101, 0) === null, 'spread: mid 0 → null');
  ok(Math.abs(spreadPercent(99, 101, 100)! - 0.02) < 1e-10, 'spread: 2/100 ≈ 0.02');

  ok(distanceFromLevel(110, 0) === null, 'distance: level 0 → null');
  ok(Math.abs(distanceFromLevel(110, 100)! - 0.1) < 1e-10, 'distance: 110 from 100 ≈ 0.1');
  ok(Math.abs(distanceFromLevel(90, 100)! - (-0.1)) < 1e-10, 'distance: 90 from 100 ≈ -0.1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: extractFeatures
// ═══════════════════════════════════════════════════════════════════════════════

{
  const bars = makeBars(60);
  const feat = extractFeatures('SPY', bars);
  ok(feat.symbol === 'SPY', 'extractFeatures: symbol set');
  ok(feat.ema20 !== null, 'extractFeatures: ema20 computed');
  ok(feat.ema50 !== null, 'extractFeatures: ema50 computed');
  ok(feat.rsi14 !== null, 'extractFeatures: rsi14 computed');
  ok(feat.atr14 !== null, 'extractFeatures: atr14 computed');
  ok(feat.atrPct !== null, 'extractFeatures: atrPct computed');
  ok(feat.volumeZ !== null, 'extractFeatures: volumeZ computed');
  ok(feat.realizedVol !== null, 'extractFeatures: realizedVol computed');
  ok(feat.momentum5 !== null, 'extractFeatures: momentum5 computed');
  ok(feat.momentum20 !== null, 'extractFeatures: momentum20 computed');
  ok(feat.gap !== null, 'extractFeatures: gap computed');
  ok(feat.spreadPct === null, 'extractFeatures: spreadPct always null');
  ok(feat.relStrength === null, 'extractFeatures: relStrength null without benchmark');

  const feat2 = extractFeatures('AAPL', bars, bars.map(b => b.close));
  ok(feat2.relStrength !== null, 'extractFeatures: relStrength with benchmark');

  const shortBars = makeBars(5);
  const sf = extractFeatures('X', shortBars);
  ok(sf.ema20 === null, 'extractFeatures: short data → ema20 null');
  ok(sf.rsi14 === null, 'extractFeatures: short data → rsi14 null');
  ok(sf.atr14 === null, 'extractFeatures: short data → atr14 null');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: Strategy eligibility
// ═══════════════════════════════════════════════════════════════════════════════

{
  // Trend continuation: ema20>ema50, 40<=rsi<=70, momentum20>0, volumeZ>0
  ok(isTrendContinuationEligible(makeFeatures()), 'trend: eligible with defaults');
  ok(!isTrendContinuationEligible(makeFeatures({ ema20: 430, ema50: 440 })), 'trend: ema20<ema50 → false');
  ok(!isTrendContinuationEligible(makeFeatures({ rsi14: 75 })), 'trend: rsi>70 → false');
  ok(!isTrendContinuationEligible(makeFeatures({ rsi14: 35 })), 'trend: rsi<40 → false');
  ok(!isTrendContinuationEligible(makeFeatures({ momentum20: -0.01 })), 'trend: neg momentum20 → false');
  ok(!isTrendContinuationEligible(makeFeatures({ volumeZ: -0.5 })), 'trend: neg volumeZ → false');
  ok(!isTrendContinuationEligible(makeFeatures({ ema20: null })), 'trend: null ema20 → false');
  ok(isTrendContinuationEligible(makeFeatures({ rsi14: 40 })), 'trend: rsi=40 → boundary ok');
  ok(isTrendContinuationEligible(makeFeatures({ rsi14: 70 })), 'trend: rsi=70 → boundary ok');

  // Pullback: ema20>ema50, 30<=rsi<=50, momentum5<0, momentum20>0
  const pullbackBase = makeFeatures({ rsi14: 40, momentum5: -0.01 });
  ok(isPullbackEligible(pullbackBase), 'pullback: eligible');
  ok(!isPullbackEligible(makeFeatures({ rsi14: 40, momentum5: 0.01 })), 'pullback: pos momentum5 → false');
  ok(!isPullbackEligible(makeFeatures({ rsi14: 55, momentum5: -0.01 })), 'pullback: rsi>50 → false');
  ok(!isPullbackEligible(makeFeatures({ rsi14: 25, momentum5: -0.01 })), 'pullback: rsi<30 → false');
  ok(isPullbackEligible(makeFeatures({ rsi14: 30, momentum5: -0.01 })), 'pullback: rsi=30 boundary ok');
  ok(isPullbackEligible(makeFeatures({ rsi14: 50, momentum5: -0.01 })), 'pullback: rsi=50 boundary ok');
  ok(!isPullbackEligible(makeFeatures({ rsi14: 40, momentum5: -0.01, ema20: null })), 'pullback: null feature → false');

  // Breakout: atrPct>0.02, volumeZ>1.5, |momentum5|>0.03
  const breakoutBase = makeFeatures({ atrPct: 0.03, volumeZ: 2.0, momentum5: 0.05 });
  ok(isBreakoutEligible(breakoutBase), 'breakout: eligible');
  ok(!isBreakoutEligible(makeFeatures({ atrPct: 0.01, volumeZ: 2.0, momentum5: 0.05 })), 'breakout: low atrPct → false');
  ok(!isBreakoutEligible(makeFeatures({ atrPct: 0.03, volumeZ: 1.0, momentum5: 0.05 })), 'breakout: low volumeZ → false');
  ok(!isBreakoutEligible(makeFeatures({ atrPct: 0.03, volumeZ: 2.0, momentum5: 0.02 })), 'breakout: low momentum → false');
  ok(isBreakoutEligible(makeFeatures({ atrPct: 0.03, volumeZ: 2.0, momentum5: -0.05 })), 'breakout: negative momentum ok');
  ok(!isBreakoutEligible(makeFeatures({ atrPct: null })), 'breakout: null feature → false');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 14: Calibration
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(calibrateWinRate([]) === null, 'calibrate: empty → null');
  ok(calibrateWinRate(makeOutcomes(50)) === null, 'calibrate: 50 < 100 → null');
  const cal = calibrateWinRate(makeOutcomes(100, 0.6));
  ok(cal !== null, 'calibrate: 100 → not null');
  ok(cal!.pWin === 0.6, 'calibrate: pWin = 0.6');
  ok(cal!.sampleSize === 100, 'calibrate: sampleSize = 100');
  ok(cal!.ciLow < 0.6 && cal!.ciLow > 0, 'calibrate: ciLow < pWin');
  ok(cal!.ciHigh > 0.6 && cal!.ciHigh <= 1, 'calibrate: ciHigh > pWin');

  ok(pooledCalibration([]) === null, 'pooled: empty → null');
  ok(pooledCalibration(makeOutcomes(20)) === null, 'pooled: 20 < 30 → null');
  const pc = pooledCalibration(makeOutcomes(30, 0.5));
  ok(pc !== null && pc.pWin === 0.5, 'pooled: 30 → pWin = 0.5');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 15: Brier score
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(brierScoreCalc([]) === null, 'brier: empty → null');
  ok(brierScoreCalc(Array(29).fill({ predicted: 0.5, actual: 1 })) === null, 'brier: 29 < 30 → null');
  const perfect = Array(30).fill(null).map((_, i) => ({ predicted: i < 15 ? 1 : 0, actual: (i < 15 ? 1 : 0) as 0 | 1 }));
  ok(brierScoreCalc(perfect) === 0, 'brier: perfect predictions → 0');
  const worst = Array(30).fill(null).map((_, i) => ({ predicted: i < 15 ? 0 : 1, actual: (i < 15 ? 1 : 0) as 0 | 1 }));
  ok(brierScoreCalc(worst) === 1, 'brier: worst predictions → 1');
  const mid = Array(30).fill({ predicted: 0.5, actual: 1 as 0 | 1 });
  const bm = brierScoreCalc(mid);
  ok(bm !== null && Math.abs(bm - 0.25) < 0.001, 'brier: all 0.5 vs 1 → 0.25');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 16: EV and costs
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(computeEV(0.6, 100, 50, 5) === 0.6 * 100 - 0.4 * 50 - 5, 'EV: formula correct');
  ok(computeEV(1, 100, 50, 0) === 100, 'EV: certain win');
  ok(computeEV(0, 100, 50, 0) === -50, 'EV: certain loss');
  ok(computeEV(0.5, 100, 100, 0) === 0, 'EV: fair game = 0');

  ok(estimatedCosts(100, 10) === 0 + 100 * 10 * (10 / 10000), 'costs: formula correct');
  ok(estimatedCosts(0, 10) === 0, 'costs: zero price → 0');
  ok(estimatedCosts(100, 0) === 0, 'costs: zero shares → 0');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 17: Kelly sizing
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(quarterKelly(0.5, 100, 0) === 0, 'kelly: avgLoss=0 → 0');
  const k = quarterKelly(0.6, 100, 50);
  ok(k > 0 && k <= 1, 'kelly: positive edge → positive fraction');
  ok(quarterKelly(0.3, 100, 100) === 0, 'kelly: negative edge → 0');
  const k2 = quarterKelly(0.99, 1000, 1);
  ok(k2 <= 1, 'kelly: capped at 1');

  const s1 = sizeTrade(1000, 0.005);
  ok(s1.fraction === 0.005 && s1.cappedBy === 'kelly', 'size: small kelly → kelly');
  const s2 = sizeTrade(1000, 0.015);
  ok(s2.fraction === 0.01 && s2.cappedBy === 'risk_per_cap', 'size: medium → risk cap');
  const s3 = sizeTrade(1000, 0.05, 0.03, 0.02);
  ok(s3.fraction === 0.02 && s3.cappedBy === 'abs_cap', 'size: large → abs cap');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 18: Pearson correlation
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(pearsonCorrelation([], []) === null, 'pearson: empty → null');
  ok(pearsonCorrelation([1, 2, 3], [1, 2, 3]) === null, 'pearson: n<5 → null');
  const xs = [1, 2, 3, 4, 5];
  const ys = [2, 4, 6, 8, 10];
  ok(Math.abs(pearsonCorrelation(xs, ys)! - 1) < 0.0001, 'pearson: perfect positive = 1');
  ok(Math.abs(pearsonCorrelation(xs, ys.map(y => -y))! + 1) < 0.0001, 'pearson: perfect negative = -1');
  ok(pearsonCorrelation([1, 1, 1, 1, 1], [2, 4, 6, 8, 10]) === null, 'pearson: constant x → null (zero denom)');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 19: Correlation filter
// ═══════════════════════════════════════════════════════════════════════════════

{
  const c1: TradeCandidate = { ...makeCandidate('SPY', 0.9), qualified: true };
  const c2: TradeCandidate = { ...makeCandidate('QQQ', 0.8), qualified: true };
  const c3: TradeCandidate = { ...makeCandidate('TSLA', 0.7), qualified: true };
  const closes1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const closes2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // perfectly correlated with 1
  const closes3 = [5, 7, 3, 8, 4, 6, 9, 2, 7, 5]; // low correlation
  const cmap = new Map([['SPY', closes1], ['QQQ', closes2], ['TSLA', closes3]]);
  const filtered = filterCorrelatedCandidates([c1, c2, c3], cmap, 0.7);
  ok(filtered.length === 2, 'corrFilter: drops 1 correlated');
  ok(filtered[0].symbol === 'SPY', 'corrFilter: keeps highest score first');
  ok(filtered.some(f => f.symbol === 'TSLA'), 'corrFilter: keeps uncorrelated');
  ok(!filtered.some(f => f.symbol === 'QQQ'), 'corrFilter: drops QQQ (correlated with SPY)');

  const empty = filterCorrelatedCandidates([], new Map(), 0.7);
  ok(empty.length === 0, 'corrFilter: empty input → empty output');
}

function makeCandidate(sym: string, score: number): TradeCandidate {
  return {
    symbol: sym, strategy: 'trend_continuation', direction: 'long',
    entryZone: 100, stop: 95, target: 110, riskReward: 2,
    pWin: 0.6, ciLow: 0.5, ciHigh: 0.7, evAfterCosts: 1,
    modelScore: score, suggestedRiskDollars: 5, reason: 'test',
    excludeReason: null, qualified: true, qualificationChecks: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 20: Qualification gates
// ═══════════════════════════════════════════════════════════════════════════════

{
  const candidate = makeCandidate('SPY', 0.5);
  candidate.evAfterCosts = 0.5;
  candidate.riskReward = 2.0;

  const allPass = checkCandidateGates(candidate, {
    barCount: 250, eligibleObs: 150, oosObs: 50,
    brier: 0.2, quoteAgeMs: 5000, spreadPct: 0.001,
    isMarketOpen: true, equity: 100, dailyPL: 0,
    peakEquity: 100, openPositions: 0, positionLimit: 3,
  });
  ok(allPass.qualified === true, 'gates: all pass → qualified');
  ok(allPass.checks.length === 14, 'gates: 14 checks');
  ok(allPass.checks.every(c => c.passed), 'gates: all checks passed');

  // Test individual gate failures
  const lowBars = checkCandidateGates(candidate, {
    barCount: 50, eligibleObs: 150, oosObs: 50, brier: 0.2,
    quoteAgeMs: 5000, spreadPct: 0.001, isMarketOpen: true,
    equity: 100, dailyPL: 0, peakEquity: 100, openPositions: 0, positionLimit: 3,
  });
  ok(!lowBars.qualified, 'gates: low bars → not qualified');
  ok(!lowBars.checks.find(c => c.name === 'enough_history')!.passed, 'gates: enough_history fails');

  const marketClosed = checkCandidateGates(candidate, {
    barCount: 250, eligibleObs: 150, oosObs: 50, brier: 0.2,
    quoteAgeMs: 5000, spreadPct: 0.001, isMarketOpen: false,
    equity: 100, dailyPL: 0, peakEquity: 100, openPositions: 0, positionLimit: 3,
  });
  ok(!marketClosed.checks.find(c => c.name === 'market_hours')!.passed, 'gates: market closed fails');

  const dailyStop = checkCandidateGates(candidate, {
    barCount: 250, eligibleObs: 150, oosObs: 50, brier: 0.2,
    quoteAgeMs: 5000, spreadPct: 0.001, isMarketOpen: true,
    equity: 100, dailyPL: -10, peakEquity: 100, openPositions: 0, positionLimit: 3,
  });
  ok(!dailyStop.checks.find(c => c.name === 'daily_loss_stop')!.passed, 'gates: daily stop triggers');

  const drawdown = checkCandidateGates(candidate, {
    barCount: 250, eligibleObs: 150, oosObs: 50, brier: 0.2,
    quoteAgeMs: 5000, spreadPct: 0.001, isMarketOpen: true,
    equity: 85, dailyPL: 0, peakEquity: 100, openPositions: 0, positionLimit: 3,
  });
  ok(!drawdown.checks.find(c => c.name === 'drawdown_pause')!.passed, 'gates: drawdown pause triggers');

  const posLimit = checkCandidateGates(candidate, {
    barCount: 250, eligibleObs: 150, oosObs: 50, brier: 0.2,
    quoteAgeMs: 5000, spreadPct: 0.001, isMarketOpen: true,
    equity: 100, dailyPL: 0, peakEquity: 100, openPositions: 3, positionLimit: 3,
  });
  ok(!posLimit.checks.find(c => c.name === 'position_limit')!.passed, 'gates: position limit reached');

  const negEV = { ...candidate, evAfterCosts: -1 };
  const negRes = checkCandidateGates(negEV, {
    barCount: 250, eligibleObs: 150, oosObs: 50, brier: 0.2,
    quoteAgeMs: 5000, spreadPct: 0.001, isMarketOpen: true,
    equity: 100, dailyPL: 0, peakEquity: 100, openPositions: 0, positionLimit: 3,
  });
  ok(!negRes.checks.find(c => c.name === 'positive_ev')!.passed, 'gates: negative EV fails');

  const badBrier = checkCandidateGates(candidate, {
    barCount: 250, eligibleObs: 150, oosObs: 50, brier: 0.3,
    quoteAgeMs: 5000, spreadPct: 0.001, isMarketOpen: true,
    equity: 100, dailyPL: 0, peakEquity: 100, openPositions: 0, positionLimit: 3,
  });
  ok(!badBrier.checks.find(c => c.name === 'model_calibrated')!.passed, 'gates: bad brier fails');

  const nullBrier = checkCandidateGates(candidate, {
    barCount: 250, eligibleObs: 150, oosObs: 50, brier: null,
    quoteAgeMs: 5000, spreadPct: 0.001, isMarketOpen: true,
    equity: 100, dailyPL: 0, peakEquity: 100, openPositions: 0, positionLimit: 3,
  });
  ok(!nullBrier.checks.find(c => c.name === 'model_calibrated')!.passed, 'gates: null brier fails');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 21: generateCandidate
// ═══════════════════════════════════════════════════════════════════════════════

{
  // No strategy eligible → null
  const noEligible = makeFeatures({ ema20: 430, ema50: 440, rsi14: 80, atrPct: 0.01, volumeZ: 0.5, momentum5: 0.01 });
  const res = generateCandidate('SPY', noEligible, makeQuote(), []);
  ok(res === null, 'generate: no eligible strategy → null');

  // Trend eligible → returns candidate
  const trendF = makeFeatures();
  const tc = generateCandidate('SPY', trendF, makeQuote(), makeOutcomes(50), { isMarketOpen: true });
  ok(tc !== null, 'generate: trend eligible → not null');
  ok(tc!.strategy === 'trend_continuation', 'generate: correct strategy');
  ok(tc!.direction === 'long', 'generate: long direction');
  ok(tc!.symbol === 'SPY', 'generate: correct symbol');
  ok(tc!.entryZone === 450, 'generate: entry = quote price');
  ok(tc!.stop < tc!.entryZone, 'generate: stop below entry for long');
  ok(tc!.target > tc!.entryZone, 'generate: target above entry for long');
  ok(tc!.riskReward > 0, 'generate: positive risk-reward');
  ok(tc!.qualificationChecks.length === 14, 'generate: 14 gate checks');

  // Breakout eligible → short direction when momentum5 < 0
  const breakF = makeFeatures({ atrPct: 0.03, volumeZ: 2.0, momentum5: -0.05, ema20: 430, ema50: 440, rsi14: 80 });
  const bc = generateCandidate('TSLA', breakF, makeQuote({ symbol: 'TSLA' }), makeOutcomes(50, 0.5, 'volatility_breakout'));
  ok(bc !== null, 'generate: breakout eligible → not null');
  ok(bc!.strategy === 'volatility_breakout', 'generate: volatility breakout strategy');
  ok(bc!.direction === 'short', 'generate: short on negative momentum');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 22: computeTradingPerformance
// ═══════════════════════════════════════════════════════════════════════════════

{
  // Empty
  const empty = computeTradingPerformance([]);
  ok(empty.wins === 0, 'perf: empty → 0 wins');
  ok(empty.losses === 0, 'perf: empty → 0 losses');
  ok(empty.winRate === null, 'perf: empty → null winRate');
  ok(empty.roi === null, 'perf: empty → null roi');
  ok(empty.sharpe === null, 'perf: empty → null sharpe');
  ok(empty.sortino === null, 'perf: empty → null sortino');
  ok(empty.brier === null, 'perf: empty → null brier');
  ok(empty.sampleSize === 0, 'perf: empty → sampleSize 0');
  ok(empty.pending === 0, 'perf: empty → 0 pending');

  // Single win
  const oneWin = computeTradingPerformance([
    { entryPrice: 100, exitPrice: 110, direction: 'long', returnPct: 0.1, pnl: 10, won: true, settled: true },
  ]);
  ok(oneWin.wins === 1, 'perf: 1 win');
  ok(oneWin.winRate === 1, 'perf: 100% win rate');
  ok(oneWin.netPL === 10, 'perf: net PL = 10');
  ok(oneWin.avgWin === 10, 'perf: avg win = 10');
  ok(oneWin.avgLoss === null, 'perf: no losses → null avgLoss');
  ok(oneWin.maxDrawdown === 0, 'perf: 1 win → 0 drawdown');

  // Pending trades excluded
  const withPending = computeTradingPerformance([
    { entryPrice: 100, exitPrice: 110, direction: 'long', returnPct: 0.1, pnl: 10, won: true, settled: true },
    { entryPrice: 100, exitPrice: 100, direction: 'long', returnPct: 0, pnl: 0, won: false, settled: false },
  ]);
  ok(withPending.pending === 1, 'perf: 1 pending');
  ok(withPending.sampleSize === 1, 'perf: sampleSize excludes pending');

  // Mixed trades
  const mixed = computeTradingPerformance([
    { entryPrice: 100, exitPrice: 110, direction: 'long', returnPct: 0.1, pnl: 10, won: true, settled: true },
    { entryPrice: 100, exitPrice: 90, direction: 'long', returnPct: -0.1, pnl: -10, won: false, settled: true },
    { entryPrice: 100, exitPrice: 105, direction: 'long', returnPct: 0.05, pnl: 5, won: true, settled: true },
    { entryPrice: 100, exitPrice: 95, direction: 'long', returnPct: -0.05, pnl: -5, won: false, settled: true },
  ]);
  ok(mixed.wins === 2, 'perf: 2 wins');
  ok(mixed.losses === 2, 'perf: 2 losses');
  ok(mixed.winRate === 0.5, 'perf: 50% win rate');
  ok(mixed.netPL === 0, 'perf: breakeven net PL');
  ok(mixed.avgWin === 7.5, 'perf: avg win = (10+5)/2');
  ok(mixed.avgLoss === 7.5, 'perf: avg loss = (10+5)/2');
  ok(mixed.payoffRatio === 1, 'perf: payoff ratio = 1');

  // Sharpe/Sortino need 10+ trades
  ok(mixed.sharpe === null, 'perf: <10 trades → null sharpe');
  const manyTrades = Array.from({ length: 20 }, (_, i) => ({
    entryPrice: 100, exitPrice: i % 2 === 0 ? 105 : 97,
    direction: 'long' as const, returnPct: i % 2 === 0 ? 0.05 : -0.03,
    pnl: i % 2 === 0 ? 5 : -3, won: i % 2 === 0, settled: true,
  }));
  const mPerf = computeTradingPerformance(manyTrades);
  ok(mPerf.sharpe !== null, 'perf: 20 trades → sharpe computed');
  ok(mPerf.sortino !== null, 'perf: 20 trades → sortino computed');
  ok(mPerf.sampleSize === 20, 'perf: sampleSize = 20');

  // Breakeven trade
  const beTradePerf = computeTradingPerformance([
    { entryPrice: 100, exitPrice: 100, direction: 'long', returnPct: 0, pnl: 0, won: false, settled: true },
  ]);
  ok(beTradePerf.breakeven === 1, 'perf: breakeven counted');

  // Max drawdown
  const ddTrades = computeTradingPerformance([
    { entryPrice: 100, exitPrice: 110, direction: 'long', returnPct: 0.1, pnl: 10, won: true, settled: true },
    { entryPrice: 100, exitPrice: 85, direction: 'long', returnPct: -0.15, pnl: -15, won: false, settled: true },
    { entryPrice: 100, exitPrice: 80, direction: 'long', returnPct: -0.2, pnl: -20, won: false, settled: true },
  ]);
  ok(ddTrades.maxDrawdown === 35, 'perf: max drawdown = 35 (peak 10, trough -25)');

  // Longest losing streak
  ok(ddTrades.longestLosingStreak === 2, 'perf: longest losing streak = 2');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 23: Null propagation comprehensive
// ═══════════════════════════════════════════════════════════════════════════════

{
  ok(sma([], 1) === null, 'null: sma empty');
  ok(ema([], 1) === null, 'null: ema empty');
  ok(rsi14([]) === null, 'null: rsi empty');
  ok(atr14([]) === null, 'null: atr empty');
  ok(atrPercent(null, 50) === null, 'null: atrPct null atr');
  ok(volumeZScore([]) === null, 'null: volumeZ empty');
  ok(realizedVolatility([]) === null, 'null: realVol empty');
  ok(momentum([], 1) === null, 'null: momentum empty');
  ok(relativeStrength([], []) === null, 'null: relStr empty');
  ok(gapPercent(0, 50) === null, 'null: gap zero prev');
  ok(spreadPercent(1, 2, 0) === null, 'null: spread zero mid');
  ok(distanceFromLevel(50, 0) === null, 'null: distance zero level');
  ok(pearsonCorrelation([], []) === null, 'null: pearson empty');
  ok(calibrateWinRate([]) === null, 'null: calibrate empty');
  ok(pooledCalibration([]) === null, 'null: pooled empty');
  ok(brierScoreCalc([]) === null, 'null: brier empty');
}

console.log(`✓ tradingAnalysis: ${passed} assertions passed`);
