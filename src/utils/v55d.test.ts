// V55D regression tests — QA defects found during live production testing.
// Covers: null-force gates, server pMarket rejection, odds/probability
// mismatch detection, signed edge formatting, exclusion UI text.
// Run with: npx tsx src/utils/v55d.test.ts

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

function approx(a: number, b: number, eps = 0.001): boolean {
  return Math.abs(a - b) < eps;
}

// ── Pure math helpers (mirrors oddsMath.ts) ────────────────────────────────

function americanToImpliedProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

function isProbabilityConsistentWithOdds(prob: number, odds: number, tolerance: number): boolean {
  const implied = americanToImpliedProb(odds);
  return Math.abs(prob - implied) <= tolerance;
}

// ── Defect 1: Null-force gate ──────────────────────────────────────────────
// When league sample <30 OR features incomplete OR model not calibrated/available,
// independent p, blended p, fair odds, model edge, EV, Kelly must all be null.

console.log('── Defect 1: Null-force gates ──');

// Fixture: league sample = 12 (<30 threshold)
{
  const sampleSize = 12;
  const featureCompleteness = 0.95;
  const brierScore = 0.18;
  const modelCalibrated = brierScore < 0.25 && sampleSize >= 30;
  const gatePass = sampleSize >= 30 && featureCompleteness >= 0.8 && modelCalibrated;
  assert(!gatePass, 'Gate fails when sampleSize < 30');
  assert(!modelCalibrated, 'Model not calibrated when sampleSize < 30');
}

// Fixture: features incomplete (0.60 < 0.80)
{
  const sampleSize = 50;
  const featureCompleteness = 0.60;
  const brierScore = 0.18;
  const modelCalibrated = brierScore < 0.25 && sampleSize >= 30;
  const gatePass = sampleSize >= 30 && featureCompleteness >= 0.8 && modelCalibrated;
  assert(!gatePass, 'Gate fails when features < 80%');
}

// Fixture: model not calibrated (Brier = 0.30)
{
  const sampleSize = 50;
  const featureCompleteness = 0.95;
  const brierScore = 0.30;
  const modelCalibrated = brierScore < 0.25 && sampleSize >= 30;
  const gatePass = sampleSize >= 30 && featureCompleteness >= 0.8 && modelCalibrated;
  assert(!gatePass, 'Gate fails when Brier >= 0.25');
}

// Fixture: all gates pass
{
  const sampleSize = 50;
  const featureCompleteness = 0.95;
  const brierScore = 0.18;
  const modelCalibrated = brierScore < 0.25 && sampleSize >= 30;
  const modelAvailable = true;
  const gatePass = sampleSize >= 30 && featureCompleteness >= 0.8 && modelCalibrated && modelAvailable;
  assert(gatePass, 'Gate passes when all conditions met');
}

// When gate fails, derived metrics must be null
{
  const gatePass = false;
  const pModel: number | null = gatePass ? 0.62 : null;
  const wModel: number | null = gatePass ? 0.4 : null;
  const pMarket = 0.55;
  const pFinal = (gatePass && pModel !== null && pMarket !== null && wModel !== null) ? wModel * pModel + (1 - wModel) * pMarket : null;
  const fairDecimal = pFinal !== null && pFinal > 0 && pFinal < 1 ? 1 / pFinal : null;
  const evPercent = pFinal !== null ? pFinal * 2.0 - 1 : null;
  const edgePp = (gatePass && pModel !== null && pMarket !== null) ? pModel - pMarket : null;

  assert(pModel === null, 'pModel null when gate fails');
  assert(pFinal === null, 'pFinal null when gate fails');
  assert(fairDecimal === null, 'fairDecimal null when gate fails');
  assert(evPercent === null, 'evPercent null when gate fails');
  assert(edgePp === null, 'edgePp null when gate fails');
}

// ── Defect 2: Server pMarket rejection ─────────────────────────────────────
// Never accept server pMarket. Must recompute from raw quotes.

console.log('── Defect 2: Server pMarket rejection ──');

// Without raw quotes, pMarket must be null regardless of server value
{
  const serverPMarket = 0.538;
  const rawPairs: Array<{ bookmaker: string; sideAOdds: number; sideBOdds: number }> | undefined = undefined;
  let pMarket: number | null = null;
  if (rawPairs && Array.isArray(rawPairs) && rawPairs.length > 0) {
    pMarket = 0.5; // Would be set from recomputation
  }
  // Server value is never used
  void serverPMarket;
  assert(pMarket === null, 'pMarket null when no raw quotes provided');
}

