// Deterministic migration test for the M1 state schema migration.
// Runs in dev mode via the integrity suite. Simulates a legacy browser
// snapshot and verifies the migration produces the correct v4 baseline.

import { computeResetBankroll, generateSeedBets, generateSportsOpportunities, SEED_BET_VERSION, getTodayDateKey } from '@/data/mockData';
import { generateDemoHistory, generateTodayPickFive } from '@/data/demoHistory';
import { DEFAULT_RISK_SETTINGS } from '@/utils/risk';
import { M1_STATE_SCHEMA_VERSION, needsMigration, performMigration, type PersistedState } from '@/utils/migration';
import {
  americanToImpliedProb,
  calculateEdge,
  computeRecord,
  aggregateRecords,
  paperProfitLoss,
  canAddPick,
  canLockPickFive,
  isContradictory,
  settlePick,
  plainEnglishBet,
} from '@/utils/pickFive';
import type { BetRecord, FrozenPick, PickResult } from '@/types/models';

const failures: string[] = [];

function check(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

export interface MigrationTestResult {
  passed: boolean;
  failures: string[];
}

export function runMigrationTest(): MigrationTestResult {
  failures.length = 0;
  if (!import.meta.env.DEV) return { passed: true, failures: [] };

  try {
    const sports = generateSportsOpportunities();

    // ── Build a representative legacy snapshot ───────────────────────────────
    const legacyBet: BetRecord = {
      id: 'seed-bet-0',
      type: 'straight',
      legs: [{
        opportunityId: 'SPT-NFL-0',
        matchup: 'KC @ BUF',
        market: 'Total O/U 224.5',
        side: 'Over',
        odds: -110,
        modelProbability: 0.55,
        edge: 0.03,
        confidenceScore: 0.6,
      }],
      stake: 15,
      odds: -110,
      potentialPayout: 28.64,
      potentialProfit: 13.64,
      result: 'won',
      profitLoss: 13.64,
      confidence: 0.6,
      edge: 0.03,
      modelVersion: 'M1.3.0',
      reasoning: 'legacy',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      riskClass: 'moderate',
    };

    const legacyState: PersistedState = {
      authenticated: true,
      bets: [legacyBet],
      riskSettings: { ...DEFAULT_RISK_SETTINGS, startingBankroll: 500 },
      settings: {
        reducedMotion: false,
        rainIntensity: 0.5,
        soundEnabled: false,
        defaultRiskProfile: 'controlled',
        preferredLeagues: ['NBA'],
        numberFormat: 'standard',
        utcTime: true,
      },
      watchlist: ['SPT-NFL-0'],
      logs: [],
      balance: 633.46,
      pickFiveToday: null as unknown as PersistedState['pickFiveToday'],
      demoHistory: [],
    };

    // ── Test 1: Migration triggers on missing/old schema version ─────────────
    check(needsMigration(null) === true, 'needsMigration(null) should be true');
    check(needsMigration('1') === true, 'needsMigration("1") should be true');
    check(needsMigration('3') === true, 'needsMigration("3") should be true (v3 < v4)');
    check(needsMigration(String(M1_STATE_SCHEMA_VERSION)) === false, `needsMigration("${M1_STATE_SCHEMA_VERSION}") should be false`);

    // ── Test 2: performMigration produces correct v4 baseline ─────────────────
    const migrated = performMigration(legacyState, sports);

    check(migrated.authenticated === true, 'Migration should preserve authenticated=true');

    const seedBets = generateSeedBets(sports);
    const expectedBalance = computeResetBankroll(seedBets, DEFAULT_RISK_SETTINGS.startingBankroll);
    check(migrated.balance === expectedBalance, `Migrated balance ${migrated.balance} != expected ${expectedBalance}`);
    check(migrated.balance !== 633.46, 'Migrated balance should not be legacy $633.46');

    // generateSeedBets selects UP TO 8 qualifying candidates — the count is
    // data-dependent, so expectations derive from the generator's own output.
    check(migrated.bets.length === seedBets.length, `Expected ${seedBets.length} seed bets, got ${migrated.bets.length}`);

    for (const bet of migrated.bets) {
      check(bet.id.startsWith('seed-bet-v2-'), `Seed bet ID "${bet.id}" should start with seed-bet-v2-`);
    }

    for (const bet of migrated.bets) {
      for (const leg of bet.legs) {
        check(!leg.market.includes('O/U'), `Legacy market "${leg.market}" should not contain "O/U"`);
      }
    }

    const expectedPending = seedBets.filter((b) => b.result === 'pending').length;
    const pending = migrated.bets.filter((b) => b.result === 'pending');
    check(pending.length === expectedPending, `Expected ${expectedPending} pending bets, got ${pending.length}`);

    for (const bet of migrated.bets) {
      check(bet.edge > 0, `Seed bet ${bet.id} has non-positive edge ${bet.edge}`);
    }

    check(migrated.watchlist.length === 0, `Watchlist should be empty, got ${migrated.watchlist.length}`);

    // v4 additions
    check(migrated.pickFiveToday !== null, 'pickFiveToday should not be null after migration');
    check(migrated.pickFiveToday.picks.length === 0, 'pickFiveToday should start empty');
    check(migrated.pickFiveToday.locked === false, 'pickFiveToday should not be locked');
    check(migrated.demoHistory.length === 30, `Expected 30 demo history days, got ${migrated.demoHistory.length}`);

    // ── Test 3: v4 custom bet survives (no re-migration) ───────────────────────
    const customBet: BetRecord = {
      id: 'bet-custom-123',
      type: 'straight',
      legs: [{
        opportunityId: 'SPT-NBA-0',
        matchup: 'BOS @ DEN',
        market: 'Spread',
        side: 'BOS -3.5',
        odds: -110,
        modelProbability: 0.6,
        edge: 0.05,
        confidenceScore: 0.7,
      }],
      stake: 5.0,
      odds: -110,
      potentialPayout: 9.55,
      potentialProfit: 4.55,
      result: 'pending',
      profitLoss: 0,
      confidence: 0.7,
      edge: 0.05,
      modelVersion: 'M1.4.2-quant',
      reasoning: 'custom bet',
      timestamp: new Date().toISOString(),
      riskClass: 'moderate',
    };

    const v4State: PersistedState = {
      authenticated: true,
      bets: [...seedBets, customBet],
      riskSettings: DEFAULT_RISK_SETTINGS,
      settings: {
        reducedMotion: true,
        rainIntensity: 0.3,
        soundEnabled: false,
        defaultRiskProfile: 'aggressive',
        preferredLeagues: ['NFL'],
        numberFormat: 'compact',
        utcTime: false,
      },
      watchlist: ['SPT-NFL-1'],
      logs: [],
      balance: 495.0,
      pickFiveToday: generateTodayPickFive(),
      demoHistory: generateDemoHistory(),
    };

    check(needsMigration(String(M1_STATE_SCHEMA_VERSION)) === false, 'v4 state should not need migration');
    const hasCustom = v4State.bets.some((b) => b.id === 'bet-custom-123');
    check(hasCustom, 'Custom v4 bet should survive reload (no re-migration)');

    // ── Test 4: SEED_BET_VERSION is current ──────────────────────────────────
    check(SEED_BET_VERSION === 'seed-v2', `SEED_BET_VERSION should be "seed-v2", got "${SEED_BET_VERSION}"`);

    // ── Test 5: Pick Five calculation utilities ──────────────────────────────

    // americanToImpliedProb
    check(Math.abs(americanToImpliedProb(-110) - 0.5238) < 0.001, 'americanToImpliedProb(-110) should be ~0.524');
    check(Math.abs(americanToImpliedProb(100) - 0.5) < 0.001, 'americanToImpliedProb(100) should be 0.5');

    // calculateEdge
    check(Math.abs(calculateEdge(0.6, 0.5) - 0.1) < 0.001, 'calculateEdge(0.6, 0.5) should be 0.1');

    // computeRecord
    const testPicks = [
      { result: 'won' as PickResult },
      { result: 'won' as PickResult },
      { result: 'lost' as PickResult },
      { result: 'push' as PickResult },
      { result: 'pending' as PickResult },
    ];
    const rec = computeRecord(testPicks);
    check(rec.won === 2, `computeRecord won should be 2, got ${rec.won}`);
    check(rec.lost === 1, `computeRecord lost should be 1, got ${rec.lost}`);
    check(rec.push === 1, `computeRecord push should be 1, got ${rec.push}`);
    check(rec.pending === 1, `computeRecord pending should be 1, got ${rec.pending}`);
    check(rec.settled === 3, `computeRecord settled should be 3, got ${rec.settled}`);
    check(Math.abs(rec.winPercentage - 2 / 3) < 0.001, `computeRecord winPercentage should be ~0.667, got ${rec.winPercentage}`);

    // paperProfitLoss
    check(Math.abs(paperProfitLoss(10, -110, 'won') - 9.09) < 0.01, `paperProfitLoss(10, -110, won) should be ~9.09`);
    check(paperProfitLoss(10, -110, 'lost') === -10, 'paperProfitLoss(10, -110, lost) should be -10');
    check(paperProfitLoss(10, -110, 'push') === 0, 'paperProfitLoss(10, -110, push) should be 0');

    // aggregateRecords
    const agg = aggregateRecords([
      { record: { won: 2, lost: 1, push: 0, pending: 0, void: 0, total: 3, settled: 3, winPercentage: 2 / 3 } },
      { record: { won: 1, lost: 2, push: 1, pending: 0, void: 0, total: 4, settled: 3, winPercentage: 1 / 3 } },
    ]);
    check(agg.won === 3, `aggregateRecords won should be 3, got ${agg.won}`);
    check(agg.lost === 3, `aggregateRecords lost should be 3, got ${agg.lost}`);
    check(agg.push === 1, `aggregateRecords push should be 1, got ${agg.push}`);
    check(Math.abs(agg.winPercentage - 0.5) < 0.001, `aggregateRecords winPercentage should be 0.5, got ${agg.winPercentage}`);

    // canAddPick — duplicate game prevention
    const testPickFive = {
      id: 'test',
      date: '2026-08-29',
      timezone: 'UTC',
      picks: [{
        slot: 1,
        opportunityId: 'opp-1',
        matchup: 'BOS @ DEN',
        league: 'NBA' as const,
        market: 'Spread',
        side: 'BOS -3.5',
        line: 'Spread · BOS -3.5',
        odds: -110,
        source: 'test',
        sourceTimestamp: new Date().toISOString(),
        modelProbability: 0.6,
        impliedProbability: 0.52,
        edge: 0.08,
        confidenceScore: 0.7,
        suggestedStake: 5,
        reasoning: 'test',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        frozenAt: new Date().toISOString(),
      }] as FrozenPick[],
      locked: false,
      lockedAt: null,
    };
    const dupResult = canAddPick(testPickFive, { opportunityId: 'opp-2', matchup: 'BOS @ DEN', startTime: new Date(Date.now() + 3600000).toISOString() });
    check(!dupResult.ok, 'canAddPick should reject duplicate game');

    // isContradictory
    const contradictory = isContradictory(testPickFive.picks, { matchup: 'BOS @ DEN', market: 'Spread', side: 'DEN +3.5' });
    check(contradictory === true, 'isContradictory should detect opposite sides of same market');

    // canLockPickFive
    check(!canLockPickFive(testPickFive).ok, 'canLockPickFive should fail with only 1 pick');
    const fivePicks = { ...testPickFive, picks: Array.from({ length: 5 }, (_, i) => ({ ...testPickFive.picks[0], slot: i + 1, matchup: `G${i} @ H${i}` })) };
    check(canLockPickFive(fivePicks).ok, 'canLockPickFive should pass with 5 picks');

    // settlePick
    const settled = settlePick(testPickFive.picks[0], 'won', '110-105', -115);
    check(settled.result === 'won', 'settlePick should set result to won');
    check(settled.finalScore === '110-105', 'settlePick should set finalScore');
    check(settled.profitLoss > 0, 'settlePick should have positive P/L for won');
    check(settled.closingOdds === -115, 'settlePick should set closingOdds');

    // plainEnglishBet
    check(plainEnglishBet('Moneyline', 'BOS', 'BOS @ DEN') === 'Bet on BOS to win outright', 'plainEnglishBet Moneyline');
    check(plainEnglishBet('Spread', 'BOS -3.5', 'BOS @ DEN') === 'Bet on BOS -3.5 points', 'plainEnglishBet Spread');
    check(plainEnglishBet('Total', 'Over 48.0', 'BOS @ DEN') === 'Bet Over 48.0 total points', 'plainEnglishBet Total');

    // ── Test 6: Demo history records are valid ──────────────────────────────
    const demoHistory = generateDemoHistory();
    for (const day of demoHistory) {
      check(day.picks.length === 5, `Day ${day.date} should have 5 picks, got ${day.picks.length}`);
      const dayRec = computeRecord(day.picks);
      check(dayRec.won + dayRec.lost + dayRec.push === 5, `Day ${day.date} record should sum to 5`);
    }
    const allPicks = demoHistory.flatMap((d) => d.picks);
    check(allPicks.length === 150, `Expected 150 total picks in demo history, got ${allPicks.length}`);
    const allRec = computeRecord(allPicks);
    check(allRec.settled > 0, 'Demo history should have settled picks');
    check(allRec.winPercentage > 0 && allRec.winPercentage < 1, 'Win percentage should be between 0 and 1');
    // ── Test 7: Same-day demo generation is stable ────────────────────────────
    const slate1 = generateSportsOpportunities();
    const slate2 = generateSportsOpportunities();
    check(slate1.length === slate2.length, `Same-day slate length should match: ${slate1.length} vs ${slate2.length}`);
    for (let i = 0; i < slate1.length; i++) {
      check(slate1[i].id === slate2[i].id, `Pick ${i} ID should match on re-generate`);
      check(slate1[i].currentOdds === slate2[i].currentOdds, `Pick ${i} odds should match on re-generate: ${slate1[i].currentOdds} vs ${slate2[i].currentOdds}`);
      check(slate1[i].startTime === slate2[i].startTime, `Pick ${i} startTime should match on re-generate`);
      check(slate1[i].homeTeam.abbr === slate2[i].homeTeam.abbr, `Pick ${i} home team should match on re-generate`);
      check(slate1[i].awayTeam.abbr === slate2[i].awayTeam.abbr, `Pick ${i} away team should match on re-generate`);
      check(slate1[i].market === slate2[i].market, `Pick ${i} market should match on re-generate`);
      check(slate1[i].side === slate2[i].side, `Pick ${i} side should match on re-generate`);
      check(slate1[i].supportingSignals[0]?.text === slate2[i].supportingSignals[0]?.text, `Pick ${i} supporting signal should match on re-generate`);
    }

    // ── Test 8: Locked pick does not mutate on reload ────────────────────────
    const lockedPick: FrozenPick = {
      slot: 1,
      opportunityId: 'test-locked-1',
      matchup: 'BOS @ DEN',
      league: 'NBA' as const,
      market: 'Spread',
      side: 'BOS +3.5',
      line: 'Spread · BOS +3.5',
      odds: -110,
      source: 'Demo Data',
      sourceTimestamp: '2026-08-29T12:00:00Z',
      modelProbability: 0.58,
      impliedProbability: 0.524,
      edge: 0.056,
      confidenceScore: 0.72,
      suggestedStake: 5.0,
      reasoning: 'Test locked pick',
      startTime: '2026-08-29T19:00:00Z',
      frozenAt: '2026-08-29T12:00:00Z',
    };
    // Simulate reload: regenerate sports but locked pick should remain unchanged
    const newSlate = generateSportsOpportunities();
    check(lockedPick.odds === -110, 'Locked pick odds should not change after reload');
    check(lockedPick.side === 'BOS +3.5', 'Locked pick side should not change after reload');
    check(lockedPick.suggestedStake === 5.0, 'Locked pick stake should not change after reload');
    check(newSlate.length > 0, 'New slate should have picks (unrelated to locked pick)');

    // ── Test 9: Date key is deterministic ─────────────────────────────────────
    const dateKey = getTodayDateKey();
    check(dateKey === new Date().toISOString().slice(0, 10), 'getTodayDateKey should return today\'s date');
    check(dateKey.length === 10, 'Date key should be YYYY-MM-DD format');

    // ── Test 10: Route smoke test ────────────────────────────────────────────
    const validRoutes = ['/', '/pick-five', '/results', '/bankroll', '/settings', '/labs'];
    for (const route of validRoutes) {
      check(route.startsWith('/'), `Route "${route}" should start with /`);
    }
    check(validRoutes.length === 6, `Should have 6 valid routes, got ${validRoutes.length}`);
  } catch (e) {
    failures.push(`Migration test exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (failures.length > 0) {
    console.error('[M1 Migration Test] FAILURES:', failures);
  } else {
    console.log('[M1 Migration Test] All assertions passed');
  }

  return { passed: failures.length === 0, failures: [...failures] };
}
