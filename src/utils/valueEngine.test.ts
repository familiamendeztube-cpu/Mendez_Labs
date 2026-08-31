// V55A deterministic unit tests for the value-betting engine.
// Run with: npx tsx src/utils/valueEngine.test.ts

import {
  expectedValuePerDollar,
  fairDecimalPrice,
  deriveModelWeight,
  blendProbability,
  noVigMarketProbability,
  marketConsensus2Way,
  marketConsensusNWay,
  checkQualification,
  quarterKellyStake,
  isCorrelatedPick,
  isContradictoryPick,
  type QualificationInputs,
} from './valueEngine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${label}`);
  }
}

function approx(a: number | null, b: number, eps = 0.001): boolean {
  if (a === null) return false;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) < eps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: expectedValuePerDollar (EV = p * decimal - 1)
// ═══════════════════════════════════════════════════════════════════════════════

assert(approx(expectedValuePerDollar(0.5, 2.0), 0.0), 'EV: 50% at 2.0x = 0');
assert(approx(expectedValuePerDollar(0.6, 2.0), 0.2), 'EV: 60% at 2.0x = +0.2');
assert(approx(expectedValuePerDollar(0.4, 2.0), -0.2), 'EV: 40% at 2.0x = -0.2');
assert(approx(expectedValuePerDollar(0.55, 1.95), 0.0725), 'EV: 55% at 1.95x = +0.0725');

// Null model → null EV
assert(expectedValuePerDollar(null, 2.0) === null, 'EV: null prob → null');
assert(expectedValuePerDollar(0.5, null) === null, 'EV: null odds → null');
assert(expectedValuePerDollar(0, 2.0) === null, 'EV: prob=0 → null');
assert(expectedValuePerDollar(1, 2.0) === null, 'EV: prob=1 → null');
assert(expectedValuePerDollar(0.5, 1.0) === null, 'EV: decimal=1 → null');
assert(expectedValuePerDollar(NaN, 2.0) === null, 'EV: NaN prob → null');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: fairDecimalPrice (1/p)
// ═══════════════════════════════════════════════════════════════════════════════

assert(approx(fairDecimalPrice(0.5), 2.0), 'Fair: 50% = 2.0');
assert(approx(fairDecimalPrice(0.25), 4.0), 'Fair: 25% = 4.0');
assert(approx(fairDecimalPrice(0.75), 1.3333), 'Fair: 75% = 1.333');
assert(fairDecimalPrice(0) === null, 'Fair: 0% = null');
assert(fairDecimalPrice(1) === null, 'Fair: 100% = null');
assert(fairDecimalPrice(null) === null, 'Fair: null = null');
assert(fairDecimalPrice(NaN) === null, 'Fair: NaN = null');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: deriveModelWeight — null/unavailable model → weight=0
// ═══════════════════════════════════════════════════════════════════════════════

assert(deriveModelWeight({ brierScore: null, sampleSize: 0, featureCompleteness: 1, leagueCoverage: 1 }) === 0, 'No brier → weight=0');
assert(deriveModelWeight({ brierScore: 0.25, sampleSize: 10, featureCompleteness: 1, leagueCoverage: 1 }) === 0, 'Too few games → weight=0');
assert(approx(deriveModelWeight({ brierScore: 0.15, sampleSize: 200, featureCompleteness: 1, leagueCoverage: 1 }), 0.16), 'Good model ≈ 0.16');
assert(approx(deriveModelWeight({ brierScore: 0.15, sampleSize: 200, featureCompleteness: 0.5, leagueCoverage: 1 }), 0.08), 'Half features ≈ 0.08');
assert(approx(deriveModelWeight({ brierScore: 0.10, sampleSize: 500, featureCompleteness: 1, leagueCoverage: 1 }), 0.24), 'Excellent ≈ 0.24');
assert(deriveModelWeight({ brierScore: 0.20, sampleSize: 50, featureCompleteness: 1, leagueCoverage: 1 }) <= 0.1, 'Mediocre low weight');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: blendProbability — null model produces null or market-only
// ═══════════════════════════════════════════════════════════════════════════════

assert(approx(blendProbability(0.6, 0.5, 0.5), 0.55), 'Blend 50/50: 0.55');
assert(approx(blendProbability(0.6, 0.5, 0.05), 0.505), 'Blend 5%: 0.505');
assert(approx(blendProbability(0.7, 0.4, 0.3), 0.49), 'Blend 30%: 0.49');

// Null model → returns pMarket (no blend)
assert(approx(blendProbability(null, 0.5, 0), 0.5), 'Null model, w=0 → pMarket');
assert(approx(blendProbability(null, 0.6, 0.3), 0.6), 'Null model → pMarket regardless of wModel');
assert(blendProbability(0.6, null, 0.3) === null, 'Null market → null');
assert(blendProbability(null, null, 0) === null, 'Both null → null');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Market consensus (median no-vig, 2-way)
// ═══════════════════════════════════════════════════════════════════════════════