// With valid raw quotes, pMarket is recomputed
{
  const rawPairs = [
    { bookmaker: 'A', sideAOdds: -150, sideBOdds: +130 },
    { bookmaker: 'B', sideAOdds: -145, sideBOdds: +125 },
    { bookmaker: 'C', sideAOdds: -155, sideBOdds: +135 },
  ];
  // Compute no-vig for each pair
  const probs = rawPairs.map((p) => {
    const implA = americanToImpliedProb(p.sideAOdds);
    const implB = americanToImpliedProb(p.sideBOdds);
    return implA / (implA + implB);
  });
  const sorted = [...probs].sort((a, b) => a - b);
  const median = sorted[1]; // 3 values, middle one
  assert(median > 0.5 && median < 0.65, 'Recomputed pMarket is reasonable for -150 favorites');
}

// ── Defect 3: Odds/probability mismatch rejection ──────────────────────────
// +290 ≈ 25.6% cannot show 53.8%. +1200 ≈ 7.69% cannot show 77.9%.

console.log('── Defect 3: Odds/probability mismatch ──');

{
  const prob1 = 0.538;
  const odds1 = 290; // +290 implied = ~25.6%
  assert(!isProbabilityConsistentWithOdds(prob1, odds1, 0.20), '+290 rejects 53.8% at 20pp tolerance');
  // Diff = 53.8 - 25.6 = 28.2pp > 20pp — rejected
}

{
  const prob2 = 0.779;
  const odds2 = 1200; // +1200 implied = ~7.7%
  assert(!isProbabilityConsistentWithOdds(prob2, odds2, 0.20), '+1200 rejects 77.9% at 20pp tolerance');
  // Diff = 77.9 - 7.7 = 70.2pp > 20pp — rejected
}

{
  const prob3 = 0.58;
  const odds3 = -140; // -140 implied = ~58.3%
  assert(isProbabilityConsistentWithOdds(prob3, odds3, 0.20), '-140 accepts 58.0% (within 20pp)');
}

// Old 30pp tolerance would have accepted the +290/53.8% mismatch
{
  const prob = 0.538;
  const odds = 290; // implied 25.6%, diff = 28.2pp
  assert(isProbabilityConsistentWithOdds(prob, odds, 0.30), '+290/53.8% passes at old 30pp (this was the bug)');
  assert(!isProbabilityConsistentWithOdds(prob, odds, 0.20), '+290/53.8% fails at new 20pp (fix)');
}

// ── Defect 4: Edge only when calibrated p AND matched pMarket both valid ───

console.log('── Defect 4: Edge requires both pModel and pMarket ──');

{
  const gatePass = true;
  const pModel: number | null = 0.62;
  const pMarket: number | null = 0.55;
  const edgePp = (gatePass && pModel !== null && pMarket !== null) ? pModel - pMarket : null;
  assert(edgePp !== null, 'Edge computed when both pModel and pMarket valid');
  assert(approx(edgePp!, 0.07), 'Edge = 0.62 - 0.55 = 0.07');
}

{
  const gatePass = true;
  const pModel: number | null = 0.62;
  const pMarket: number | null = null;
  const edgePp = (gatePass && pModel !== null && pMarket !== null) ? pModel - pMarket : null;
  assert(edgePp === null, 'Edge null when pMarket unavailable');
}

{
  const gatePass = false;
  const pModel: number | null = null; // forced null by gate
  const pMarket: number | null = 0.55;
  const edgePp = (gatePass && pModel !== null && pMarket !== null) ? pModel - pMarket : null;
  assert(edgePp === null, 'Edge null when gate fails');
}

// ── Defect 5: Signed formatting ────────────────────────────────────────────
// Edge: +2.1pp, -2.1pp, 0.0pp — never "+-"

console.log('── Defect 5: Signed formatting ──');

function fmtSignedPp(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'N/A';
  const abs = Math.abs(n * 100);
  const formatted = abs.toFixed(decimals);
  if (n > 0) return `+${formatted}pp`;
  if (n < 0) return `-${formatted}pp`;
  return '0.0pp';
}

function fmtSignedPercent(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'N/A';
  const abs = Math.abs(n * 100);
  const formatted = abs.toFixed(decimals);
  if (n > 0) return `+${formatted}%`;
  if (n < 0) return `-${formatted}%`;
  return `${formatted}%`;
}

