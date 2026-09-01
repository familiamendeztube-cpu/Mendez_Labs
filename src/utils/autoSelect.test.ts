import assert from 'node:assert';
import { autoSelectBestFive } from './autoSelect';
import type { RankedPick } from '@/services/liveData';

let N = 0;
function ok(cond: boolean, msg: string) { assert(cond, msg); N++; }
function eq<T>(a: T, b: T, msg: string) { assert.deepStrictEqual(a, b, msg); N++; }

const future = () => new Date(Date.now() + 86_400_000).toISOString();

function pick(over: Partial<RankedPick> = {}): RankedPick {
  return {
    eventId: `evt-${Math.random().toString(36).slice(2)}`,
    league: 'MLB',
    homeTeam: `Home ${Math.random().toString(36).slice(2, 6)}`,
    awayTeam: `Away ${Math.random().toString(36).slice(2, 6)}`,
    startTime: future(),
    market: 'Moneyline',
    side: 'Home',
    line: '',
    bestOdds: -120,
    bestBookmaker: 'FanDuel',
    consensusProbability: 0.55,
    marketValueEdge: 0.04,
    pModel: 0.6,
    pFinal: 0.58,
    wModel: 0.5,
    fairDecimal: 1.72,
    offeredDecimal: 1.83,
    evPercent: 0.05,
    qualified: true,
    exclusionReason: null,
    qualificationChecks: [],
    bookmakerCount: 6,
    dataCompleteness: 1,
    freshnessMs: 60_000,
    matchConfidence: 1,
    reasoning: 'test',
    riskNote: '',
    source: 'test',
    sourceTimestamp: future(),
    modelVersion: 'elo-v1',
    ...over,
  };
}

// ── Empty board ─────────────────────────────────────────────────────────────
{
  const r = autoSelectBestFive([], 100);
  eq(r.selected.length, 0, 'empty board → 0 selected');
  eq(r.tier, 'none', 'empty board → tier none');
  ok(/catching up|hasn't loaded/i.test(r.explanation ?? ''), 'empty board explains the feed is loading');
}

// ── Tier 1: qualified picks fill the card, one per game, ≤2 per league ──────
{
  const picks = [
    pick({ eventId: 'g1', league: 'MLB', evPercent: 0.09 }),
    pick({ eventId: 'g2', league: 'MLB', evPercent: 0.08 }),
    pick({ eventId: 'g3', league: 'MLB', evPercent: 0.07 }), // 3rd MLB — capped
    pick({ eventId: 'g4', league: 'NBA', evPercent: 0.06 }),
    pick({ eventId: 'g5', league: 'NHL', evPercent: 0.05 }),
    pick({ eventId: 'g6', league: 'NFL', evPercent: 0.04 }),
  ];
  const r = autoSelectBestFive(picks, 1000);
  eq(r.tier, 'model', 'all-qualified board → tier model');
  eq(r.selected.length, 5, 'fills all five slots');
  const leagues = r.selected.map((p) => p.league);
  ok(leagues.filter((l) => l === 'MLB').length <= 2, 'at most 2 from one league when alternatives exist');
  const ids = new Set(r.selected.map((p) => p.eventId));
  eq(ids.size, 5, 'no duplicate games');
}

// ── Tier 2/3: nothing qualifies → market-value / best-available fallback ────
{
  const picks = [
    pick({ eventId: 'm1', qualified: false, evPercent: 0.03, pModel: 0.62, consensusProbability: 0.5, bookmakerCount: 5 }),
    pick({ eventId: 'm2', qualified: false, evPercent: 0.02, pModel: 0.58, consensusProbability: 0.5, bookmakerCount: 4 }),
    pick({ eventId: 'm3', qualified: false, evPercent: -0.01, pModel: 0.55, consensusProbability: 0.56, bookmakerCount: 6 }),
  ];
  const r = autoSelectBestFive(picks, 1000);
  eq(r.tier, 'market', 'no-qualified board → tier market');
  ok(r.selected.length >= 2, 'still returns the playable games it can find');
  ok((r.explanation ?? '').length > 0, 'market tier always explains itself');
}

// ── Bankroll 0 must not dead-end tier 1 ─────────────────────────────────────
{
  const picks = [
    pick({ eventId: 'z1', league: 'MLB' }),
    pick({ eventId: 'z2', league: 'NBA' }),
  ];
  const r = autoSelectBestFive(picks, 0);
  ok(r.selected.length >= 1, 'bankroll 0 still selects something');
}

// ── Past games are never selected ──────────────────────────────────────────
{
  const picks = [
    pick({ eventId: 'p1', startTime: new Date(Date.now() - 3600_000).toISOString() }),
    pick({ eventId: 'p2', league: 'NBA' }),
  ];
  const r = autoSelectBestFive(picks, 1000);
  ok(!r.selected.some((p) => p.eventId === 'p1'), 'a started game is excluded');
}

console.log(`✓ autoSelect: ${N} assertions passed`);
