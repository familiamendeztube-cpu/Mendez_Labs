// Seeded demo Pick Five history for the Mendez Labs research terminal.
// Generates 30 days of settled picks to demonstrate 7-day/30-day/all-time calculations.
// All data is clearly DEMO / PAPER TRACKING — never labeled as real performance.

import type { FrozenPick, League, PickFiveDayRecord, PickFiveSet, PickResult, SettledPick } from '@/types/models';
import { hashString, mulberry32, randInt } from '@/utils/rng';
import { americanToImpliedProb, calculateEdge, paperProfitLoss } from '@/utils/pickFive';
import { suggestedStake, DEFAULT_RISK_SETTINGS } from '@/utils/risk';
import { formatSelection } from '@/utils/sportsMarket';

const DEMO_SOURCE = 'Demo Data — connect a live provider';

interface DemoGame {
  league: League;
  matchup: string;
  market: string;
  side: string;
  odds: number;
  modelProb: number;
  confidenceScore: number;
  startTime: string;
}

const DEMO_GAMES: DemoGame[] = [
  { league: 'NBA', matchup: 'BOS @ DEN', market: 'Spread', side: 'BOS +3.5', odds: -110, modelProb: 0.58, confidenceScore: 0.72, startTime: '' },
  { league: 'NBA', matchup: 'MIL @ PHX', market: 'Total', side: 'Over 228.5', odds: -108, modelProb: 0.55, confidenceScore: 0.68, startTime: '' },
  { league: 'NBA', matchup: 'GSW @ MIA', market: 'Moneyline', side: 'GSW', odds: +135, modelProb: 0.45, confidenceScore: 0.62, startTime: '' },
  { league: 'NBA', matchup: 'PHI @ DAL', market: 'Spread', side: 'DAL -2.5', odds: -110, modelProb: 0.57, confidenceScore: 0.70, startTime: '' },
  { league: 'NBA', matchup: 'LAL @ SAC', market: 'Total', side: 'Under 222.5', odds: -110, modelProb: 0.56, confidenceScore: 0.65, startTime: '' },
  { league: 'NFL', matchup: 'KC @ BUF', market: 'Spread', side: 'BUF +1.5', odds: -110, modelProb: 0.56, confidenceScore: 0.71, startTime: '' },
  { league: 'NFL', matchup: 'SF @ PHI', market: 'Moneyline', side: 'PHI', odds: -125, modelProb: 0.58, confidenceScore: 0.69, startTime: '' },
  { league: 'NFL', matchup: 'BAL @ CIN', market: 'Total', side: 'Over 47.5', odds: -110, modelProb: 0.54, confidenceScore: 0.63, startTime: '' },
  { league: 'NFL', matchup: 'DAL @ DET', market: 'Spread', side: 'DET +3.5', odds: +105, modelProb: 0.52, confidenceScore: 0.60, startTime: '' },
  { league: 'NFL', matchup: 'NYJ @ HOU', market: 'Moneyline', side: 'HOU', odds: -140, modelProb: 0.60, confidenceScore: 0.73, startTime: '' },
  { league: 'MLB', matchup: 'LAD @ ATL', market: 'Moneyline', side: 'LAD', odds: -115, modelProb: 0.56, confidenceScore: 0.66, startTime: '' },
  { league: 'MLB', matchup: 'HOU @ NYY', market: 'Run Line', side: 'HOU -1.5', odds: +145, modelProb: 0.48, confidenceScore: 0.58, startTime: '' },
  { league: 'MLB', matchup: 'TEX @ TOR', market: 'Total', side: 'Over 8.5', odds: -110, modelProb: 0.55, confidenceScore: 0.64, startTime: '' },
  { league: 'MLB', matchup: 'PHI @ BAL', market: 'Moneyline', side: 'BAL', odds: -130, modelProb: 0.59, confidenceScore: 0.70, startTime: '' },
  { league: 'MLB', matchup: 'SF @ SD', market: 'Run Line', side: 'SD -1.5', odds: +155, modelProb: 0.46, confidenceScore: 0.57, startTime: '' },
  { league: 'NHL', matchup: 'COL @ BOS', market: 'Puck Line', side: 'COL +1.5', odds: -140, modelProb: 0.62, confidenceScore: 0.74, startTime: '' },
  { league: 'NHL', matchup: 'EDM @ TOR', market: 'Moneyline', side: 'EDM', odds: -120, modelProb: 0.57, confidenceScore: 0.68, startTime: '' },
  { league: 'NHL', matchup: 'NYR @ VGK', market: 'Total', side: 'Under 6.5', odds: -110, modelProb: 0.55, confidenceScore: 0.65, startTime: '' },
  { league: 'NHL', matchup: 'FLA @ CAR', market: 'Puck Line', side: 'CAR -1.5', odds: +165, modelProb: 0.45, confidenceScore: 0.59, startTime: '' },
  { league: 'Soccer', matchup: 'MCI @ LIV', market: '1X2', side: 'MCI (1)', odds: +130, modelProb: 0.48, confidenceScore: 0.63, startTime: '' },
  { league: 'Soccer', matchup: 'RMA @ BAR', market: '1X2', side: 'BAR (2)', odds: +145, modelProb: 0.42, confidenceScore: 0.55, startTime: '' },
  { league: 'Soccer', matchup: 'BAY @ INT', market: 'Handicap', side: 'BAY -0.75', odds: -110, modelProb: 0.55, confidenceScore: 0.67, startTime: '' },
  { league: 'Soccer', matchup: 'ARS @ PSG', market: 'Total', side: 'Over 2.75', odds: -108, modelProb: 0.54, confidenceScore: 0.62, startTime: '' },
];