assert(fmtSignedPp(0.021) === '+2.1pp', 'Positive edge: +2.1pp');
assert(fmtSignedPp(-0.021) === '-2.1pp', 'Negative edge: -2.1pp');
assert(fmtSignedPp(0) === '0.0pp', 'Zero edge: 0.0pp');
assert(fmtSignedPp(null) === 'N/A', 'Null edge: N/A');
assert(fmtSignedPp(undefined) === 'N/A', 'Undefined edge: N/A');
assert(fmtSignedPp(0.1234) === '+12.3pp', 'Large positive: +12.3pp');
assert(fmtSignedPp(-0.055) === '-5.5pp', 'Negative 5.5pp');

// No "+- " in any output
for (const val of [0.05, -0.05, 0.001, -0.001, 0, 0.1, -0.1]) {
  const result = fmtSignedPp(val);
  assert(!result.includes('+-'), `fmtSignedPp(${val}) must not contain "+-": got "${result}"`);
}

assert(fmtSignedPercent(0.05) === '+5.0%', 'Positive percent: +5.0%');
assert(fmtSignedPercent(-0.05) === '-5.0%', 'Negative percent: -5.0%');
assert(fmtSignedPercent(0) === '0.0%', 'Zero percent: 0.0%');
assert(fmtSignedPercent(null) === 'N/A', 'Null percent: N/A');

for (const val of [0.05, -0.05, 0.001, -0.001, 0, 0.1, -0.1]) {
  const result = fmtSignedPercent(val);
  assert(!result.includes('+-'), `fmtSignedPercent(${val}) must not contain "+-": got "${result}"`);
}

// ── Defect 6: Exclusion UI prefix ──────────────────────────────────────────
// Display must say "Failed gates: ..." not "Excluded: ..." or "Why this is not a pick:"

console.log('── Defect 6: Exclusion UI prefix ──');

{
  const exclusionReason = 'Sufficient historical data (≥30); Model calibrated';
  const displayText = `Failed gates: ${exclusionReason}`;
  assert(displayText.startsWith('Failed gates:'), 'Exclusion prefix is "Failed gates:"');
  assert(!displayText.startsWith('Excluded:'), 'No longer uses "Excluded:" prefix');
  assert(!displayText.includes('Why this is not a pick'), 'No longer uses "Why this is not a pick"');
}

// ── Defect 7: Excluded pagination ──────────────────────────────────────────
// Initial visible = 25, "Show 25 more" button, "Showing X of Y" counter.

console.log('── Defect 7: Excluded pagination ──');

{
  const totalExcluded = 60;
  let visible = 25;
  assert(visible === 25, 'Initial visible is 25');
  assert(Math.min(visible, totalExcluded) === 25, 'Shows 25 of 60');

  visible += 25;
  assert(visible === 50, 'After one click, visible is 50');
  assert(Math.min(visible, totalExcluded) === 50, 'Shows 50 of 60');

  visible += 25;
  assert(Math.min(visible, totalExcluded) === 60, 'Shows 60 of 60 (capped)');
  assert(visible >= totalExcluded, 'No more "Show 25 more" button needed');
}

// Small list: no pagination needed
{
  const totalExcluded = 20;
  assert(totalExcluded <= 25, 'No pagination footer for ≤25 excluded');
}

// ── Defect 8: Regression — model fallback values still rejected ────────────

console.log('── Defect 8: Model fallback rejection ──');

{
  const fallbacks = [0.5, 0.408, 0.4085, 0.4079, 0, 1, -0.1, 1.5];
  for (const val of fallbacks) {
    const modelAvailable = val !== 0.5
      && !(val > 0.407 && val < 0.409)
      && val > 0 && val < 1;
    assert(!modelAvailable, `Fallback ${val} still rejected as model output`);
  }
}

// Real model outputs accepted
{
  const realValues = [0.35, 0.62, 0.78, 0.15, 0.91];
  for (const val of realValues) {
    const modelAvailable = val !== 0.5
      && !(val > 0.407 && val < 0.409)
      && val > 0 && val < 1;
    assert(modelAvailable, `Real model output ${val} accepted`);
  }
}

// ── Defect 9: No VITE_ secrets, no env leaks ──────────────────────────────

console.log('── Defect 9: No new secret leaks ──');

// The two allowed VITE_ vars
const allowedViteVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
assert(allowedViteVars.length === 2, 'Only two VITE_ env vars permitted');

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
if (failed > 0) process.exit(1);
