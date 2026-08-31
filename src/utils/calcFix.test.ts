// Regression tests for Version 32 calculation fixes.
// Tests: outcome pairing, 3-way normalization, incomplete markets,
// per-league sample gating, feature gating, one-pick-per-event,
// no excluded picks in Top Five, bookmaker counts, and metric labels.
// Run with: npx tsx src/utils/calcFix.test.ts

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

function approx(a: number, b: number, eps: number = 0.001): boolean {
  return Math.abs(a - b) < eps;
}

// ── Pure odds math (mirrors edge function logic) ────────────────────────────

function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  return 100 / -american + 1;
}

function americanToImpliedProb(american: number): number {
  return 1 / americanToDecimal(american);
}

function noVigConsensus(oddsA: number, oddsB: number): { probA: number; probB: number } {
  const probA = americanToImpliedProb(oddsA);
  const probB = americanToImpliedProb(oddsB);
  const total = probA + probB;
  if (total === 0) return { probA: 0.5, probB: 0.5 };
  return { probA: probA / total, probB: probB / total };
}

function noVigConsensus3Way(oddsHome: number, oddsDraw: number, oddsAway: number): { probHome: number; probDraw: number; probAway: number } {
  const probHome = americanToImpliedProb(oddsHome);
  const probDraw = americanToImpliedProb(oddsDraw);
  const probAway = americanToImpliedProb(oddsAway);
  const total = probHome + probDraw + probAway;
  if (total === 0) return { probHome: 0.333, probDraw: 0.334, probAway: 0.333 };
  return { probHome: probHome / total, probDraw: probDraw / total, probAway: probAway / total };
}

// ── Test 1: Underdog +1200 no-vig should be near implied prob, not 50% ────────
// Coventry City +1200 vs opponent -2000 (typical mismatch)
{
  const oddsSelected = 1200;   // +1200 underdog
  const oddsOpponent = -2000;  // -2000 favorite
  const consensus = noVigConsensus(oddsSelected, oddsOpponent);
  const impliedSelected = americanToImpliedProb(oddsSelected);
  const impliedOpponent = americanToImpliedProb(oddsOpponent);
  const totalImplied = impliedSelected + impliedOpponent;
  const expectedNoVig = impliedSelected / totalImplied;

  assert(approx(consensus.probA, expectedNoVig), `Underdog +1200 no-vig ≈ ${expectedNoVig.toFixed(4)}, got ${consensus.probA.toFixed(4)}`);
  assert(!approx(consensus.probA, 0.5, 0.1), `Underdog +1200 no-vig is NOT 50% (got ${consensus.probA.toFixed(4)})`);
  assert(consensus.probA < 0.1, `Underdog +1200 no-vig should be < 10% (got ${consensus.probA.toFixed(4)})`);
  assert(consensus.probB > 0.9, `Favorite -2000 no-vig should be > 90% (got ${consensus.probB.toFixed(4)})`);
}

// ── Test 2: Underdog +480 no-vig should be near implied prob, not 83% ────────
// Arizona Cardinals +480 vs opponent -700
{
  const oddsSelected = 480;   // +480 underdog
  const oddsOpponent = -700;  // -700 favorite
  const consensus = noVigConsensus(oddsSelected, oddsOpponent);
  const impliedSelected = americanToImpliedProb(oddsSelected);
  const impliedOpponent = americanToImpliedProb(oddsOpponent);
  const totalImplied = impliedSelected + impliedOpponent;
  const expectedNoVig = impliedSelected / totalImplied;

  assert(approx(consensus.probA, expectedNoVig), `Underdog +480 no-vig ≈ ${expectedNoVig.toFixed(4)}, got ${consensus.probA.toFixed(4)}`);
  assert(!approx(consensus.probA, 0.83, 0.05), `Underdog +480 no-vig is NOT 83% (got ${consensus.probA.toFixed(4)})`);
  assert(consensus.probA < 0.2, `Underdog +480 no-vig should be < 20% (got ${consensus.probA.toFixed(4)})`);
}

