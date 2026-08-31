// V55B2 deterministic tests for PickFive auto-select, correlation guard,
// Kelly math, caps, null stake, lock rejection, diversification.
// Run with: npx tsx src/utils/pickFive.test.ts

import { quarterKellyStake, isCorrelatedPick } from './valueEngine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { passed++; } else { failed++; console.error(`FAIL: ${label}`); }
}

function assertClose(a: number, b: number, eps: number, label: string) {
  if (Math.abs(a - b) < eps) { passed++; } else { failed++; console.error(`FAIL: ${label} (got ${a}, expected ${b})`); }
}

// ── Mock pick factory ───────────────────────────────────────────────────────

interface MockPick {
  eventId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  market: string;
  side: string;
  line: string;
  bestOdds: number;
  bestBookmaker: string;
  consensusProbability: number | null;
  marketValueEdge: number | null;
  pModel: number | null;
  pFinal: number | null;
  wModel: number | null;
  fairDecimal: number | null;
  offeredDecimal: number;
  evPercent: number | null;
  qualified: boolean;
  exclusionReason: string | null;
  qualificationChecks: Array<{ name: string; passed: boolean; detail: string }>;
  bookmakerCount: number;
  dataCompleteness: number;
  freshnessMs: number;
  matchConfidence: number;
  reasoning: string;
  riskNote: string;
  source: string;
  sourceTimestamp: string;
  modelVersion: string;
}

function mockPick(overrides: Partial<MockPick> = {}): MockPick {
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
    offeredDecimal: 1.80,
    evPercent: 0.08,
    qualified: true,
    exclusionReason: null,
    qualificationChecks: [],
    bookmakerCount: 5,
    dataCompleteness: 0.85,
    freshnessMs: 180_000,
    matchConfidence: 0.95,
    reasoning: 'Strong value.',
    riskNote: '',
    source: 'The Odds API',
    sourceTimestamp: new Date().toISOString(),
    modelVersion: 'v55a',
    ...overrides,
  };
}

// ── Auto-select scoring (mirrors PickFive.tsx export) ───────────────────────

const FRESHNESS_CAP_MS = 900_000;

function autoSelectScore(pick: MockPick): number {
  if (!pick.qualified) return -Infinity;
  if (pick.pFinal === null || pick.evPercent === null) return -Infinity;
  const evScore = Math.max(0, pick.evPercent) * 0.4;
  const qualityScore = pick.dataCompleteness * 0.3;
  const freshScore = Math.max(0, 1 - pick.freshnessMs / FRESHNESS_CAP_MS) * 0.3;
  return evScore + qualityScore + freshScore;
}