function makeFrozenPick(game: DemoGame, slot: number, date: string, bankroll: number): FrozenPick {
  const implied = americanToImpliedProb(game.odds);
  const edge = calculateEdge(game.modelProb, implied);
  const stake = Math.round(suggestedStake(edge, game.confidenceScore, bankroll, DEFAULT_RISK_SETTINGS) * 100) / 100;
  const startTime = new Date(date + 'T19:00:00Z').toISOString();
  return {
    slot,
    opportunityId: `demo-${date}-${slot}`,
    matchup: game.matchup,
    league: game.league,
    market: game.market,
    side: game.side,
    line: formatSelection(game.market, game.side),
    odds: game.odds,
    source: DEMO_SOURCE,
    sourceTimestamp: new Date(date + 'T12:00:00Z').toISOString(),
    modelProbability: game.modelProb,
    impliedProbability: implied,
    edge,
    confidenceScore: game.confidenceScore,
    suggestedStake: stake,
    reasoning: `M1 identified a ${Math.abs(edge * 100).toFixed(1)}% edge on the ${game.market} market. Demo research pick — paper tracked only.`,
    startTime,
    frozenAt: new Date(date + 'T12:00:00Z').toISOString(),
  };
}

function settlePick(
  pick: FrozenPick,
  result: PickResult,
  rng: () => number,
  finalScore: string,
  closingOdds: number,
): SettledPick {
  const profitLoss = paperProfitLoss(pick.suggestedStake, pick.odds, result);
  const beatClosingLine = result === 'won' ? closingOdds < pick.odds : result === 'lost' ? closingOdds > pick.odds : undefined;
  return {
    ...pick,
    result,
    finalScore,
    profitLoss,
    closingOdds,
    beatClosingLine,
    settledAt: new Date(pick.startTime).toISOString(),
  };
}

function generateFinalScore(league: League, rng: () => number): string {
  switch (league) {
    case 'NBA': return `${randInt(rng, 95, 125)}-${randInt(rng, 95, 125)}`;
    case 'NFL': return `${randInt(rng, 14, 38)}-${randInt(rng, 14, 38)}`;
    case 'MLB': return `${randInt(rng, 1, 12)}-${randInt(rng, 1, 12)}`;
    case 'NHL': return `${randInt(rng, 1, 7)}-${randInt(rng, 1, 7)}`;
    case 'Soccer': return `${randInt(rng, 0, 4)}-${randInt(rng, 0, 4)}`;
  }
}

export function generateDemoHistory(): PickFiveDayRecord[] {
  const records: PickFiveDayRecord[] = [];
  const bankroll = DEFAULT_RISK_SETTINGS.startingBankroll;

  for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - dayOffset);
    const dateKey = date.toISOString().slice(0, 10);
    const rng = mulberry32(hashString('demo-history-' + dateKey));

    // Pick 5 games for this day (deterministic)
    const dayGames: DemoGame[] = [];
    for (let i = 0; i < 5; i++) {
      const idx = (hashString(dateKey + i) % DEMO_GAMES.length + DEMO_GAMES.length) % DEMO_GAMES.length;
      dayGames.push({ ...DEMO_GAMES[idx], startTime: dateKey });
    }

    const picks: SettledPick[] = [];
    for (let i = 0; i < dayGames.length; i++) {
      const frozen = makeFrozenPick(dayGames[i], i + 1, dateKey, bankroll);
      // Deterministic results: ~55% win rate with some pushes
      const roll = rng();
      let result: PickResult;
      if (roll < 0.08) result = 'push';
      else if (roll < 0.08 + 0.52) result = 'won';
      else result = 'lost';

      const finalScore = generateFinalScore(dayGames[i].league, rng);
      const closingOdds = frozen.odds + randInt(rng, -8, 8);
      picks.push(settlePick(frozen, result, rng, finalScore, closingOdds));
    }

    const won = picks.filter((p) => p.result === 'won').length;
    const lost = picks.filter((p) => p.result === 'lost').length;
    const push = picks.filter((p) => p.result === 'push').length;
    const settled = won + lost;
    const total = picks.length;
    const winPercentage = settled > 0 ? won / settled : 0;
    const dailyProfit = picks.reduce((s, p) => s + p.profitLoss, 0);

    records.push({
      date: dateKey,
      picks,
      record: { won, lost, push, pending: 0, void: 0, total, settled, winPercentage },
      dailyProfit: Math.round(dailyProfit * 100) / 100,
    });
  }

  return records;
}

export function generateTodayPickFive(): PickFiveSet {
  const date = new Date().toISOString().slice(0, 10);
  return {
    id: `pf-${date}`,
    date,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    picks: [],
    locked: false,
    lockedAt: null,
  };
}

export { DEMO_SOURCE };