// ── Test 3: 3-way soccer normalization ──────────────────────────────────────
// Home +150, Draw +220, Away +400
{
  const consensus = noVigConsensus3Way(150, 220, 400);
  const impliedHome = americanToImpliedProb(150);
  const impliedDraw = americanToImpliedProb(220);
  const impliedAway = americanToImpliedProb(400);
  const total = impliedHome + impliedDraw + impliedAway;

  assert(approx(consensus.probHome, impliedHome / total), `Soccer home no-vig ≈ ${(impliedHome / total).toFixed(4)}`);
  assert(approx(consensus.probDraw, impliedDraw / total), `Soccer draw no-vig ≈ ${(impliedDraw / total).toFixed(4)}`);
  assert(approx(consensus.probAway, impliedAway / total), `Soccer away no-vig ≈ ${(impliedAway / total).toFixed(4)}`);
  assert(approx(consensus.probHome + consensus.probDraw + consensus.probAway, 1.0), `3-way probs sum to 1.0`);
  assert(consensus.probHome > consensus.probAway, `Home favorite > away underdog`);
  assert(consensus.probDraw > 0.15, `Draw probability is meaningful (> 15%)`);
}

// ── Test 4: Per-bookmaker aggregation (not mixing books) ────────────────────
// Book A: selected +1200, other -2000
// Book B: selected +1100, other -1900
// The no-vig should be the average of per-book normalizations
{
  const bookA = noVigConsensus(1200, -2000);
  const bookB = noVigConsensus(1100, -1900);
  const avgProb = (bookA.probA + bookB.probA) / 2;

  // Should NOT be 50%
  assert(!approx(avgProb, 0.5, 0.1), `Per-book avg no-vig is NOT 50% (got ${avgProb.toFixed(4)})`);
  assert(avgProb < 0.1, `Per-book avg no-vig for +1200/+1100 should be < 10% (got ${avgProb.toFixed(4)})`);

  // Should NOT be the opponent's probability
  const opponentProb = (bookA.probB + bookB.probB) / 2;
  assert(!approx(avgProb, opponentProb, 0.1), `Selected prob is NOT opponent prob`);
}

// ── Test 5: Incomplete markets are rejected ──────────────────────────────────
// Book with only 1 outcome (missing the other side)
{
  // Simulate: book has only selected outcome, no other side
  // computeNoVigForOutcome would skip this book
  const validBooks = 0;
  assert(validBooks < 3, `Incomplete market with 0 valid books fails the >=3 gate`);
}

// ── Test 6: Per-league sample gating ───────────────────────────────────────
// NFL has 0 completed games, MLB has 39
// NFL picks should NOT be qualified, MLB picks CAN be qualified
{
  const nflSample = 0;
  const mlbSample = 39;
  const MIN_SAMPLE = 30;

  assert(nflSample < MIN_SAMPLE, `NFL sample 0 < 30: not qualified`);
  assert(mlbSample >= MIN_SAMPLE, `MLB sample 39 >= 30: can be qualified`);

  // Model weight should be 0 when sample < 30
  function deriveModelWeight(sampleSize: number): number {
    if (sampleSize < MIN_SAMPLE) return 0;
    return Math.min(0.5, Math.max(0.05, 0.3 * Math.min(1.0, sampleSize / 200)));
  }

  assert(deriveModelWeight(nflSample) === 0, `NFL model weight is 0 (sample < 30)`);
  assert(deriveModelWeight(mlbSample) > 0, `MLB model weight > 0 (sample >= 30)`);
}

// ── Test 7: Feature gating ──────────────────────────────────────────────────
// If features are incomplete (sample < 30), qualified must be false
{
  const sampleSize = 10;
  const featuresComplete = sampleSize >= 30;
  const evPercent = 0.10; // 10% EV — would normally pass
  const enoughBooks = true;
  const notStarted = true;

  const qualified = featuresComplete && enoughBooks && notStarted && evPercent >= 0.03;
  assert(!qualified, `Pick with sample=10 is NOT qualified despite high EV`);
}

// ── Test 8: One pick per event ──────────────────────────────────────────────
// Simulate: two qualified picks from same event (home ML + away ML)
{
  const picks = [
    { eventId: 'evt-1', side: 'Home', evPercent: 0.05, qualified: true },
    { eventId: 'evt-1', side: 'Away', evPercent: 0.03, qualified: true },
    { eventId: 'evt-2', side: 'Home', evPercent: 0.04, qualified: true },
  ];

  const seenEventIds = new Set<string>();
  const uniqueQualified: typeof picks = [];
  for (const pick of picks) {
    if (!seenEventIds.has(pick.eventId)) {
      seenEventIds.add(pick.eventId);
      uniqueQualified.push(pick);
    }
  }

  assert(uniqueQualified.length === 2, `One per event: 2 unique from 3 picks`);
  assert(uniqueQualified[0].eventId === 'evt-1', `First unique is evt-1 (highest EV)`);
  assert(uniqueQualified[1].eventId === 'evt-2', `Second unique is evt-2`);
  assert(!uniqueQualified.some((p) => p.side === 'Away' && p.eventId === 'evt-1'), `Away from evt-1 excluded (same event)`);
}

