// V55B3 deterministic tests for Results scorecard formulas.
// Run with: npx tsx src/utils/results.test.ts

import {
  countByResult,
  winPercent,
  roi,
  netUnits,
  totalStaked,
  totalPL,
  averageOdds,
  maxDrawdown,
  longestLosingStreak,
  averageCLV,
  brierScore,
  logLoss,
  calibrationError,
  groupByDay,
  type SettledRecord,
} from './resultsCalc';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { passed++; } else { failed++; console.error(`FAIL: ${label}`); }
}

function assertClose(a: number, b: number, eps: number, label: string) {
  if (Math.abs(a - b) < eps) { passed++; } else { failed++; console.error(`FAIL: ${label} (got ${a}, expected ~${b})`); }
}

// ── Factory ─────────────────────────────────────────────────────────────────

function rec(overrides: Partial<SettledRecord> = {}): SettledRecord {
  return {
    result: 'won',
    profitLoss: 1.0,
    suggestedStake: 1.0,
    odds: -110,
    modelProbability: 0.6,
    impliedProbability: 0.52,
    edge: 0.08,
    confidenceScore: 0.85,
    startTime: '2026-08-30T18:00:00Z',
    frozenAt: '2026-08-30T15:00:00Z',
    settledAt: '2026-08-30T22:00:00Z',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Core counts
// ═══════════════════════════════════════════════════════════════════════════════

const mixed = [
  rec({ result: 'won' }),
  rec({ result: 'won' }),
  rec({ result: 'lost', profitLoss: -1 }),
  rec({ result: 'push', profitLoss: 0 }),
  rec({ result: 'pending', profitLoss: 0 }),
  rec({ result: 'void', profitLoss: 0 }),
];

const c = countByResult(mixed);
assert(c.won === 2, 'Counts: 2 won');
assert(c.lost === 1, 'Counts: 1 lost');
assert(c.push === 1, 'Counts: 1 push');
assert(c.pending === 1, 'Counts: 1 pending');
assert(c.voided === 1, 'Counts: 1 void');
assert(c.settled === 3, 'Counts: settled = W+L = 3');
assert(c.total === 6, 'Counts: total = 6');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Win % — excludes push/pending/void
// ═══════════════════════════════════════════════════════════════════════════════

assertClose(winPercent(mixed)!, 2 / 3, 0.001, 'Win%: 2W / (2W+1L) = 66.7%');
assert(winPercent([]) === null, 'Win%: empty → null');
assert(winPercent([rec({ result: 'pending' })]) === null, 'Win%: only pending → null');
assert(winPercent([rec({ result: 'push' })]) === null, 'Win%: only push → null');

// Pending never counted as loss
const pendingOnly = [rec({ result: 'won' }), rec({ result: 'pending' })];
assertClose(winPercent(pendingOnly)!, 1.0, 0.001, 'Win%: 1W+1P = 100% (pending excluded)');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: ROI
// ═══════════════════════════════════════════════════════════════════════════════

const roiData = [
  rec({ result: 'won', profitLoss: 0.91, suggestedStake: 1 }),
  rec({ result: 'lost', profitLoss: -1, suggestedStake: 1 }),
];
assertClose(roi(roiData)!, -0.045, 0.01, 'ROI: (0.91-1)/2 = -4.5%');
assert(roi([]) === null, 'ROI: empty → null');
assert(roi([rec({ result: 'pending' })]) === null, 'ROI: only pending → null');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Net units
// ═══════════════════════════════════════════════════════════════════════════════

const unitsData = [
  rec({ result: 'won', profitLoss: 2, suggestedStake: 1 }),
  rec({ result: 'lost', profitLoss: -1, suggestedStake: 1 }),
];
assertClose(netUnits(unitsData)!, 1.0, 0.001, 'Net units: (2-1)/1 = 1.0');
assert(netUnits([]) === null, 'Net units: empty → null');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Total staked — settled only
// ═══════════════════════════════════════════════════════════════════════════════

const stakedData = [
  rec({ result: 'won', suggestedStake: 5 }),
  rec({ result: 'lost', suggestedStake: 3 }),
  rec({ result: 'pending', suggestedStake: 10 }),
  rec({ result: 'push', suggestedStake: 2 }),
];
assertClose(totalStaked(stakedData), 8, 0.01, 'Staked: only W+L stakes = 5+3 = 8');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Total P/L — settled only
// ═══════════════════════════════════════════════════════════════════════════════

const plData = [
  rec({ result: 'won', profitLoss: 3 }),
  rec({ result: 'lost', profitLoss: -2 }),
  rec({ result: 'pending', profitLoss: 0 }),
];
assertClose(totalPL(plData), 1, 0.01, 'P/L: 3-2 = 1 (pending excluded)');

// Push contributes 0
const pushData = [
  rec({ result: 'won', profitLoss: 2 }),
  rec({ result: 'push', profitLoss: 0 }),
];
assertClose(totalPL(pushData), 2, 0.01, 'P/L: push returns stake (contributes 0)');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Average odds
// ═══════════════════════════════════════════════════════════════════════════════

const oddsData = [
  rec({ result: 'won', odds: -110 }),
  rec({ result: 'lost', odds: +150 }),
];
assertClose(averageOdds(oddsData)!, 20, 0.5, 'Avg odds: (-110+150)/2 = 20');
assert(averageOdds([]) === null, 'Avg odds: empty → null');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Max drawdown
// ═══════════════════════════════════════════════════════════════════════════════

const ddData = [
  rec({ result: 'won', profitLoss: 5 }),
  rec({ result: 'lost', profitLoss: -3 }),
  rec({ result: 'lost', profitLoss: -4 }),
  rec({ result: 'won', profitLoss: 2 }),
];
// cumPL: 5, 2, -2, 0 → peak=5, lowest after=(-2) → drawdown=7
assertClose(maxDrawdown(ddData)!, 7, 0.01, 'Drawdown: peak 5 to trough -2 = 7');
assert(maxDrawdown([]) === null, 'Drawdown: empty → null');

const noDD = [rec({ result: 'won', profitLoss: 1 }), rec({ result: 'won', profitLoss: 2 })];
assertClose(maxDrawdown(noDD)!, 0, 0.01, 'Drawdown: only wins → 0');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Longest losing streak
// ═══════════════════════════════════════════════════════════════════════════════

const streakData = [
  rec({ result: 'won' }),
  rec({ result: 'lost' }),
  rec({ result: 'lost' }),
  rec({ result: 'lost' }),
  rec({ result: 'won' }),
  rec({ result: 'lost' }),
];
assert(longestLosingStreak(streakData) === 3, 'Streak: 3 consecutive losses');
assert(longestLosingStreak([]) === null, 'Streak: empty → null');
assert(longestLosingStreak([rec({ result: 'won' })]) === 0, 'Streak: only wins → 0');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: CLV — always null (closing odds not tracked)
// ═══════════════════════════════════════════════════════════════════════════════

assert(averageCLV(mixed) === null, 'CLV: always null (no closing odds)');
assert(averageCLV([]) === null, 'CLV: empty → null');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: Brier score — needs 30+ settled with valid prob
// ═══════════════════════════════════════════════════════════════════════════════

assert(brierScore([]) === null, 'Brier: empty → null');
assert(brierScore(mixed) === null, 'Brier: <30 settled → null');

// 30 perfect predictions: all won with p=1.0 → not eligible (p must be <1)
const perfectNoCalc = Array.from({ length: 30 }, () => rec({ result: 'won', modelProbability: 1.0 }));
assert(brierScore(perfectNoCalc) === null, 'Brier: p=1.0 exactly → not eligible');

// 30 settled with valid probs
const brierData = [
  ...Array.from({ length: 20 }, () => rec({ result: 'won', modelProbability: 0.7 })),
  ...Array.from({ length: 10 }, () => rec({ result: 'lost', modelProbability: 0.3 })),
];
// won: (0.7-1)^2 = 0.09; lost: (0.3-0)^2 = 0.09 → avg = 0.09
const brierVal = brierScore(brierData);
assert(brierVal !== null, 'Brier: 30 eligible → not null');
assertClose(brierVal!, 0.09, 0.001, 'Brier: all 0.09 → score 0.09');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: Log loss
// ═══════════════════════════════════════════════════════════════════════════════

assert(logLoss([]) === null, 'Log loss: empty → null');
assert(logLoss(mixed) === null, 'Log loss: <30 → null');

const llData = brierData;
const llVal = logLoss(llData);
assert(llVal !== null, 'Log loss: 30 eligible → not null');
// won: -ln(0.7) ≈ 0.3567; lost: -ln(0.7) ≈ 0.3567 (since 1-0.3=0.7)
assertClose(llVal!, -Math.log(0.7), 0.01, 'Log loss: symmetric case');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: Calibration error
// ═══════════════════════════════════════════════════════════════════════════════

assert(calibrationError([]) === null, 'Cal error: empty → null');
assert(calibrationError(mixed) === null, 'Cal error: <30 → null');

const calData = brierData;
const calVal = calibrationError(calData);
assert(calVal !== null, 'Cal error: 30 eligible → not null');
assert(calVal! >= 0, 'Cal error: non-negative');
assert(calVal! < 1, 'Cal error: < 100%');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 14: Daily filter
// ═══════════════════════════════════════════════════════════════════════════════

const dayData = [
  rec({ settledAt: '2026-08-29T22:00:00Z' }),
  rec({ settledAt: '2026-08-30T10:00:00Z' }),
  rec({ settledAt: '2026-08-30T22:00:00Z' }),
];
const grouped = groupByDay(dayData);
assert(grouped.has('2026-08-29'), 'GroupByDay: has Aug 29');
assert(grouped.has('2026-08-30'), 'GroupByDay: has Aug 30');
assert(grouped.get('2026-08-29')!.length === 1, 'GroupByDay: 1 on Aug 29');
assert(grouped.get('2026-08-30')!.length === 2, 'GroupByDay: 2 on Aug 30');

// Falls back to frozenAt when settledAt is missing
const noSettled = rec({ settledAt: undefined, frozenAt: '2026-08-28T12:00:00Z' });
const fallbackGroup = groupByDay([noSettled]);
assert(fallbackGroup.has('2026-08-28'), 'GroupByDay: falls back to frozenAt');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 15: Zero / insufficient sample → N/A (not misleading 0)
// ═══════════════════════════════════════════════════════════════════════════════

const empty: SettledRecord[] = [];
assert(winPercent(empty) === null, 'Zero sample: winPercent → null');
assert(roi(empty) === null, 'Zero sample: roi → null');
assert(netUnits(empty) === null, 'Zero sample: netUnits → null');
assert(averageOdds(empty) === null, 'Zero sample: avgOdds → null');
assert(maxDrawdown(empty) === null, 'Zero sample: drawdown → null');
assert(longestLosingStreak(empty) === null, 'Zero sample: streak → null');
assert(brierScore(empty) === null, 'Zero sample: brier → null');
assert(logLoss(empty) === null, 'Zero sample: logLoss → null');
assert(calibrationError(empty) === null, 'Zero sample: calError → null');

// 1 settled pick — most stats work but statistical ones still N/A
const onePick = [rec({ result: 'won', profitLoss: 2, suggestedStake: 1 })];
assertClose(winPercent(onePick)!, 1.0, 0.001, '1 pick: winPercent = 100%');
assertClose(roi(onePick)!, 2.0, 0.001, '1 pick: roi = 200%');
assert(brierScore(onePick) === null, '1 pick: brier still null (<30)');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 16: Push handling
// ═══════════════════════════════════════════════════════════════════════════════

const pushOnly = [rec({ result: 'push', profitLoss: 0, suggestedStake: 5 })];
assert(winPercent(pushOnly) === null, 'Push only: win% = null (no settled)');
assert(roi(pushOnly) === null, 'Push only: ROI = null');
assertClose(totalPL(pushOnly), 0, 0.01, 'Push only: P/L = 0');
assertClose(totalStaked(pushOnly), 0, 0.01, 'Push only: staked = 0 (push not counted)');

// Push + win: push doesn't affect settled stats
const pushAndWin = [
  rec({ result: 'won', profitLoss: 2, suggestedStake: 1 }),
  rec({ result: 'push', profitLoss: 0, suggestedStake: 1 }),
];
assertClose(winPercent(pushAndWin)!, 1.0, 0.001, 'Push+Win: 100% win rate');
assertClose(roi(pushAndWin)!, 2.0, 0.001, 'Push+Win: ROI based on settled only');
assertClose(totalStaked(pushAndWin), 1, 0.01, 'Push+Win: staked = $1 (push excluded)');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 17: Mobile history fields all present
// ═══════════════════════════════════════════════════════════════════════════════

const fullRec = rec();
assert(typeof fullRec.startTime === 'string', 'History: has startTime');
assert(typeof fullRec.odds === 'number', 'History: has odds');
assert(typeof fullRec.result === 'string', 'History: has result');
assert(typeof fullRec.suggestedStake === 'number', 'History: has stake');
assert(typeof fullRec.profitLoss === 'number', 'History: has P/L');
assert(typeof fullRec.modelProbability === 'number', 'History: has model p');
assert(typeof fullRec.impliedProbability === 'number', 'History: has mkt p');
assert(typeof fullRec.confidenceScore === 'number', 'History: has quality');

// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\nresults.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