{
  const mc = marketConsensus2Way([
    { name: 'A', sideAOdds: -110, sideBOdds: -110 },
    { name: 'B', sideAOdds: -108, sideBOdds: -112 },
    { name: 'C', sideAOdds: -105, sideBOdds: -115 },
  ], 3);
  assert(mc.valid, 'Consensus 2-way: 3 books → valid');
  assert(mc.probA !== null, 'Consensus 2-way: probA not null');
  if (mc.probA !== null && mc.probB !== null) {
    assert(approx(mc.probA + mc.probB, 1.0), 'Consensus 2-way: sums to 1');
  }

  // Too few books
  const mc2 = marketConsensus2Way([
    { name: 'A', sideAOdds: -110, sideBOdds: -110 },
  ], 3);
  assert(!mc2.valid, 'Consensus 2-way: 1 book → invalid');
  assert(mc2.probA === null, 'Consensus 2-way: invalid → null');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Market consensus (N-way)
// ═══════════════════════════════════════════════════════════════════════════════

{
  const mc = marketConsensusNWay([
    { name: 'A', outcomePrices: [-150, 250, 300] },
    { name: 'B', outcomePrices: [-140, 260, 310] },
    { name: 'C', outcomePrices: [-145, 255, 305] },
  ], 3);
  assert(mc.valid, 'Consensus N-way: valid');
  assert(mc.probs.length === 3, 'Consensus N-way: 3 outcomes');
  const sum = mc.probs.reduce((s, p) => s + (p ?? 0), 0);
  assert(approx(sum, 1.0), 'Consensus N-way: sums to 1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Legacy noVigMarketProbability wrapper
// ═══════════════════════════════════════════════════════════════════════════════

{
  const nv1 = noVigMarketProbability([-110, -105, -108], [110, 105, 108], 3);
  assert(nv1.valid, '3 books → valid');
  assert(approx(nv1.probA + nv1.probB, 1.0, 0.01), 'Legacy: sums to ~1');

  const nv2 = noVigMarketProbability([-110], [110], 3);
  assert(!nv2.valid, '1 book → invalid');

  const nv3 = noVigMarketProbability([-200, -195, -198], [180, 175, 178], 3);
  assert(nv3.valid, 'Asymmetric → valid');
  assert(nv3.probA > 0.6, 'Heavy favorite > 60%');
  assert(nv3.probB < 0.4, 'Dog < 40%');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Qualification gates (V55 — 14 checks)
// ═══════════════════════════════════════════════════════════════════════════════

const baseQual: QualificationInputs = {
  startTime: new Date(Date.now() + 86400000).toISOString(),
  sourceTimestamp: new Date().toISOString(),
  matchConfidence: 1.0,
  bookmakerCount: 5,
  minBookmakers: 3,
  sampleSize: 100,
  minSampleSize: 30,
  featureCompleteness: 1.0,
  minFeatureCompleteness: 0.8,
  evPercent: 0.05,
  minEvMargin: 0.03,
  edgePp: 0.04,
  minEdgePp: 0.02,
  oddsMalformed: false,
  isCorrelated: false,
  modelAvailable: true,
  modelCalibrated: true,
  providerMatchVerified: true,
  probabilitySanityPass: true,
};

const q1 = checkQualification(baseQual);
assert(q1.qualified, 'All pass = qualified');
assert(q1.exclusionReason === null, 'Qualified → no reason');
assert(q1.checks.length === 14, `14 qualification checks (got ${q1.checks.length})`);

// Each gate failure
const q2 = checkQualification({ ...baseQual, bookmakerCount: 2 });
assert(!q2.qualified, '2 bookmakers → not qualified');

const q3 = checkQualification({ ...baseQual, evPercent: 0.01 });
assert(!q3.qualified, 'Low EV → not qualified');

const q4 = checkQualification({ ...baseQual, sampleSize: 10 });
assert(!q4.qualified, 'Low sample → not qualified');

const q5 = checkQualification({ ...baseQual, startTime: new Date(Date.now() - 1000).toISOString() });
assert(!q5.qualified, 'Started → not qualified');

const q6 = checkQualification({ ...baseQual, isCorrelated: true });
assert(!q6.qualified, 'Correlated → not qualified');

// V55 NEW gates
const q7 = checkQualification({ ...baseQual, modelAvailable: false });
assert(!q7.qualified, 'No model → not qualified');
assert(q7.exclusionReason !== null && q7.exclusionReason.includes('Independent model'), 'No model reason');

const q8 = checkQualification({ ...baseQual, modelCalibrated: false });
assert(!q8.qualified, 'Uncalibrated model → not qualified');

const q9 = checkQualification({ ...baseQual, probabilitySanityPass: false });
assert(!q9.qualified, 'Sanity fail → not qualified');

const q10 = checkQualification({ ...baseQual, edgePp: 0.01 });
assert(!q10.qualified, 'Edge 1pp < 2pp threshold → not qualified');

const q11 = checkQualification({ ...baseQual, evPercent: null });
assert(!q11.qualified, 'Null EV → not qualified');

const q12 = checkQualification({ ...baseQual, edgePp: null });
assert(!q12.qualified, 'Null edge → not qualified');

const q13 = checkQualification({ ...baseQual, providerMatchVerified: false });
assert(!q13.qualified, 'Unverified provider → not qualified');

// Quote age: 16 min is > 15 min limit
const q14inputs = {
  ...baseQual,
  sourceTimestamp: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
};
const q14 = checkQualification(q14inputs);
assert(!q14.qualified, '16 min old quote → not qualified');

// Exclusion reason codes (regression: never claim sufficient history at 0)
const zeroResult = checkQualification({ ...baseQual, sampleSize: 0, minSampleSize: 30 });
assert(!zeroResult.qualified, 'Zero sample = not qualified');
const zeroFailed = zeroResult.checks.find((c) => c.name.includes('historical'));
assert(zeroFailed !== undefined && !zeroFailed.passed, 'Zero sample fails history check');

// No-model fallback: market-only should NEVER qualify
const noModelQual = checkQualification({
  ...baseQual,
  modelAvailable: false,
  modelCalibrated: false,
  edgePp: null,
  evPercent: null,
});
assert(!noModelQual.qualified, 'Market-only MUST NOT qualify');
const noModelFailures = noModelQual.checks.filter((c) => !c.passed).map((c) => c.name);
assert(noModelFailures.includes('Independent model available'), 'Fails model gate');
assert(noModelFailures.includes('Model calibrated'), 'Fails calibration gate');
assert(noModelFailures.includes('Edge ≥ 2pp'), 'Fails edge gate (null)');
assert(noModelFailures.includes('EV ≥ 3.0%'), 'Fails EV gate (null)');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: quarterKellyStake
// ═══════════════════════════════════════════════════════════════════════════════

const k1 = quarterKellyStake(0.55, 2.0, 1000);
assert(k1.stake > 0, 'Positive EV → stake > 0');
assert(k1.stake <= 10, 'Capped at 1% of 1000');

const k2 = quarterKellyStake(0.4, 2.0, 1000);
assert(k2.stake === 0, 'Negative Kelly → 0');

const k3 = quarterKellyStake(0.5, 2.0, 1000, 0.01, 0.05, 48);
assert(k3.stake <= 2, 'Daily cap: 50-48=2');

// Null model → 0 stake
const k4 = quarterKellyStake(null, 2.0, 1000);
assert(k4.stake === 0, 'Null prob → 0 stake');
assert(k4.capReason !== null, 'Null prob → has reason');

const k5 = quarterKellyStake(0.55, null, 1000);
assert(k5.stake === 0, 'Null odds → 0 stake');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: Correlation / contradiction
// ═══════════════════════════════════════════════════════════════════════════════

assert(isCorrelatedPick(
  { eventId: 'e1', market: 'h2h', side: 'Home', homeTeam: 'A', awayTeam: 'B' },
  [{ eventId: 'e1', market: 'spreads', side: 'Home -3', homeTeam: 'A', awayTeam: 'B' }],
), 'Same game = correlated');

assert(isCorrelatedPick(
  { eventId: 'e2', market: 'h2h', side: 'Home', homeTeam: 'A', awayTeam: 'C' },
  [{ eventId: 'e1', market: 'h2h', side: 'Home', homeTeam: 'A', awayTeam: 'B' }],
), 'Same team = correlated');

assert(!isCorrelatedPick(
  { eventId: 'e2', market: 'h2h', side: 'Home', homeTeam: 'C', awayTeam: 'D' },
  [{ eventId: 'e1', market: 'h2h', side: 'Home', homeTeam: 'A', awayTeam: 'B' }],
), 'Different teams = not correlated');

assert(isContradictoryPick(
  { eventId: 'e1', market: 'h2h', side: 'Home' },
  [{ eventId: 'e1', market: 'h2h', side: 'Away' }],
), 'Opposite h2h = contradictory');

assert(isContradictoryPick(
  { eventId: 'e1', market: 'totals', side: 'Over 5.5' },
  [{ eventId: 'e1', market: 'totals', side: 'Under 5.5' }],
), 'Over vs Under = contradictory');

assert(!isContradictoryPick(
  { eventId: 'e1', market: 'h2h', side: 'Home' },
  [{ eventId: 'e1', market: 'spreads', side: 'Home -3' }],
), 'Different market = not contradictory');

assert(!isContradictoryPick(
  { eventId: 'e2', market: 'h2h', side: 'Home' },
  [{ eventId: 'e1', market: 'h2h', side: 'Away' }],
), 'Different game = not contradictory');

// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\nvalueEngine.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