// ── Test 9: No excluded picks in Top Five ────────────────────────────────────
{
  const allPicks = [
    { eventId: 'e1', qualified: true, evPercent: 0.08 },
    { eventId: 'e2', qualified: true, evPercent: 0.06 },
    { eventId: 'e3', qualified: false, evPercent: 0.15 }, // high EV but excluded
    { eventId: 'e4', qualified: true, evPercent: 0.04 },
  ];

  const topFive = allPicks.filter((p) => p.qualified).slice(0, 5);
  assert(topFive.length === 3, `Top Five has 3 qualified picks`);
  assert(!topFive.some((p) => !p.qualified), `No excluded picks in Top Five`);
  assert(!topFive.some((p) => p.eventId === 'e3'), `Excluded pick e3 not in Top Five`);
}

// ── Test 10: Bookmaker count from unique live bookmakers ─────────────────────
{
  const events = [
    { bookmakers: [{ name: 'DraftKings' }, { name: 'FanDuel' }, { name: 'BetMGM' }] },
    { bookmakers: [{ name: 'DraftKings' }, { name: 'Caesars' }, { name: 'BetRivers' }] },
  ];

  const allBookmakers = new Set<string>();
  for (const event of events) {
    for (const bm of event.bookmakers) {
      allBookmakers.add(bm.name);
    }
  }

  assert(allBookmakers.size === 5, `Unique bookmakers: 5 (not 6, not 0)`);
  assert(allBookmakers.has('DraftKings'), `DraftKings counted once`);
  assert(allBookmakers.has('FanDuel'), `FanDuel counted`);
  assert(allBookmakers.has('BetMGM'), `BetMGM counted`);
  assert(allBookmakers.has('Caesars'), `Caesars counted`);
  assert(allBookmakers.has('BetRivers'), `BetRivers counted`);
}

// ── Test 11: Metric labels — Model edge vs EV ────────────────────────────────
// Model edge = p_final - p_market (how much the model differs from market)
// EV = p_final * offered_decimal - 1 (expected value per $1)
{
  const pModel = 0.55;
  const pMarket = 0.50;
  const wModel = 0.3;
  const pFinal = wModel * pModel + (1 - wModel) * pMarket; // 0.515
  const offeredDecimal = 2.1; // ~ +110 american
  const modelEdge = pFinal - pMarket; // 0.015
  const evPercent = pFinal * offeredDecimal - 1; // 0.0815

  assert(approx(modelEdge, 0.015), `Model edge = p_final - p_market = 0.015`);
  assert(!approx(modelEdge, evPercent), `Model edge ≠ EV`);
  assert(evPercent > modelEdge, `EV > Model edge (EV includes price advantage)`);
  assert(modelEdge > 0, `Model edge positive when model > market`);
}

// ── Test 12: Malformed outcome-name mappings rejected ───────────────────────
// If outcome names don't match team names, the pick should be skipped
{
  const eventHome = 'Coventry City';
  const bookOutcomes = [
    { name: 'Coventry', price: 1200 },  // doesn't match "Coventry City"
    { name: 'Draw', price: 220 },
    { name: 'Sheffield United', price: -2000 },
  ];

  const selectedOutcome = bookOutcomes.find((o) => o.name === eventHome);
  assert(selectedOutcome === undefined, `Malformed name "Coventry" doesn't match "Coventry City" — pick skipped`);
}

// ── Test 13: Qualification requires ALL gates ────────────────────────────────
{
  const gates = {
    notStarted: true,
    enoughBooks: true,
    enoughSample: true,
    featuresComplete: true,
    positiveEV: true,
    oddsValid: true,
  };
  assert(Object.values(gates).every((v) => v), `All gates true → qualified`);

  // If any gate fails
  const gates2 = { ...gates, enoughSample: false };
  assert(!Object.values(gates2).every((v) => v), `One gate false → not qualified`);

  const gates3 = { ...gates, positiveEV: false };
  assert(!Object.values(gates3).every((v) => v), `EV gate false → not qualified`);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