function autoSelectBestFive(
  rankedPicks: MockPick[],
  bankroll: number,
): { selected: MockPick[]; explanation: string | null } {
  const eligible = rankedPicks
    .filter((p) => p.qualified && p.pFinal !== null && p.evPercent !== null)
    .sort((a, b) => autoSelectScore(b) - autoSelectScore(a));

  if (eligible.length === 0) {
    return { selected: [], explanation: 'No qualified predictions with complete probability data are available right now.' };
  }

  const selected: MockPick[] = [];
  const seenEvents = new Set<string>();
  const seenLeagues = new Map<string, number>();

  for (const pick of eligible) {
    if (selected.length >= 5) break;
    if (seenEvents.has(pick.eventId)) continue;
    if (isCorrelatedPick(pick, selected)) continue;

    const leagueCount = seenLeagues.get(pick.league) ?? 0;
    const eligibleAfter = eligible.filter(
      (p) =>
        p.league !== pick.league &&
        !seenEvents.has(p.eventId) &&
        !isCorrelatedPick(p, [...selected, pick]),
    );
    if (leagueCount >= 2 && eligibleAfter.length > 0 && selected.length < 4) continue;

    const { stake } = quarterKellyStake(pick.pFinal, pick.offeredDecimal, bankroll);
    if (stake <= 0) continue;

    selected.push(pick);
    seenEvents.add(pick.eventId);
    seenLeagues.set(pick.league, leagueCount + 1);
  }

  const explanation = selected.length < 5
    ? `Only ${selected.length} prediction${selected.length === 1 ? '' : 's'} passed all qualification gates and diversification checks. Remaining slots stay empty until more data is available.`
    : null;

  return { selected, explanation };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Eligibility — only qualified + complete picks
// ═══════════════════════════════════════════════════════════════════════════════

const excludedPick = mockPick({ eventId: 'ex1', qualified: false });
const nullModelPick = mockPick({ eventId: 'nm1', pFinal: null, evPercent: null });
const qualifiedPick = mockPick({ eventId: 'q1', qualified: true, pFinal: 0.6, evPercent: 0.05 });

assert(autoSelectScore(excludedPick) === -Infinity, 'Excluded pick scores -Infinity');
assert(autoSelectScore(nullModelPick) === -Infinity, 'Null-model pick scores -Infinity');
assert(autoSelectScore(qualifiedPick) > 0, 'Qualified pick scores positive');

const { selected: fromExcluded } = autoSelectBestFive([excludedPick, nullModelPick], 100);
assert(fromExcluded.length === 0, 'No excluded/null picks selected');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Ranking — risk-adjusted value, not raw EV
// ═══════════════════════════════════════════════════════════════════════════════

const highEvLowQuality = mockPick({ eventId: 'a1', homeTeam: 'T1', awayTeam: 'T2', league: 'NBA', evPercent: 0.12, dataCompleteness: 0.3, freshnessMs: 800_000 });
const modEvHighQuality = mockPick({ eventId: 'b1', homeTeam: 'T3', awayTeam: 'T4', league: 'NFL', evPercent: 0.06, dataCompleteness: 0.95, freshnessMs: 60_000 });

const scoreA = autoSelectScore(highEvLowQuality);
const scoreB = autoSelectScore(modEvHighQuality);
assert(scoreB > scoreA, 'High-quality moderate-EV beats low-quality high-EV');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Duplicate game guard — max one market per event
// ═══════════════════════════════════════════════════════════════════════════════

const game1ml = mockPick({ eventId: 'g1', homeTeam: 'Lakers', awayTeam: 'Celtics', market: 'Moneyline', side: 'Lakers', league: 'NBA', evPercent: 0.08, pFinal: 0.6, offeredDecimal: 1.8 });
const game1total = mockPick({ eventId: 'g1', homeTeam: 'Lakers', awayTeam: 'Celtics', market: 'Total', side: 'Over 220', league: 'NBA', evPercent: 0.09, pFinal: 0.6, offeredDecimal: 1.8 });
const game2 = mockPick({ eventId: 'g2', homeTeam: 'Heat', awayTeam: 'Bucks', league: 'NBA', evPercent: 0.07, pFinal: 0.6, offeredDecimal: 1.8 });

const { selected: noDupes } = autoSelectBestFive([game1ml, game1total, game2], 100);
const game1Count = noDupes.filter((p) => p.eventId === 'g1').length;
assert(game1Count <= 1, 'Max one market per game (eventId)');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Correlation guard — same team/event blocked
// ═══════════════════════════════════════════════════════════════════════════════

assert(
  isCorrelatedPick(
    { eventId: 'g1', market: 'ML', side: 'A', homeTeam: 'Lakers', awayTeam: 'Celtics' },
    [{ eventId: 'g1', market: 'Total', side: 'Over', homeTeam: 'Lakers', awayTeam: 'Celtics' }],
  ),
  'Same eventId is correlated',
);

assert(
  isCorrelatedPick(
    { eventId: 'g3', market: 'ML', side: 'A', homeTeam: 'Lakers', awayTeam: 'Heat' },
    [{ eventId: 'g2', market: 'ML', side: 'B', homeTeam: 'Lakers', awayTeam: 'Celtics' }],
  ),
  'Same team across events is correlated',
);

assert(
  !isCorrelatedPick(
    { eventId: 'g3', market: 'ML', side: 'A', homeTeam: 'Nets', awayTeam: 'Hawks' },
    [{ eventId: 'g2', market: 'ML', side: 'B', homeTeam: 'Lakers', awayTeam: 'Celtics' }],
  ),
  'Different teams and events are not correlated',
);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Diversification — spread across leagues
// ═══════════════════════════════════════════════════════════════════════════════

const diversePicks = [
  mockPick({ eventId: 'n1', homeTeam: 'T1', awayTeam: 'T2', league: 'NBA', evPercent: 0.10, pFinal: 0.6, offeredDecimal: 1.8, dataCompleteness: 0.9, freshnessMs: 60_000 }),
  mockPick({ eventId: 'n2', homeTeam: 'T3', awayTeam: 'T4', league: 'NBA', evPercent: 0.09, pFinal: 0.6, offeredDecimal: 1.8, dataCompleteness: 0.9, freshnessMs: 60_000 }),
  mockPick({ eventId: 'n3', homeTeam: 'T5', awayTeam: 'T6', league: 'NBA', evPercent: 0.08, pFinal: 0.6, offeredDecimal: 1.8, dataCompleteness: 0.9, freshnessMs: 60_000 }),
  mockPick({ eventId: 'f1', homeTeam: 'F1', awayTeam: 'F2', league: 'NFL', evPercent: 0.06, pFinal: 0.6, offeredDecimal: 1.8, dataCompleteness: 0.9, freshnessMs: 60_000 }),
  mockPick({ eventId: 'm1', homeTeam: 'M1', awayTeam: 'M2', league: 'MLB', evPercent: 0.05, pFinal: 0.6, offeredDecimal: 1.8, dataCompleteness: 0.9, freshnessMs: 60_000 }),
  mockPick({ eventId: 'h1', homeTeam: 'H1', awayTeam: 'H2', league: 'NHL', evPercent: 0.04, pFinal: 0.6, offeredDecimal: 1.8, dataCompleteness: 0.9, freshnessMs: 60_000 }),
];

const { selected: diverseResult } = autoSelectBestFive(diversePicks, 100);
const leagueCounts = new Map<string, number>();
for (const p of diverseResult) {
  leagueCounts.set(p.league, (leagueCounts.get(p.league) ?? 0) + 1);
}
const maxInOneLeague = Math.max(...leagueCounts.values());
assert(maxInOneLeague <= 2, 'Diversification: max 2 picks from any single league when alternatives exist');
assert(leagueCounts.size >= 3, 'Diversification: at least 3 different leagues used');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Fewer than five — honest count + explanation
// ═══════════════════════════════════════════════════════════════════════════════

const onlyTwo = [
  mockPick({ eventId: 'a1', homeTeam: 'A1', awayTeam: 'A2', league: 'NBA', pFinal: 0.6, evPercent: 0.05, offeredDecimal: 1.8 }),
  mockPick({ eventId: 'b1', homeTeam: 'B1', awayTeam: 'B2', league: 'NFL', pFinal: 0.6, evPercent: 0.05, offeredDecimal: 1.8 }),
];
const { selected: twoResult, explanation: twoExpl } = autoSelectBestFive(onlyTwo, 100);
assert(twoResult.length === 2, 'Fewer-than-5: only 2 selected when 2 available');
assert(twoExpl !== null, 'Fewer-than-5: explanation provided');
assert(twoExpl!.includes('2'), 'Explanation mentions actual count');

const { selected: zeroResult, explanation: zeroExpl } = autoSelectBestFive([], 100);
assert(zeroResult.length === 0, 'Zero picks: empty list');
assert(zeroExpl !== null, 'Zero picks: explanation provided');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Quarter-Kelly math
// ═══════════════════════════════════════════════════════════════════════════════

// pFinal=0.6, decimal=1.8, bankroll=100
// fullKelly = (0.6*1.8 - 1) / (1.8 - 1) = 0.08/0.8 = 0.1
// quarterKelly = 0.025 → stake = $2.50
// Cap: 1% of 100 = $1.00 → capped at $1.00
const k1 = quarterKellyStake(0.6, 1.8, 100);
assertClose(k1.stake, 1.0, 0.01, 'Kelly: $2.50 raw capped at 1% = $1.00');
assert(k1.capped === true, 'Kelly: result is capped');

// pFinal=0.55, decimal=2.0, bankroll=100
// fullKelly = (0.55*2.0 - 1) / (2.0 - 1) = 0.1/1.0 = 0.1
// quarterKelly = 0.025 → $2.50 capped at $1.00
const k2 = quarterKellyStake(0.55, 2.0, 100);
assertClose(k2.stake, 1.0, 0.01, 'Kelly: pFinal=0.55, decimal=2.0 → $1.00 (capped)');

// Larger bankroll: pFinal=0.52, decimal=2.1, bankroll=10000
// fullKelly = (0.52*2.1 - 1) / (2.1 - 1) = 0.092/1.1 = 0.08363...
// quarterKelly = 0.02091 → $209.09 capped at 1% = $100
const k3 = quarterKellyStake(0.52, 2.1, 10000);
assertClose(k3.stake, 100.0, 0.01, 'Kelly: large bankroll capped at 1%');
assert(k3.capped === true, 'Kelly: large bankroll is capped');

// No edge: pFinal=0.4, decimal=2.0
// fullKelly = (0.4*2.0 - 1) / (2.0 - 1) = -0.2/1.0 = -0.2 → 0
const k4 = quarterKellyStake(0.4, 2.0, 100);
assert(k4.stake === 0, 'Kelly: negative kelly → $0 stake');
assert(k4.capReason?.includes('Negative') === true, 'Kelly: negative kelly reason');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: 2% absolute cap
// ═══════════════════════════════════════════════════════════════════════════════

// maxPerPickPct=0.02: pFinal=0.7, decimal=1.5, bankroll=1000
// fullKelly = (0.7*1.5 - 1) / (1.5 - 1) = 0.05/0.5 = 0.1
// quarterKelly = 0.025 → $25.00 → 2% cap = $20 → capped
const k5 = quarterKellyStake(0.7, 1.5, 1000, 0.02);
assertClose(k5.stake, 20.0, 0.01, '2% absolute cap: $25 raw → $20 capped');
assert(k5.capped === true, '2% absolute cap is applied');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Null stake — missing probability
// ═══════════════════════════════════════════════════════════════════════════════

const kNull1 = quarterKellyStake(null, 1.8, 100);
assert(kNull1.stake === 0, 'Null pFinal → $0 stake');
assert(kNull1.capReason!.includes('Missing'), 'Null pFinal reason');

const kNull2 = quarterKellyStake(0.6, null, 100);
assert(kNull2.stake === 0, 'Null odds → $0 stake');

const kNull3 = quarterKellyStake(NaN, 1.8, 100);
assert(kNull3.stake === 0, 'NaN pFinal → $0 stake');

const kNull4 = quarterKellyStake(0.6, NaN, 100);
assert(kNull4.stake === 0, 'NaN odds → $0 stake');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: Lock rejection — unqualified picks not selectable
// ═══════════════════════════════════════════════════════════════════════════════

// Unqualified picks get -Infinity score and 0 stake
const unqualified = mockPick({ qualified: false, pFinal: 0.6, evPercent: 0.05 });
assert(autoSelectScore(unqualified) === -Infinity, 'Unqualified picks cannot be auto-selected');

const nullEv = mockPick({ qualified: true, pFinal: 0.6, evPercent: null });
assert(autoSelectScore(nullEv) === -Infinity, 'Null EV picks cannot be auto-selected');

const nullP = mockPick({ qualified: true, pFinal: null, evPercent: 0.05 });
assert(autoSelectScore(nullP) === -Infinity, 'Null pFinal picks cannot be auto-selected');

// Zero-stake picks excluded from auto-select
const noEdgePick = mockPick({ eventId: 'ne1', homeTeam: 'NE1', awayTeam: 'NE2', pFinal: 0.35, offeredDecimal: 2.5, evPercent: 0.01 });
const { stake: neStake } = quarterKellyStake(noEdgePick.pFinal, noEdgePick.offeredDecimal, 100);
// fullKelly = (0.35*2.5 - 1)/(2.5-1) = -0.125/1.5 < 0 → stake = 0
assert(neStake === 0, 'No-edge pick → $0 stake → excluded from auto-select');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: Daily exposure cap
// ═══════════════════════════════════════════════════════════════════════════════

const kExposure = quarterKellyStake(0.6, 1.8, 100, 0.01, 0.05, 4.5);
assert(kExposure.stake <= 0.5, 'Daily exposure cap limits remaining stake');
assert(kExposure.stake >= 0, 'Daily exposure stake is non-negative');

const kExposureFull = quarterKellyStake(0.6, 1.8, 100, 0.01, 0.05, 5.0);
assert(kExposureFull.stake === 0, 'At daily exposure limit → $0 stake');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: Correlation guard edge cases
// ═══════════════════════════════════════════════════════════════════════════════

assert(
  !isCorrelatedPick(
    { eventId: 'x1', market: 'ML', side: 'A', homeTeam: 'X', awayTeam: 'Y' },
    [],
  ),
  'No existing picks → not correlated',
);

assert(
  isCorrelatedPick(
    { eventId: 'x2', market: 'ML', side: 'B', homeTeam: 'X', awayTeam: 'Z' },
    [{ eventId: 'x1', market: 'ML', side: 'A', homeTeam: 'X', awayTeam: 'Y' }],
  ),
  'Same homeTeam → correlated',
);

assert(
  isCorrelatedPick(
    { eventId: 'x3', market: 'ML', side: 'B', homeTeam: 'Z', awayTeam: 'Y' },
    [{ eventId: 'x1', market: 'ML', side: 'A', homeTeam: 'X', awayTeam: 'Y' }],
  ),
  'Same awayTeam → correlated',
);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: Full 5-pick selection with proper order
// ═══════════════════════════════════════════════════════════════════════════════

const fivePicks = [
  mockPick({ eventId: 'p1', homeTeam: 'A1', awayTeam: 'A2', league: 'NBA', evPercent: 0.10, dataCompleteness: 0.9, freshnessMs: 60_000, pFinal: 0.6, offeredDecimal: 1.8 }),
  mockPick({ eventId: 'p2', homeTeam: 'B1', awayTeam: 'B2', league: 'NFL', evPercent: 0.08, dataCompleteness: 0.9, freshnessMs: 60_000, pFinal: 0.6, offeredDecimal: 1.8 }),
  mockPick({ eventId: 'p3', homeTeam: 'C1', awayTeam: 'C2', league: 'MLB', evPercent: 0.06, dataCompleteness: 0.85, freshnessMs: 120_000, pFinal: 0.6, offeredDecimal: 1.8 }),
  mockPick({ eventId: 'p4', homeTeam: 'D1', awayTeam: 'D2', league: 'NHL', evPercent: 0.05, dataCompleteness: 0.8, freshnessMs: 120_000, pFinal: 0.6, offeredDecimal: 1.8 }),
  mockPick({ eventId: 'p5', homeTeam: 'E1', awayTeam: 'E2', league: 'Soccer', evPercent: 0.04, dataCompleteness: 0.8, freshnessMs: 180_000, pFinal: 0.6, offeredDecimal: 1.8 }),
];

const { selected: fullFive, explanation: fullExpl } = autoSelectBestFive(fivePicks, 100);
assert(fullFive.length === 5, 'Full 5 picks selected');
assert(fullExpl === null, 'No explanation when 5 are selected');
const ids = new Set(fullFive.map((p) => p.eventId));
assert(ids.size === 5, 'All 5 picks are unique events');

// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\npickFive.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
