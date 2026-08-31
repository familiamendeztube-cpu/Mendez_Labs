// V55A deterministic unit tests for odds math, no-vig consensus, and settlement.
// Run with: npx tsx src/utils/oddsMath.test.ts

import {
  americanToImpliedProb,
  americanToDecimalOdds,
  decimalToAmerican,
  noVigConsensus,
  noVigNWay,
  bestPrice,
  marketValueEdge,
  normalizeTeamName,
  teamMatchConfidence,
  isStaleOrStarted,
  isMalformedOdds,
  isProbabilityConsistentWithOdds,
  median,
  trimmedMean,
  medianNoVigConsensus,
  medianNoVigNWay,
  fairDecimalPrice,
  expectedValue,
  settleMoneyline,
  settleSpread,
  settleTotal,
  settleSoccer1x2,
} from './oddsMath';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${name}`);
  }
}

function approx(a: number, b: number, eps = 0.001): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) < eps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Helpers
// ═══════════════════════════════════════════════════════════════════════════════

assert(approx(median([1, 2, 3]), 2), 'median of [1,2,3] = 2');
assert(approx(median([1, 2, 3, 4]), 2.5), 'median of [1,2,3,4] = 2.5');
assert(approx(median([5]), 5), 'median of [5] = 5');
assert(Number.isNaN(median([])), 'median of [] = NaN');

assert(approx(trimmedMean([1, 2, 3, 4, 5], 0.2), 3), 'trimmedMean [1..5] trim 20% = 3');
assert(approx(trimmedMean([10, 20], 0.2), 15), 'trimmedMean [10,20] = 15 (too few to trim)');
assert(Number.isNaN(trimmedMean([])), 'trimmedMean [] = NaN');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: American odds conversion — CRITICAL V55 INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

// +1200 → ~7.69% implied (NOT 77.9%)
assert(approx(americanToImpliedProb(1200), 100 / 1300, 0.0001), '+1200 implied prob ≈ 7.69%');
assert(americanToImpliedProb(1200) < 0.08, '+1200 implied must be < 8%');
assert(americanToImpliedProb(1200) > 0.07, '+1200 implied must be > 7%');

// -300 → 75% implied
assert(approx(americanToImpliedProb(-300), 300 / 400, 0.0001), '-300 implied prob = 75%');

// Even money
assert(approx(americanToImpliedProb(100), 0.5), '+100 implied = 50%');
assert(approx(americanToImpliedProb(-100), 0.5), '-100 implied = 50%');

// Standard conversions
assert(approx(americanToImpliedProb(200), 100 / 300), '+200 implied = 33.3%');
assert(approx(americanToImpliedProb(-200), 200 / 300), '-200 implied = 66.7%');
assert(approx(americanToImpliedProb(150), 100 / 250), '+150 implied = 40%');
assert(approx(americanToImpliedProb(-150), 150 / 250), '-150 implied = 60%');

// Guards: invalid input produces NaN, not a number
assert(Number.isNaN(americanToImpliedProb(0)), 'odds=0 → NaN');
assert(Number.isNaN(americanToImpliedProb(NaN)), 'odds=NaN → NaN');
assert(Number.isNaN(americanToImpliedProb(Infinity)), 'odds=Infinity → NaN');

// Decimal odds
assert(approx(americanToDecimalOdds(100), 2.0), '+100 decimal = 2.0');
assert(approx(americanToDecimalOdds(-100), 2.0), '-100 decimal = 2.0');
assert(approx(americanToDecimalOdds(200), 3.0), '+200 decimal = 3.0');
assert(approx(americanToDecimalOdds(-200), 1.5), '-200 decimal = 1.5');
assert(approx(americanToDecimalOdds(1200), 13.0), '+1200 decimal = 13.0');
assert(approx(americanToDecimalOdds(-300), 1.3333, 0.001), '-300 decimal ≈ 1.333');
assert(Number.isNaN(americanToDecimalOdds(0)), 'decimal odds=0 → NaN');

// Decimal → American round-trip
assert(decimalToAmerican(2.0) === 100, 'Decimal 2.0 → +100');
assert(decimalToAmerican(1.5) === -200, 'Decimal 1.5 → -200');
assert(decimalToAmerican(3.0) === 200, 'Decimal 3.0 → +200');
assert(decimalToAmerican(13.0) === 1200, 'Decimal 13.0 → +1200');
assert(Number.isNaN(decimalToAmerican(1)), 'Decimal 1.0 → NaN (no profit)');
assert(Number.isNaN(decimalToAmerican(0.5)), 'Decimal <1 → NaN');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: No-vig consensus (2-way, single bookmaker)
// ═══════════════════════════════════════════════════════════════════════════════

{
  const c = noVigConsensus(-110, -110);
  assert(approx(c.probA, 0.5), 'No-vig -110/-110: 50/50 A');
  assert(approx(c.probB, 0.5), 'No-vig -110/-110: 50/50 B');
  assert(approx(c.probA + c.probB, 1.0), 'No-vig -110/-110: sums to 1');
  assert(c.vigPercent > 0 && c.vigPercent < 0.05, 'Vig -110/-110 is positive and small');

  const c2 = noVigConsensus(-200, +200);
  assert(approx(c2.probA + c2.probB, 1.0), 'No-vig -200/+200: sums to 1');
  assert(c2.probA > 0.6 && c2.probA < 0.7, 'No-vig -200/+200: A is favorite');

  const c3 = noVigConsensus(-150, +130);
  assert(c3.probA > c3.probB, 'No-vig -150/+130: A favored');
  assert(approx(c3.probA + c3.probB, 1.0), 'No-vig -150/+130: sums to 1');

  // Guards
  const cBad = noVigConsensus(0, -110);
  assert(Number.isNaN(cBad.probA), 'No-vig with odds=0 → NaN');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: No-vig N-way market (3-way for soccer 1X2)
// ═══════════════════════════════════════════════════════════════════════════════

{
  // Typical 1X2 market: Home -150, Draw +250, Away +300
  const nv = noVigNWay([-150, 250, 300]);
  assert(nv.length === 3, '3-way no-vig has 3 outcomes');
  const sum = nv.reduce((s, p) => s + p, 0);
  assert(approx(sum, 1.0), '3-way no-vig sums to 1.0');
  assert(nv[0] > nv[1], '3-way: home favorite > draw');
  assert(nv[0] > nv[2], '3-way: home favorite > away');

  // Symmetric odds should give equal probs
  const nvSym = noVigNWay([100, 100, 100]);
  assert(nvSym.length === 3, 'Symmetric 3-way has 3 outcomes');
  assert(approx(nvSym[0], 1 / 3, 0.001), 'Symmetric 3-way: each ≈ 33.3%');
  assert(approx(nvSym[0] + nvSym[1] + nvSym[2], 1.0), 'Symmetric 3-way sums to 1');

  // Draw mapping: draw outcome must be in the array
  const nvDraw = noVigNWay([-120, 280, 320]);
  assert(nvDraw.length === 3, 'Draw mapping: 3 outcomes');
  assert(nvDraw[1] > 0, 'Draw probability > 0');
  assert(nvDraw[1] < nvDraw[0], 'Draw prob < home favorite');

  // Missing outcome (empty array)
  assert(noVigNWay([]).length === 0, 'Empty → empty');

  // Malformed odds in N-way → empty
  assert(noVigNWay([0, 100, 200]).length === 0, 'Malformed odds in N-way → empty');
  assert(noVigNWay([NaN, 100, 200]).length === 0, 'NaN odds in N-way → empty');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Median no-vig consensus across bookmakers (2-way)
// ═══════════════════════════════════════════════════════════════════════════════

{
  // 5 bookmakers with slightly different lines on the same event/market
  const pairs = [
    { name: 'FanDuel', sideAOdds: -110, sideBOdds: -110 },
    { name: 'DraftKings', sideAOdds: -108, sideBOdds: -112 },
    { name: 'BetMGM', sideAOdds: -105, sideBOdds: -115 },
    { name: 'Caesars', sideAOdds: -112, sideBOdds: -108 },
    { name: 'PointsBet', sideAOdds: -110, sideBOdds: -110 },
  ];
  const mc = medianNoVigConsensus(pairs, 3);
  assert(mc.valid, 'Median consensus: 5 books → valid');
  assert(mc.bookmakerCount === 5, 'Median consensus: count = 5');
  assert(approx(mc.probA + mc.probB, 1.0), 'Median consensus: sums to 1');
  assert(approx(mc.probA, 0.5, 0.03), 'Median consensus: close to 50% for near-even lines');

  // Only 2 bookmakers → invalid when min is 3
  const mc2 = medianNoVigConsensus(pairs.slice(0, 2), 3);
  assert(!mc2.valid, 'Median consensus: 2 books with min 3 → invalid');

  // Bookmaker with malformed odds excluded
  const pairsWithBad = [
    ...pairs,
    { name: 'Bad', sideAOdds: 0, sideBOdds: -110 },
  ];
  const mc3 = medianNoVigConsensus(pairsWithBad, 3);
  assert(mc3.valid, 'Median consensus: bad book excluded, still valid');
  assert(mc3.bookmakerCount === 5, 'Median consensus: bad book not counted');

  // Duplicate / stale: same bookmaker shouldn't break median
  const dupPairs = [
    { name: 'A', sideAOdds: -200, sideBOdds: 180 },
    { name: 'B', sideAOdds: -195, sideBOdds: 175 },
    { name: 'C', sideAOdds: -198, sideBOdds: 178 },
    { name: 'A-stale', sideAOdds: -200, sideBOdds: 180 },
  ];
  const mc4 = medianNoVigConsensus(dupPairs, 3);
  assert(mc4.valid, 'Duplicate books: still valid with 4 entries');
  assert(mc4.probA > 0.6, 'Heavy favorite consensus > 60%');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Median no-vig consensus across bookmakers (N-way)
// ═══════════════════════════════════════════════════════════════════════════════

{
  const books = [
    { name: 'A', outcomePrices: [-150, 250, 300] },
    { name: 'B', outcomePrices: [-140, 260, 310] },
    { name: 'C', outcomePrices: [-145, 255, 305] },
  ];
  const mc = medianNoVigNWay(books, 3);
  assert(mc.valid, 'N-way median: 3 books → valid');
  assert(mc.probs.length === 3, 'N-way median: 3 outcomes');
  const sum = mc.probs.reduce((s, p) => s + p, 0);
  assert(approx(sum, 1.0), 'N-way median: sums to 1');

  // Cross-event mismatch: different outcome counts
  const mismatch = [
    { name: 'A', outcomePrices: [-150, 250, 300] },
    { name: 'B', outcomePrices: [-140, 260] }, // different market
    { name: 'C', outcomePrices: [-145, 255, 305] },
  ];
  const mc2 = medianNoVigNWay(mismatch, 3);
  assert(!mc2.valid, 'N-way median: mismatched outcome count → invalid');
  assert(mc2.bookmakerCount === 2, 'N-way median: only 2 valid books counted');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Best price selection
// ═══════════════════════════════════════════════════════════════════════════════

assert(bestPrice([100, 110, 105]) === 110, 'Best price [100,110,105] = 110');
assert(bestPrice([-110, -105, -120]) === -105, 'Best price [-110,-105,-120] = -105');
assert(bestPrice([]) === null, 'Best price [] = null');
assert(bestPrice([150]) === 150, 'Best price [150] = 150');
assert(bestPrice([0, 100]) === 100, 'Best price filters out odds=0');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Market value edge
// ═══════════════════════════════════════════════════════════════════════════════

{
  const edge = marketValueEdge(-110, 0.5);
  const implied = americanToImpliedProb(-110);
  assert(approx(edge, 0.5 - implied), 'Edge = consensus - implied');
  assert(edge < 0, 'Edge negative when -110 vs consensus 50%');

  // NaN guards
  assert(Number.isNaN(marketValueEdge(-110, NaN)), 'Edge with NaN consensus → NaN');
  assert(Number.isNaN(marketValueEdge(0, 0.5)), 'Edge with odds=0 → NaN');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Fair price and EV
// ═══════════════════════════════════════════════════════════════════════════════

{
  const fp = fairDecimalPrice(0.5);
  assert(fp !== null && approx(fp, 2.0), 'Fair price 50% = 2.0');
  assert(fairDecimalPrice(0.25) !== null && approx(fairDecimalPrice(0.25)!, 4.0), 'Fair price 25% = 4.0');
  assert(fairDecimalPrice(0) === null, 'Fair price 0% = null');
  assert(fairDecimalPrice(1) === null, 'Fair price 100% = null');
  assert(fairDecimalPrice(NaN) === null, 'Fair price NaN = null');
  assert(fairDecimalPrice(-0.5) === null, 'Fair price negative = null');

  // EV = p * decimal - 1
  const ev1 = expectedValue(0.5, 2.0);
  assert(ev1 !== null && approx(ev1, 0.0), 'EV: 50% at 2.0x = 0');
  const ev2 = expectedValue(0.6, 2.0);
  assert(ev2 !== null && approx(ev2, 0.2), 'EV: 60% at 2.0x = +0.2');
  const ev3 = expectedValue(0.4, 2.0);
  assert(ev3 !== null && approx(ev3, -0.2), 'EV: 40% at 2.0x = -0.2');

  // For +1200: if true prob ~7.69%, decimal 13.0 → EV = 0.0769*13 - 1 = 0.0 (zero vig breakeven)
  const ev1200 = expectedValue(100 / 1300, 13.0);
  assert(ev1200 !== null && approx(ev1200, 0.0, 0.001), 'EV at breakeven for +1200 ≈ 0');

  // Guards
  assert(expectedValue(null, 2.0) === null, 'EV null prob = null');
  assert(expectedValue(0.5, null) === null, 'EV null odds = null');
  assert(expectedValue(0, 2.0) === null, 'EV prob=0 = null');
  assert(expectedValue(0.5, 1.0) === null, 'EV decimal=1 = null');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: Probability / price sanity check
// ═══════════════════════════════════════════════════════════════════════════════

{
  // +1200 implies ~7.69%, so 77.9% is inconsistent (CRITICAL V55 BUG CHECK)
  assert(!isProbabilityConsistentWithOdds(0.779, 1200, 0.30), '+1200 and 77.9% MUST be inconsistent');
  assert(isProbabilityConsistentWithOdds(0.0769, 1200, 0.05), '+1200 and 7.69% is consistent');

  // -300 implies 75%, so 40.8% is inconsistent
  assert(!isProbabilityConsistentWithOdds(0.408, -300, 0.30), '-300 and 40.8% MUST be inconsistent');
  assert(isProbabilityConsistentWithOdds(0.75, -300, 0.05), '-300 and 75% is consistent');

  // Even money
  assert(isProbabilityConsistentWithOdds(0.5, 100, 0.05), '+100 and 50% is consistent');
  assert(isProbabilityConsistentWithOdds(0.5, -100, 0.05), '-100 and 50% is consistent');

  // NaN guards
  assert(!isProbabilityConsistentWithOdds(NaN, 100, 0.30), 'NaN prob → false');
  assert(!isProbabilityConsistentWithOdds(0.5, NaN, 0.30), 'NaN odds → false');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: Team name matching
// ═══════════════════════════════════════════════════════════════════════════════

assert(normalizeTeamName('Los Angeles Lakers') === 'los angeles lakers', 'Normalize team');
assert(normalizeTeamName('Manchester City FC') === 'manchester city', 'Normalize with FC');
assert(normalizeTeamName('  The  Club  ') === '', 'Normalize the/club');

assert(teamMatchConfidence('Los Angeles Lakers', 'Los Angeles Lakers') === 1.0, 'Exact match = 1.0');
assert(teamMatchConfidence('Los Angeles Lakers', 'LA Lakers') >= 0.5, 'Partial LA Lakers');
assert(teamMatchConfidence('Manchester City', 'Manchester City FC') >= 0.85, 'Match with FC');
assert(teamMatchConfidence('New England Patriots', 'Seattle Seahawks') < 0.1, 'No match = low');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: Exclusion filters
// ═══════════════════════════════════════════════════════════════════════════════

assert(isStaleOrStarted(new Date(Date.now() - 1000).toISOString()) === true, 'Past = stale');
assert(isStaleOrStarted(new Date(Date.now() + 3600000).toISOString()) === false, 'Future = not stale');
assert(isStaleOrStarted('2020-01-01T00:00:00Z') === true, 'Old date = stale');

assert(isMalformedOdds(0) === true, 'Zero odds = malformed');
assert(isMalformedOdds(100) === false, '+100 valid');
assert(isMalformedOdds(-110) === false, '-110 valid');
assert(isMalformedOdds(999999) === true, 'Extreme = malformed');
assert(isMalformedOdds(NaN) === true, 'NaN = malformed');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: Settlement
// ═══════════════════════════════════════════════════════════════════════════════

// Moneyline
assert(settleMoneyline('', 24, 17, true) === 'won', 'ML home win');
assert(settleMoneyline('', 17, 24, true) === 'lost', 'ML home loss');
assert(settleMoneyline('', 24, 17, false) === 'lost', 'ML away loss');
assert(settleMoneyline('', 17, 24, false) === 'won', 'ML away win');

// Spread
assert(settleSpread('', 24, 17, true, -3) === 'won', 'Spread -3 covered');
assert(settleSpread('', 20, 17, true, -3) === 'push', 'Spread -3 push');
assert(settleSpread('', 20, 17, true, -3.5) === 'lost', 'Spread -3.5 not covered');
assert(settleSpread('', 17, 20, true, 3) === 'push', 'Spread +3 push');
assert(settleSpread('', 17, 20, true, 2.5) === 'lost', 'Spread +2.5 not covered');
assert(settleSpread('', 24, 14, true, -10) === 'push', 'Spread -10 push');

// Total
assert(settleTotal('Over', 24, 17, 40) === 'won', 'Over 40 with 41');
assert(settleTotal('Over', 17, 17, 40) === 'lost', 'Over 40 with 34');
assert(settleTotal('Under', 17, 17, 40) === 'won', 'Under 40 with 34');
assert(settleTotal('Under', 24, 17, 40) === 'lost', 'Under 40 with 41');
assert(settleTotal('Over', 20, 20, 40) === 'push', 'Over 40 exact push');
assert(settleTotal('Under', 20, 20, 40) === 'push', 'Under 40 exact push');

// Soccer 1X2
assert(settleSoccer1x2('home', 2, 1) === 'won', 'Soccer home win');
assert(settleSoccer1x2('away', 1, 2) === 'won', 'Soccer away win');
assert(settleSoccer1x2('draw', 1, 1) === 'won', 'Soccer draw');
assert(settleSoccer1x2('home', 1, 2) === 'lost', 'Soccer home loss');
assert(settleSoccer1x2('1', 2, 1) === 'won', 'Soccer 1 win');
assert(settleSoccer1x2('x', 1, 1) === 'won', 'Soccer X draw');
assert(settleSoccer1x2('2', 1, 2) === 'won', 'Soccer 2 win');

// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\noddsMath.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
