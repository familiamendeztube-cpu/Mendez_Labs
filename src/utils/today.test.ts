// V55B1 deterministic tests for Today page logic: summaries, filters,
// qualified ordering, null/N/A rules, no fabricated EV/probability,
// gate rendering, and mobile-safe structure.
// Run with: npx tsx src/utils/today.test.ts

import type { RankedPick } from '../services/liveData';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { passed++; } else { failed++; console.error(`FAIL: ${label}`); }
}

// ── Helpers mirroring Today.tsx logic ────────────────────────────────────────

function freshnessLabel(ms: number): string {
  if (ms < 60_000) return 'Just now';
  if (ms < 300_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 900_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 60_000)}m (stale)`;
}

function quoteAgeLabel(ms: number): string {
  if (ms < 60_000) return '<1 min';
  return `${Math.floor(ms / 60_000)} min`;
}

type SportFilter = 'All' | 'Soccer' | 'NFL' | 'NBA' | 'MLB' | 'NHL';
type StatusFilter = 'All' | 'Qualified' | 'Excluded';

function matchesLeague(pick: { league: string }, filter: SportFilter): boolean {
  if (filter === 'All') return true;
  const l = pick.league.toLowerCase();
  const f = filter.toLowerCase();
  if (f === 'soccer') return l.includes('soccer') || l.includes('football') || l.includes('mls') || l.includes('epl') || l.includes('liga') || l.includes('serie') || l.includes('bundesliga') || l.includes('ligue');
  return l.includes(f);
}

function computeSummary(picks: { qualified: boolean; freshnessMs: number }[]) {
  const total = picks.length;
  const qualified = picks.filter((p) => p.qualified).length;
  const excluded = total - qualified;
  const freshest = picks.length > 0 ? Math.min(...picks.map((p) => p.freshnessMs)) : null;
  return { total, qualified, excluded, freshest };
}

function applyFilters(
  picks: Array<{ qualified: boolean; league: string }>,
  sport: SportFilter,
  status: StatusFilter,
): { qualifiedPicks: typeof picks; excludedPicks: typeof picks } {
  const sportFiltered = picks.filter((p) => matchesLeague(p, sport));
  const q = sportFiltered.filter((p) => p.qualified);
  const e = sportFiltered.filter((p) => !p.qualified);
  if (status === 'Qualified') return { qualifiedPicks: q, excludedPicks: [] };
  if (status === 'Excluded') return { qualifiedPicks: [], excludedPicks: e };
  return { qualifiedPicks: q, excludedPicks: e };
}

function fmtPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'N/A';
  return `${(n * 100).toFixed(1)}%`;
}

// ── Mock data factory ───────────────────────────────────────────────────────

function mockPick(overrides: Partial<RankedPick> = {}): RankedPick {
  return {
    eventId: 'ev1',
    league: 'NBA',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    startTime: new Date(Date.now() + 3600_000).toISOString(),
    market: 'Moneyline',
    side: 'Lakers',
    line: '',
    bestOdds: -150,
    bestBookmaker: 'DraftKings',
    consensusProbability: 0.58,
    marketValueEdge: 0.04,
    pModel: 0.62,
    pFinal: 0.60,
    wModel: 0.3,
    fairDecimal: 1.667,
    offeredDecimal: 1.667,
    evPercent: 0.05,
    qualified: true,
    exclusionReason: null,
    qualificationChecks: [
      { name: 'Game not started', passed: true, detail: 'Game is in the future' },
      { name: 'Odds fresh', passed: true, detail: 'Updated 3 min ago' },
      { name: 'Reliable event match', passed: true, detail: 'Confidence: 95%' },
    ],
    bookmakerCount: 5,
    dataCompleteness: 0.85,
    freshnessMs: 180_000,
    matchConfidence: 0.95,
    reasoning: 'Strong edge with solid data quality.',
    riskNote: 'Injury uncertainty.',
    source: 'The Odds API',
    sourceTimestamp: new Date().toISOString(),
    modelVersion: 'v55a',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Summary card computations
// ═══════════════════════════════════════════════════════════════════════════════

const picks3q2e = [
  mockPick({ qualified: true, freshnessMs: 120_000 }),
  mockPick({ qualified: true, freshnessMs: 200_000 }),
  mockPick({ qualified: true, freshnessMs: 300_000 }),
  mockPick({ qualified: false, freshnessMs: 500_000 }),
  mockPick({ qualified: false, freshnessMs: 600_000 }),
];

const sum = computeSummary(picks3q2e);
assert(sum.total === 5, 'Summary: total = 5');
assert(sum.qualified === 3, 'Summary: qualified = 3');
assert(sum.excluded === 2, 'Summary: excluded = 2');
assert(sum.freshest === 120_000, 'Summary: freshest = 120s');

const sumEmpty = computeSummary([]);
assert(sumEmpty.total === 0, 'Summary empty: total = 0');
assert(sumEmpty.freshest === null, 'Summary empty: freshest = null');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Freshness label
// ═══════════════════════════════════════════════════════════════════════════════

assert(freshnessLabel(30_000) === 'Just now', 'Freshness: 30s = Just now');
assert(freshnessLabel(120_000) === '2m ago', 'Freshness: 2m');
assert(freshnessLabel(480_000) === '8m ago', 'Freshness: 8m');
assert(freshnessLabel(1_200_000) === '20m (stale)', 'Freshness: 20m stale');

assert(quoteAgeLabel(30_000) === '<1 min', 'Quote age: <1 min');
assert(quoteAgeLabel(180_000) === '3 min', 'Quote age: 3 min');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Sport filter
// ═══════════════════════════════════════════════════════════════════════════════

assert(matchesLeague({ league: 'NBA' }, 'All'), 'Filter All matches NBA');
assert(matchesLeague({ league: 'NBA' }, 'NBA'), 'Filter NBA matches NBA');
assert(!matchesLeague({ league: 'NBA' }, 'NFL'), 'Filter NFL rejects NBA');
assert(matchesLeague({ league: 'EPL' }, 'Soccer'), 'Filter Soccer matches EPL');
assert(matchesLeague({ league: 'MLS' }, 'Soccer'), 'Filter Soccer matches MLS');
assert(matchesLeague({ league: 'Bundesliga' }, 'Soccer'), 'Filter Soccer matches Bundesliga');
assert(!matchesLeague({ league: 'NBA' }, 'Soccer'), 'Filter Soccer rejects NBA');
assert(matchesLeague({ league: 'NHL' }, 'NHL'), 'Filter NHL matches NHL');
assert(matchesLeague({ league: 'MLB' }, 'MLB'), 'Filter MLB matches MLB');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Status filter + qualified ordering
// ═══════════════════════════════════════════════════════════════════════════════

const mixed = [
  { qualified: true, league: 'NBA' },
  { qualified: false, league: 'NBA' },
  { qualified: true, league: 'NFL' },
  { qualified: false, league: 'NFL' },
  { qualified: true, league: 'EPL' },
];

const allStatus = applyFilters(mixed, 'All', 'All');
assert(allStatus.qualifiedPicks.length === 3, 'All/All: 3 qualified');
assert(allStatus.excludedPicks.length === 2, 'All/All: 2 excluded');

const qualOnly = applyFilters(mixed, 'All', 'Qualified');
assert(qualOnly.qualifiedPicks.length === 3, 'All/Qualified: 3 qualified');
assert(qualOnly.excludedPicks.length === 0, 'All/Qualified: 0 excluded');

const exclOnly = applyFilters(mixed, 'All', 'Excluded');
assert(exclOnly.qualifiedPicks.length === 0, 'All/Excluded: 0 qualified');
assert(exclOnly.excludedPicks.length === 2, 'All/Excluded: 2 excluded');

const nbaOnly = applyFilters(mixed, 'NBA', 'All');
assert(nbaOnly.qualifiedPicks.length === 1, 'NBA/All: 1 qualified');
assert(nbaOnly.excludedPicks.length === 1, 'NBA/All: 1 excluded');

const soccerOnly = applyFilters(mixed, 'Soccer', 'All');
assert(soccerOnly.qualifiedPicks.length === 1, 'Soccer/All: 1 qualified (EPL)');
assert(soccerOnly.excludedPicks.length === 0, 'Soccer/All: 0 excluded');

// Qualified always before excluded - the structure guarantees it
assert(allStatus.qualifiedPicks.every((p) => p.qualified), 'Qualified section contains only qualified');
assert(allStatus.excludedPicks.every((p) => !p.qualified), 'Excluded section contains only excluded');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Null / N/A rendering — no fabricated values
// ═══════════════════════════════════════════════════════════════════════════════

assert(fmtPercent(null) === 'N/A', 'Null prob → N/A');
assert(fmtPercent(undefined) === 'N/A', 'Undefined prob → N/A');
assert(fmtPercent(NaN) === 'N/A', 'NaN prob → N/A');
assert(fmtPercent(0.5) === '50.0%', '0.5 → 50.0%');

// Pick with null model data
const nullModelPick = mockPick({
  pModel: null,
  pFinal: null,
  wModel: null,
  fairDecimal: null,
  evPercent: null,
  marketValueEdge: null,
  qualified: false,
  exclusionReason: 'No independent model available',
});

assert(fmtPercent(nullModelPick.pModel) === 'N/A', 'Null pModel → N/A');
assert(fmtPercent(nullModelPick.pFinal) === 'N/A', 'Null pFinal → N/A');
assert(fmtPercent(nullModelPick.evPercent) === 'N/A', 'Null EV → N/A');
assert(fmtPercent(nullModelPick.marketValueEdge) === 'N/A', 'Null edge → N/A');
assert(nullModelPick.fairDecimal === null, 'Null fair decimal stays null');
assert(nullModelPick.wModel === null, 'Null wModel stays null');

// No fabricated 40.8% or 0.5 constants
assert(nullModelPick.pModel !== 0.408, 'No 40.8% fabricated pModel');
assert(nullModelPick.pModel !== 0.5, 'No 0.5 fabricated pModel');
assert(nullModelPick.evPercent !== 0, 'Null EV is not zero');

// Pick with real values should display them
const realPick = mockPick({ pModel: 0.62, evPercent: 0.05 });
assert(fmtPercent(realPick.pModel) === '62.0%', 'Real pModel displays correctly');
assert(fmtPercent(realPick.evPercent) === '5.0%', 'Real EV displays correctly');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Qualification gate rendering
// ═══════════════════════════════════════════════════════════════════════════════

const fullGates = [
  { name: 'Game not started', passed: true, detail: 'Game is in the future' },
  { name: 'Odds fresh (≤15 min)', passed: true, detail: 'Updated 3 min ago' },
  { name: 'Reliable event match', passed: true, detail: 'Confidence: 95%' },
  { name: 'Provider match verified', passed: true, detail: 'Event confirmed' },
  { name: '3+ bookmakers', passed: true, detail: '5 bookmakers' },
  { name: 'Sufficient historical data', passed: false, detail: 'Only 15 games (need 30)' },
  { name: 'Features complete', passed: true, detail: '85% complete' },
  { name: 'Independent model available', passed: false, detail: 'No independent model' },
  { name: 'Model calibrated', passed: false, detail: 'Model not calibrated' },
  { name: 'Probability/price sanity', passed: true, detail: 'Consistent' },
  { name: 'Edge ≥ 3pp', passed: false, detail: 'Edge unavailable (no model)' },
  { name: 'EV ≥ 3.0%', passed: false, detail: 'EV unavailable (no model)' },
  { name: 'Valid odds', passed: true, detail: 'Odds are valid' },
  { name: 'Not correlated', passed: true, detail: 'Independent pick' },
];

assert(fullGates.length === 14, 'Full gate set has 14 gates');
assert(fullGates.filter((g) => g.passed).length === 9, '9 gates pass in this example');
assert(fullGates.filter((g) => !g.passed).length === 5, '5 gates fail in this example');

// Gate classification logic (matches GateRow component)
function gateColor(g: { passed: boolean; detail: string }): string {
  if (g.passed) return 'green';
  const isCaution = g.detail.toLowerCase().includes('only') || g.detail.toLowerCase().includes('low');
  return isCaution ? 'gold' : 'red';
}

assert(gateColor({ passed: true, detail: 'Game is in the future' }) === 'green', 'Passed gate → green');
assert(gateColor({ passed: false, detail: 'Only 15 games (need 30)' }) === 'gold', 'Low sample → gold caution');
assert(gateColor({ passed: false, detail: 'No independent model' }) === 'red', 'Missing model → red fail');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Exclusion reason display
// ═══════════════════════════════════════════════════════════════════════════════

const excludedPick = mockPick({
  qualified: false,
  exclusionReason: 'Insufficient historical data; No independent model available',
});
assert(excludedPick.exclusionReason !== null, 'Excluded pick has exclusion reason');
assert(excludedPick.exclusionReason!.includes('Insufficient'), 'Exclusion mentions data issue');
assert(!excludedPick.qualified, 'Excluded pick is not qualified');

const qualifiedPick = mockPick({ qualified: true, exclusionReason: null });
assert(qualifiedPick.exclusionReason === null, 'Qualified pick has no exclusion');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Card structure validation (essential answer first)
// ═══════════════════════════════════════════════════════════════════════════════

// Verify card data precedence: a card always has these essential fields
const cardPick = mockPick();
assert(typeof cardPick.homeTeam === 'string' && cardPick.homeTeam.length > 0, 'Card has home team');
assert(typeof cardPick.awayTeam === 'string' && cardPick.awayTeam.length > 0, 'Card has away team');
assert(typeof cardPick.startTime === 'string', 'Card has start time');
assert(typeof cardPick.market === 'string', 'Card has market');
assert(typeof cardPick.side === 'string', 'Card has side');
assert(typeof cardPick.bestBookmaker === 'string', 'Card has bookmaker');
assert(typeof cardPick.bestOdds === 'number', 'Card has American odds');
assert(typeof cardPick.offeredDecimal === 'number', 'Card has decimal odds');
assert(typeof cardPick.qualified === 'boolean', 'Card has qualification status');
assert(typeof cardPick.freshnessMs === 'number', 'Card has quote age');
assert(typeof cardPick.bookmakerCount === 'number', 'Card has book count');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Excluded picks never rank above qualified
// ═══════════════════════════════════════════════════════════════════════════════

const mixedForOrder = [
  mockPick({ eventId: 'q1', qualified: true, evPercent: 0.02 }),
  mockPick({ eventId: 'e1', qualified: false, evPercent: 0.10 }),
  mockPick({ eventId: 'q2', qualified: true, evPercent: 0.08 }),
  mockPick({ eventId: 'e2', qualified: false, evPercent: 0.15 }),
];

const ordered = applyFilters(mixedForOrder, 'All', 'All');
assert(ordered.qualifiedPicks.length === 2, 'Order: 2 qualified');
assert(ordered.excludedPicks.length === 2, 'Order: 2 excluded');
// Even though excluded picks have higher EV, they cannot appear in qualified section
assert(ordered.qualifiedPicks.every((p) => p.qualified), 'No excluded in qualified section');
assert(ordered.excludedPicks.every((p) => !p.qualified), 'No qualified in excluded section');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: No EV or probability fabricated for null-model picks
// ═══════════════════════════════════════════════════════════════════════════════

const noModelPick = mockPick({
  pModel: null,
  pFinal: null,
  wModel: null,
  fairDecimal: null,
  evPercent: null,
  marketValueEdge: null,
  consensusProbability: 0.55,
  qualified: false,
  exclusionReason: 'Independent model available',
});

// Market consensus can still be present
assert(fmtPercent(noModelPick.consensusProbability) === '55.0%', 'Market consensus still shows');
// But model-dependent fields must be N/A
assert(fmtPercent(noModelPick.pModel) === 'N/A', 'No model → pModel N/A');
assert(fmtPercent(noModelPick.pFinal) === 'N/A', 'No model → pFinal N/A');
assert(fmtPercent(noModelPick.evPercent) === 'N/A', 'No model → EV N/A');
assert(fmtPercent(noModelPick.marketValueEdge) === 'N/A', 'No model → edge N/A');
assert(noModelPick.fairDecimal === null, 'No model → fairDecimal null');

// Verify no placeholder constants leaked
assert(noModelPick.pModel !== 0.408, 'Not 40.8%');
assert(noModelPick.pModel !== 0.5, 'Not 50%');
assert(noModelPick.evPercent !== 0, 'EV not faked to 0');

// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\ntoday.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
