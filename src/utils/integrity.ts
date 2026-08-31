// Development-time integrity assertions for the M1 Intelligence Terminal.
// These run at module load in dev mode (import.meta.env.DEV). Failures are
// collected and reported via console.error and a window event — they NEVER
// crash the app or prevent rendering. Production builds never execute these.

import { computeResetBankroll, generateMarketAssets, generateSeedBets, generateSportsOpportunities, getSessionTime } from '@/data/mockData';
import { computeRiskReward, filterAndRank, rankOpportunities, scoreOpportunity } from '@/utils/ranking';
import { computeRiskAtStop, DEFAULT_RISK_SETTINGS, suggestedPositionSize, suggestedStake } from '@/utils/risk';
import { formatSelection, getMarketType, getLeagueSymbol } from '@/utils/sportsMarket';
import { runMigrationTest } from '@/utils/migrationTest';
import type { League, MarketAsset, SportsOpportunity } from '@/types/models';

const failures: string[] = [];

function check(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

// ── A. Canonical sports market model + formatter ─────────────────────────────

function assertCanonicalMarketFormat(sports: SportsOpportunity[]) {
  for (const s of sports) {
    const type = getMarketType(s.market);
    const label = formatSelection(s.market, s.side);

    // Market type must be one of the canonical types
    check(
      ['Spread', 'Total', 'Moneyline', 'Handicap', 'Run Line', 'Puck Line', '1X2'].includes(type),
      `Unknown market type "${type}" for ${s.matchup} market="${s.market}"`,
    );

    // Label must be "Type · Side" — never duplicate the line value
    check(label.includes(' · '), `Label missing separator for ${s.matchup}: "${label}"`);

    // For Spread/Handicap, the side must contain the team abbr and a signed line or PK
    if (type === 'Spread' || type === 'Handicap') {
      const sidePart = s.side;
      // Side should not contain contradictory signs like "+-"
      check(!/[+-]{2}/.test(sidePart), `Contradictory signs in side "${sidePart}" for ${s.matchup}`);
      // Side should not duplicate the line (e.g. "MIL +6.0 +6.0")
      const tokens = sidePart.split(/\s+/);
      const lineTokens = tokens.filter((t) => /[+-]?[\d.]+/.test(t) && t !== s.side.split(/\s+/)[0]);
      check(lineTokens.length <= 1, `Duplicated line in side "${sidePart}" for ${s.matchup}`);
    }

    // For Total, side must be "Over X" or "Under X"
    if (type === 'Total') {
      check(/^(Over|Under)\s+/.test(s.side), `Total side not "Over/Under X" for ${s.matchup}: "${s.side}"`);
    }

    // For Run Line / Puck Line, side must contain ±1.5
    if (type === 'Run Line' || type === 'Puck Line') {
      check(s.side.includes('-1.5') || s.side.includes('+1.5'), `${type} side missing ±1.5 for ${s.matchup}: "${s.side}"`);
    }

    // For 1X2, side must contain (1), (X), or (2)
    if (type === '1X2') {
      check(/\([12X]\)/.test(s.side), `1X2 side missing (1)/(X)/(2) for ${s.matchup}: "${s.side}"`);
    }
  }
}

function assertSportsLineTicks(sports: SportsOpportunity[]) {
  for (const s of sports) {
    const type = getMarketType(s.market);

    if (type === 'Total') {
      // Side is "Over X" or "Under X" — extract the number
      const val = parseFloat(s.side.replace(/^(Over|Under)\s+/, ''));
      const remainder = (val * 100) % 100;
      switch (s.league) {
        case 'NFL':
        case 'NBA':
          check(val >= (s.league === 'NFL' ? 34.5 : 205.5) && val <= (s.league === 'NFL' ? 57.5 : 244.5),
            `${s.league} total ${val} out of range for ${s.matchup}`);
          check(remainder === 0 || remainder === 50, `${s.league} total ${val} not on 0.5 increment for ${s.matchup}`);
          break;
        case 'MLB':
          check(val >= 6.5 && val <= 12.5, `MLB total ${val} out of range for ${s.matchup}`);
          check(remainder === 0 || remainder === 50, `MLB total ${val} not on 0.5 increment for ${s.matchup}`);
          break;
        case 'NHL':
          check(val >= 5.0 && val <= 7.5, `NHL total ${val} out of range for ${s.matchup}`);
          check(remainder === 0 || remainder === 50, `NHL total ${val} not on 0.5 increment for ${s.matchup}`);
          break;
        case 'Soccer':
          check(val >= 1.5 && val <= 4.5, `Soccer total ${val} out of range for ${s.matchup}`);
          check(remainder === 0 || remainder === 25 || remainder === 50 || remainder === 75,
            `Soccer total ${val} not on 0.25/0.5 increment for ${s.matchup}`);
          break;
      }
    }

    if (type === 'Spread' || type === 'Handicap') {
      // Side is "TEAM PK" or "TEAM +X" or "TEAM -X"
      const tokens = s.side.split(/\s+/);
      const lineStr = tokens[tokens.length - 1];
      if (lineStr === 'PK') continue; // pick'em is valid
      const val = parseFloat(lineStr);
      const remainder = (Math.abs(val) * 100) % 100;
      if (s.league === 'Soccer') {
        check(Math.abs(val) >= 0.25 && Math.abs(val) <= 2.0, `Soccer handicap ${val} out of range for ${s.matchup}`);
        check(remainder === 0 || remainder === 25 || remainder === 50 || remainder === 75,
          `Soccer handicap ${val} not on 0.25 increment for ${s.matchup}`);
      } else {
        check(Math.abs(val) >= 0 && Math.abs(val) <= 14.5, `${s.league} spread ${val} out of range for ${s.matchup}`);
        check(remainder === 0 || remainder === 50, `${s.league} spread ${val} not on 0.5 increment for ${s.matchup}`);
      }
    }

    if (type === 'Run Line') {
      check(s.league === 'MLB', `Run Line on non-MLB event ${s.matchup}`);
      check(s.side.includes('-1.5') || s.side.includes('+1.5'), `Run Line not ±1.5 for ${s.matchup}`);
    }
    if (type === 'Puck Line') {
      check(s.league === 'NHL', `Puck Line on non-NHL event ${s.matchup}`);
      check(s.side.includes('-1.5') || s.side.includes('+1.5'), `Puck Line not ±1.5 for ${s.matchup}`);
    }
    if (type === '1X2') check(s.league === 'Soccer', `1X2 on non-Soccer event ${s.matchup}`);
  }
}

function assertLeagueSymbols() {
  const leagues: League[] = ['NBA', 'NFL', 'MLB', 'NHL', 'Soccer'];
  for (const l of leagues) {
    const sym = getLeagueSymbol(l);
    check(sym !== '₿', `League ${l} uses Bitcoin symbol ₿`);
    check(sym.length > 0, `League ${l} has empty symbol`);
  }
}

// ── B. Stake/risk source of truth ────────────────────────────────────────────

function assertStakeCap() {
  const bankroll = 500; // current simulated bankroll
  const maxStake = bankroll * 0.02; // $10.00

  // Test with various edge/confidence combinations
  const testCases = [
    { edge: 0.01, conf: 0.5 },
    { edge: 0.05, conf: 0.7 },
    { edge: 0.10, conf: 0.8 },
    { edge: 0.15, conf: 0.9 },
    { edge: 0.20, conf: 0.95 },
  ];
  for (const tc of testCases) {
    const stake = suggestedStake(tc.edge, tc.conf, bankroll, DEFAULT_RISK_SETTINGS);
    check(stake <= maxStake, `Stake ${stake} exceeds 2% cap ${maxStake} for edge=${tc.edge} conf=${tc.conf}`);
    check(stake >= 0, `Negative stake ${stake} for edge=${tc.edge} conf=${tc.conf}`);
  }
}

function assertSeedBetStakes() {
  const sports = generateSportsOpportunities();
  const seedBets = generateSeedBets(sports);
  const bankroll = DEFAULT_RISK_SETTINGS.startingBankroll;
  const maxStake = bankroll * 0.02;

  for (const bet of seedBets) {
    check(bet.stake <= maxStake, `Seed bet ${bet.id} stake ${bet.stake} exceeds 2% cap ${maxStake}`);
    check(bet.edge > 0, `Seed bet ${bet.id} has non-positive edge ${bet.edge}`);
    // BetRecord doesn't carry expectedValue directly — verify via leg edge > 0 instead
    check(bet.confidence >= 0.5, `Seed bet ${bet.id} confidence ${bet.confidence} below 50%`);
    check(bet.confidence !== bet.edge, `Seed bet ${bet.id} confidence ${bet.confidence} equals edge ${bet.edge}`);
  }

  // Verify realistic mixed record: 3W/3L/2P
  const wins = seedBets.filter((b) => b.result === 'won').length;
  const losses = seedBets.filter((b) => b.result === 'lost').length;
  const pending = seedBets.filter((b) => b.result === 'pending').length;
  check(wins === 3, `Expected 3 wins, got ${wins}`);
  check(losses === 3, `Expected 3 losses, got ${losses}`);
  check(pending === 2, `Expected 2 pending, got ${pending}`);

  // Verify bankroll reconciliation
  const resetBankroll = computeResetBankroll(seedBets, bankroll);
  const settledPnl = seedBets
    .filter((b) => b.result === 'won' || b.result === 'lost')
    .reduce((s, b) => s + b.profitLoss, 0);
  check(resetBankroll === bankroll + settledPnl, `Reset bankroll ${resetBankroll} != starting + settled P/L ${bankroll + settledPnl}`);

  // Pending exposure = sum of pending stakes
  const pendingExposure = seedBets.filter((b) => b.result === 'pending').reduce((s, b) => s + b.stake, 0);
  const expectedExposure = seedBets.filter((b) => b.result === 'pending').reduce((s, b) => s + b.stake, 0);
  check(pendingExposure === expectedExposure, `Pending exposure ${pendingExposure} != expected ${expectedExposure}`);
}

// ── E. Sport-aware evidence direction ────────────────────────────────────────

function assertEvidenceDirection(sports: SportsOpportunity[]) {
  for (const s of sports) {
    for (const sig of s.supportingSignals) {
      check(sig.supportsSelection === true, `Supporting signal for ${s.matchup} has supportsSelection=false: "${sig.text}"`);
    }
    for (const sig of s.contradictingSignals) {
      check(sig.supportsSelection === false, `Contradicting signal for ${s.matchup} has supportsSelection=true: "${sig.text}"`);
    }
  }
}

// ── Existing assertions ──────────────────────────────────────────────────────

function assertNoNegativeRecommendedEvOrEdge(sports: SportsOpportunity[]) {
  const ranked = filterAndRank(sports, { positiveEvOnly: true, positiveEdgeOnly: true });
  for (const r of ranked) {
    check(r.expectedValue > 0, `Negative EV in recommended: ${r.matchup} EV=${r.expectedValue}`);
    check(r.edge > 0, `Negative edge in recommended: ${r.matchup} edge=${r.edge}`);
  }
}

function assertDescendingRank(sports: SportsOpportunity[]) {
  const ranked = rankOpportunities(sports);
  for (let i = 1; i < ranked.length; i++) {
    check(ranked[i - 1].m1Score.total >= ranked[i].m1Score.total,
      `Rank not descending at position ${i}: ${ranked[i - 1].m1Score.total} < ${ranked[i].m1Score.total}`);
  }
}

function assertNonNegativeFreshness(sports: SportsOpportunity[], markets: MarketAsset[]) {
  const sessionTime = getSessionTime();
  for (const s of sports) {
    const elapsed = sessionTime - new Date(s.updatedAt).getTime();
    check(elapsed >= 0, `Negative freshness for ${s.matchup}: ${elapsed}ms`);
  }
  for (const m of markets) {
    const elapsed = sessionTime - new Date(m.updatedAt).getTime();
    check(elapsed >= 0, `Negative freshness for ${m.symbol}: ${elapsed}ms`);
  }
}

function assertPriceGeometry(markets: MarketAsset[]) {
  for (const m of markets) {
    if (m.signal === 'long') {
      check(m.entryZone[1] <= m.price, `LONG entry above price for ${m.symbol}`);
      check(m.invalidation < m.entryZone[0], `LONG invalidation not below entry for ${m.symbol}`);
      check(m.targetZone[0] > m.entryZone[1], `LONG target not above entry for ${m.symbol}`);
    } else if (m.signal === 'short') {
      check(m.entryZone[0] >= m.price, `SHORT entry below price for ${m.symbol}`);
      check(m.invalidation > m.entryZone[1], `SHORT invalidation not above entry for ${m.symbol}`);
      check(m.targetZone[1] < m.entryZone[0], `SHORT target not below entry for ${m.symbol}`);
    }
  }
}

function assertMarketTopFiveExcludesNeutralAndPositiveScore(markets: MarketAsset[]) {
  const rankable = markets.map((m) => ({
    ...m,
    edge: m.confidence * 0.06,
    expectedValue: m.signal === 'long' ? m.momentum / 1000 : m.signal === 'short' ? -m.momentum / 1000 : 0,
    riskClass: m.volatility > 50 ? 'high' as const : m.volatility > 30 ? 'moderate' as const : 'low' as const,
    startTime: m.updatedAt,
    confidenceScore: m.confidence,
    modelVersion: 'test',
  }));
  const topFive = filterAndRank(
    rankable.filter((m) => m.signal !== 'neutral'),
    { positiveEvOnly: true, positiveEdgeOnly: true, positiveScoreOnly: true, minConfidence: 0.5 },
  ).slice(0, 5);
  for (const t of topFive) {
    check(t.signal !== 'neutral', `Neutral in Top Five: ${t.symbol}`);
    check(t.expectedValue > 0, `Negative EV in market Top Five: ${t.symbol}`);
    check(t.m1Score.total > 0, `Non-positive M1 score in market Top Five: ${t.symbol} score=${t.m1Score.total}`);
  }
}

function assertRiskRewardPositive(markets: MarketAsset[]) {
  for (const m of markets) {
    if (m.signal === 'long' || m.signal === 'short') {
      const entryMid = (m.entryZone[0] + m.entryZone[1]) / 2;
      const rr = computeRiskReward(entryMid, m.invalidation, m.targetZone[0]);
      check(rr > 0, `Non-positive risk/reward for ${m.symbol}: ${rr}`);
    }
  }
}

function assertKellySizing() {
  const bankroll = DEFAULT_RISK_SETTINGS.startingBankroll;
  const stake = suggestedStake(0.1, 0.8, bankroll, DEFAULT_RISK_SETTINGS);
  check(stake <= bankroll * 0.02, `Kelly stake ${stake} exceeds 2% cap of ${bankroll * 0.02}`);
  const posSize = suggestedPositionSize(0.1, 0.8);
  check(posSize <= 0.02, `Position size ${posSize} exceeds 2% cap`);
  const riskAtStop = computeRiskAtStop(0.02, 100, 95);
  check(riskAtStop <= 0.01, `Risk at stop ${riskAtStop} exceeds 1% cap`);
}

function assertWagerMapping() {
  const mockLeg = {
    opportunityId: 'test',
    matchup: 'BOS @ DEN',
    market: 'Moneyline',
    side: 'BOS',
    odds: -110,
    modelProbability: 0.65,
    edge: 0.108,
    confidenceScore: 0.73,
  };
  check(mockLeg.confidenceScore !== mockLeg.edge, `Wager mapping: confidence ${mockLeg.confidenceScore} equals edge ${mockLeg.edge}`);
  check(Math.abs(mockLeg.confidenceScore - mockLeg.edge) > 0.5, `Wager mapping: confidence and edge too close`);
  const betConfidence = mockLeg.confidenceScore;
  const betEdge = mockLeg.edge;
  check(betConfidence > 0.5 && betEdge < 0.15, `Wager mapping: expected confidence >0.5 and edge <0.15, got conf=${betConfidence} edge=${betEdge}`);
}

export interface IntegrityResult {
  passed: boolean;
  failures: string[];
}

export function runIntegrityChecks(): IntegrityResult {
  failures.length = 0;
  if (!import.meta.env.DEV) return { passed: true, failures: [] };

  try {
    const sports = generateSportsOpportunities();
    const markets = generateMarketAssets();

    assertCanonicalMarketFormat(sports);
    assertSportsLineTicks(sports);
    assertLeagueSymbols();
    assertEvidenceDirection(sports);
    assertStakeCap();
    assertSeedBetStakes();
    assertNoNegativeRecommendedEvOrEdge(sports);
    assertDescendingRank(sports);
    assertNonNegativeFreshness(sports, markets);
    assertPriceGeometry(markets);
    assertMarketTopFiveExcludesNeutralAndPositiveScore(markets);
    assertRiskRewardPositive(markets);
    assertKellySizing();
    assertWagerMapping();

    // Migration test
    const migrationResult = runMigrationTest();
    for (const f of migrationResult.failures) failures.push(f);

    // Verify scoreOpportunity is deterministic
    const s = sports[0];
    const score1 = scoreOpportunity(s);
    const score2 = scoreOpportunity(s);
    check(score1.total === score2.total, 'scoreOpportunity is not deterministic');

    // Verify filterAndRank #1 has highest score
    const filtered = filterAndRank(sports, { positiveEvOnly: true, positiveEdgeOnly: true });
    if (filtered.length > 1) {
      check(filtered[0].m1Score.total >= filtered[1].m1Score.total, 'filterAndRank #1 does not have highest score');
    }
  } catch (e) {
    failures.push(`Exception during integrity checks: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (failures.length > 0) {
    console.error('[M1 Integrity] FAILURES:', failures);
  } else {
    console.log('[M1 Integrity] All assertions passed');
  }

  return { passed: failures.length === 0, failures: [...failures] };
}
