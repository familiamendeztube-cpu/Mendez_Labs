import type {
  BetRecord,
  ConfidenceLevel,
  DailyPnlPoint,
  EquityPoint,
  League,
  MarketAsset,
  MarketCandle,
  PerformancePoint,
  RiskClass,
  ScannerOpportunity,
  SportsOpportunity,
  SystemLogEntry,
  Team,
} from '@/types/models';
import { americanToImplied, payoutMultiplier } from '@/utils/format';
import { hashString, mulberry32, pick, randFloat, randInt } from '@/utils/rng';
import { DEFAULT_RISK_SETTINGS, suggestedStake } from '@/utils/risk';
import { getMarketType } from '@/utils/sportsMarket';

const MODEL_VERSION = 'M1.4.2-quant';

// Deterministic per calendar date: same day = same seed, same odds, same start times.
// Re-rendering or reloading on the same day never changes displayed data.
const TODAY_DATE_KEY = new Date().toISOString().slice(0, 10);
const SESSION_TIME = new Date(TODAY_DATE_KEY + 'T12:00:00Z').getTime();
const SESSION_ISO = new Date(SESSION_TIME).toISOString();

export function getSessionTime(): number {
  return SESSION_TIME;
}
export function getSessionISO(): string {
  return SESSION_ISO;
}
export function getTodayDateKey(): string {
  return TODAY_DATE_KEY;
}

// ── Line tick quantization ──────────────────────────────────────────────────

function quantize(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function formatSignedLine(value: number): string {
  if (value === 0 || Object.is(value, -0)) return 'PK';
  return value > 0 ? `+${value}` : `${value}`;
}

// ── Teams ────────────────────────────────────────────────────────────────────

function makeTeam(rng: () => number, city: string, name: string, abbr: string, color: string): Team {
  const form = Array.from({ length: 5 }, () => (rng() > 0.45 ? 'W' : 'L'));
  const injuries = rng() > 0.55 ? [
    {
      player: pick(rng, ['J. Carter', 'M. Thompson', 'D. Williams', 'A. Rodriguez']),
      status: pick(rng, ['questionable', 'doubtful', 'out'] as const),
      impact: pick(rng, ['low', 'moderate', 'high'] as const),
    },
  ] : [];
  return {
    name,
    abbr,
    city,
    color,
    record: `${randInt(rng, 18, 52)}-${randInt(rng, 18, 52)}`,
    recentForm: form,
    offRating: randFloat(rng, 104, 118),
    defRating: randFloat(rng, 104, 114),
    pace: randFloat(rng, 96, 104),
    homeRecord: `${randInt(rng, 10, 26)}-${randInt(rng, 8, 16)}`,
    awayRecord: `${randInt(rng, 8, 22)}-${randInt(rng, 10, 20)}`,
    restDays: randInt(rng, 1, 4),
    injuries,
  };
}

// [city, name, abbr, color] — color is used for matchup crests only
const TEAM_POOL: Record<League, [string, string, string, string][]> = {
  NBA: [
    ['Boston', 'Celtics', 'BOS', '#007A33'],
    ['Denver', 'Nuggets', 'DEN', '#0E2240'],
    ['Milwaukee', 'Bucks', 'MIL', '#00471A'],
    ['Phoenix', 'Suns', 'PHX', '#1D1160'],
    ['Golden State', 'Warriors', 'GSW', '#1D428A'],
    ['Miami', 'Heat', 'MIA', '#98002E'],
    ['Philadelphia', '76ers', 'PHI', '#006BB6'],
    ['Dallas', 'Mavericks', 'DAL', '#00538C'],
  ],
  NFL: [
    ['Kansas City', 'Chiefs', 'KC', '#E31837'],
    ['Buffalo', 'Bills', 'BUF', '#00338D'],
    ['San Francisco', '49ers', 'SF', '#AA0000'],
    ['Philadelphia', 'Eagles', 'PHI', '#004C54'],
    ['Dallas', 'Cowboys', 'DAL', '#003594'],
    ['Baltimore', 'Ravens', 'BAL', '#241773'],
    ['Cincinnati', 'Bengals', 'CIN', '#FB4F14'],
    ['Detroit', 'Lions', 'DET', '#0076B6'],
  ],
  MLB: [
    ['Los Angeles', 'Dodgers', 'LAD', '#005A9C'],
    ['Atlanta', 'Braves', 'ATL', '#CE1141'],
    ['Houston', 'Astros', 'HOU', '#002D62'],
    ['New York', 'Yankees', 'NYY', '#003087'],
    ['Philadelphia', 'Phillies', 'PHI', '#E81828'],
    ['Texas', 'Rangers', 'TEX', '#003278'],
    ['Toronto', 'Blue Jays', 'TOR', '#134A8E'],
    ['Baltimore', 'Orioles', 'BAL', '#DF4601'],
  ],
  NHL: [
    ['Colorado', 'Avalanche', 'COL', '#6F263D'],
    ['Boston', 'Bruins', 'BOS', '#FFB81C'],
    ['Edmonton', 'Oilers', 'EDM', '#FF4C00'],
    ['Toronto', 'Maple Leafs', 'TOR', '#00205B'],
    ['New York', 'Rangers', 'NYR', '#0038A8'],
    ['Vegas', 'Golden Knights', 'VGK', '#B4975A'],
    ['Florida', 'Panthers', 'FLA', '#C8102E'],
    ['Carolina', 'Hurricanes', 'CAR', '#CC0000'],
  ],
  Soccer: [
    ['Manchester City', 'Man City', 'MCI', '#6CABDD'],
    ['Real Madrid', 'Real', 'RMA', '#FEBE10'],
    ['Bayern Munich', 'Bayern', 'BAY', '#DC052D'],
    ['Liverpool', 'Liverpool', 'LIV', '#C8102E'],
    ['Barcelona', 'Barca', 'BAR', '#A50044'],
    ['Arsenal', 'Arsenal', 'ARS', '#EF0107'],
    ['Inter', 'Inter', 'INT', '#0066B3'],
    ['Paris', 'PSG', 'PSG', '#004170'],
  ],
};

// ── Sport-aware market generation with quantized ticks ─────────────────────

interface MarketSpec {
  label: string;
  side: (rng: () => number, home: Team, away: Team) => string;
}

function nbaMarkets(rng: () => number): MarketSpec {
  const total = quantize(randFloat(rng, 205.5, 244.5), 0.5).toFixed(1);
  const spreadVal = quantize(randFloat(rng, -14.5, 14.5), 0.5);
  const spread = formatSignedLine(spreadVal);
  return pick(rng, [
    { label: 'Moneyline', side: (r, h, a) => pick(r, [h.abbr, a.abbr]) },
    { label: 'Spread', side: (r, h, a) => pick(r, [`${h.abbr} ${spread}`, `${a.abbr} ${formatSignedLine(-spreadVal)}`]) },
    { label: 'Total', side: (r) => pick(r, [`Over ${total}`, `Under ${total}`]) },
  ]);
}

function nflMarkets(rng: () => number): MarketSpec {
  const total = quantize(randFloat(rng, 34.5, 57.5), 0.5).toFixed(1);
  const spreadVal = quantize(randFloat(rng, -14.5, 14.5), 0.5);
  const spread = formatSignedLine(spreadVal);
  return pick(rng, [
    { label: 'Moneyline', side: (r, h, a) => pick(r, [h.abbr, a.abbr]) },
    { label: 'Spread', side: (r, h, a) => pick(r, [`${h.abbr} ${spread}`, `${a.abbr} ${formatSignedLine(-spreadVal)}`]) },
    { label: 'Total', side: (r) => pick(r, [`Over ${total}`, `Under ${total}`]) },
  ]);
}

function mlbMarkets(rng: () => number): MarketSpec {
  const total = quantize(randFloat(rng, 6.5, 12.5), 0.5).toFixed(1);
  return pick(rng, [
    { label: 'Moneyline', side: (r, h, a) => pick(r, [h.abbr, a.abbr]) },
    { label: 'Run Line', side: (r, h, a) => pick(r, [`${h.abbr} -1.5`, `${a.abbr} +1.5`]) },
    { label: 'Total', side: (r) => pick(r, [`Over ${total}`, `Under ${total}`]) },
  ]);
}

function nhlMarkets(rng: () => number): MarketSpec {
  const total = quantize(randFloat(rng, 5.0, 7.5), 0.5).toFixed(1);
  return pick(rng, [
    { label: 'Moneyline', side: (r, h, a) => pick(r, [h.abbr, a.abbr]) },
    { label: 'Puck Line', side: (r, h, a) => pick(r, [`${h.abbr} -1.5`, `${a.abbr} +1.5`]) },
    { label: 'Total', side: (r) => pick(r, [`Over ${total}`, `Under ${total}`]) },
  ]);
}

function soccerMarkets(rng: () => number): MarketSpec {
  const total = quantize(randFloat(rng, 1.5, 4.5), 0.25).toFixed(2);
  const handicapVal = quantize(randFloat(rng, 0.5, 2.0), 0.25);
  const handicap = formatSignedLine(handicapVal);
  return pick(rng, [
    { label: '1X2', side: (r, h, a) => pick(r, [`${h.abbr} (1)`, 'Draw (X)', `${a.abbr} (2)`]) },
    { label: 'Handicap', side: (r, h, a) => pick(r, [`${h.abbr} ${handicap}`, `${a.abbr} ${formatSignedLine(-handicapVal)}`]) },
    { label: 'Total', side: (r) => pick(r, [`Over ${total}`, `Under ${total}`]) },
  ]);
}

function generateMarketForLeague(league: League, rng: () => number): MarketSpec {
  switch (league) {
    case 'NBA': return nbaMarkets(rng);
    case 'NFL': return nflMarkets(rng);
    case 'MLB': return mlbMarkets(rng);
    case 'NHL': return nhlMarkets(rng);
    case 'Soccer': return soccerMarkets(rng);
  }
}

function lineMovement(rng: () => number, open: number): { t: number; odds: number }[] {
  const points: { t: number; odds: number }[] = [];
  let current = open;
  for (let i = 0; i < 12; i++) {
    const drift = randInt(rng, -8, 8);
    current = Math.max(-400, Math.min(400, current + drift));
    points.push({ t: -(12 - i) * 30, odds: current });
  }
  points.push({ t: 0, odds: current });
  return points;
}

function confidenceFromScore(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'very-high';
  if (score >= 0.65) return 'high';
  if (score >= 0.45) return 'moderate';
  return 'low';
}

function riskFromEdge(edge: number): RiskClass {
  if (edge >= 0.08) return 'low';
  if (edge >= 0.04) return 'moderate';
  return 'high';
}

import type { EvidenceSignal } from '@/types/models';

function selectedTeam(side: string, home: Team, away: Team): Team {
  return side.startsWith(home.abbr) ? home : side.startsWith(away.abbr) ? away : home;
}

function opponentTeam(side: string, home: Team, away: Team): Team {
  return side.startsWith(home.abbr) ? away : side.startsWith(away.abbr) ? home : away;
}

function isOver(side: string): boolean {
  return side.startsWith('Over');
}

function buildSupportingSignals(rng: () => number, league: League, home: Team, away: Team, side: string): EvidenceSignal[] {
  const sel = selectedTeam(side, home, away);
  const opp = opponentTeam(side, home, away);
  const over = isOver(side);
  switch (league) {
    case 'NFL':
      if (side.startsWith('Over') || side.startsWith('Under')) {
        return over ? [
          { text: `Both teams tend to play fast and score a lot, so the total should go over.`, supportsSelection: true },
          { text: `Both teams are good at scoring once they get close to the end zone.`, supportsSelection: true },
          { text: `The weather looks good for passing, which means more points.`, supportsSelection: true },
        ] : [
          { text: `Both teams have strong defenses that keep scoring low.`, supportsSelection: true },
          { text: `${sel.city} stops teams near the end zone, which keeps the total down.`, supportsSelection: true },
          { text: `The weather looks like it will favor defense, so fewer points.`, supportsSelection: true },
        ];
      }
      return [
        { text: `${sel.city} has been better at moving the ball and scoring than ${opp.city}.`, supportsSelection: true },
        { text: `${sel.city} wins more often on early downs, which keeps drives alive.`, supportsSelection: true },
        { text: `${sel.city} has had more rest days, so they should be fresher.`, supportsSelection: true },
      ];
    case 'NBA':
      if (side.startsWith('Over') || side.startsWith('Under')) {
        return over ? [
          { text: `Both teams play fast, so there should be a lot of scoring.`, supportsSelection: true },
          { text: `Both teams are good at scoring points efficiently.`, supportsSelection: true },
          { text: `Both teams take good shots, so expect more points.`, supportsSelection: true },
        ] : [
          { text: `Both teams play strong defense, which keeps scoring low.`, supportsSelection: true },
          { text: `Both teams play slowly, so fewer points are expected.`, supportsSelection: true },
          { text: `Both teams force tough shots, which lowers scoring.`, supportsSelection: true },
        ];
      }
      return [
        { text: `${sel.city} plays at a faster pace, which gives them more chances to score.`, supportsSelection: true },
        { text: `${sel.city} scores more points than they give up, which is better than ${opp.city}.`, supportsSelection: true },
        { text: `${sel.city} takes better shots and has had more rest.`, supportsSelection: true },
      ];
    case 'MLB':
      if (side.startsWith('Over') || side.startsWith('Under')) {
        return over ? [
          { text: `Both starting pitchers have been struggling, so expect more runs.`, supportsSelection: true },
          { text: `Both teams have been hitting well lately.`, supportsSelection: true },
          { text: `The ballpark and weather both favor more runs.`, supportsSelection: true },
        ] : [
          { text: `Both starting pitchers have been excellent, so expect fewer runs.`, supportsSelection: true },
          { text: `Both teams have tired bullpens, but the starters should keep it low.`, supportsSelection: true },
          { text: `The ballpark and weather both favor fewer runs.`, supportsSelection: true },
        ];
      }
      return [
        { text: `${sel.city} has a better starting pitcher than ${opp.city}.`, supportsSelection: true },
        { text: `${sel.city} has a more rested bullpen, which helps late in the game.`, supportsSelection: true },
        { text: `${sel.city} has been hitting better and the ballpark favors them.`, supportsSelection: true },
      ];
    case 'NHL':
      if (side.startsWith('Over') || side.startsWith('Under')) {
        return over ? [
          { text: `Both teams create a lot of scoring chances, so expect more goals.`, supportsSelection: true },
          { text: `Both teams are good on power plays, which leads to more goals.`, supportsSelection: true },
          { text: `Both goalies have been struggling lately, so more goals are likely.`, supportsSelection: true },
        ] : [
          { text: `Both teams do not create many scoring chances, so expect fewer goals.`, supportsSelection: true },
          { text: `Both goalies have been playing great, which keeps scoring low.`, supportsSelection: true },
          { text: `Both teams struggle on power plays, so fewer goals.`, supportsSelection: true },
        ];
      }
      return [
        { text: `${sel.city} creates more scoring chances than ${opp.city}.`, supportsSelection: true },
        { text: `${sel.city}'s goalie has been playing better than ${opp.city}'s.`, supportsSelection: true },
        { text: `${sel.city} is better on power plays and has had more rest.`, supportsSelection: true },
      ];
    case 'Soccer':
      if (side.startsWith('Over') || side.startsWith('Under')) {
        return over ? [
          { text: `Both teams create a lot of scoring chances, so expect more goals.`, supportsSelection: true },
          { text: `Both teams play aggressively, which leads to more chances.`, supportsSelection: true },
          { text: `The weather and field conditions favor attacking play, so more goals.`, supportsSelection: true },
        ] : [
          { text: `Both teams play strong defense, so expect fewer goals.`, supportsSelection: true },
          { text: `Both teams press hard on defense, which reduces scoring chances.`, supportsSelection: true },
          { text: `The weather and field conditions favor defensive play, so fewer goals.`, supportsSelection: true },
        ];
      }
      return [
        { text: `${sel.city} creates better scoring chances than ${opp.city}.`, supportsSelection: true },
        { text: `${sel.city} plays more aggressively and creates better chances.`, supportsSelection: true },
        { text: `${sel.city} has fewer injuries and less travel fatigue.`, supportsSelection: true },
      ];
  }
}

function buildContradictingSignals(rng: () => number, league: League, home: Team, away: Team, side: string): EvidenceSignal[] {
  const sel = selectedTeam(side, home, away);
  const opp = opponentTeam(side, home, away);
  const over = isOver(side);
  switch (league) {
    case 'NFL':
      if (side.startsWith('Over') || side.startsWith('Under')) {
        return [
          { text: `The weather could change and reduce scoring, going against ${over ? 'Over' : 'Under'}.`, supportsSelection: false },
          { text: `Both teams have strong defenses that could keep scoring down.`, supportsSelection: false },
        ];
      }
      return [
        { text: `${opp.city} has won ${randInt(rng, 3, 5)} of the last 5 meetings between these teams.`, supportsSelection: false },
        { text: `${sel.city} has some injured players that could change the game.`, supportsSelection: false },
      ];
    case 'NBA':
      if (side.startsWith('Over') || side.startsWith('Under')) {
        return [
          { text: `The game could slow down unexpectedly, going against ${over ? 'Over' : 'Under'}.`, supportsSelection: false },
          { text: `Both teams could start missing shots, lowering the score.`, supportsSelection: false },
        ];
      }
      return [
        { text: `${opp.city} has won ${randInt(rng, 3, 5)} of the last 5 meetings between these teams.`, supportsSelection: false },
        { text: `${sel.city} could have an off night shooting, which would hurt their chances.`, supportsSelection: false },
      ];
    case 'MLB':
      if (side.startsWith('Over') || side.startsWith('Under')) {
        return [
          { text: `The bullpen could struggle unexpectedly, changing the score, going against ${over ? 'Over' : 'Under'}.`, supportsSelection: false },
          { text: `Weather or the ballpark could reduce scoring unexpectedly.`, supportsSelection: false },
        ];
      }
      return [
        { text: `${sel.city}'s bullpen has been unreliable, which could hurt their chances.`, supportsSelection: false },
        { text: `Weather or the ballpark could change the game unexpectedly.`, supportsSelection: false },
      ];
    case 'NHL':
      if (side.startsWith('Over') || side.startsWith('Under')) {
        return [
          { text: `The goalies could play better than expected, going against ${over ? 'Over' : 'Under'}.`, supportsSelection: false },
          { text: `Both teams could struggle on power plays, lowering the score.`, supportsSelection: false },
        ];
      }
      return [
        { text: `${sel.city}'s goalie could have an off night, which would hurt their chances.`, supportsSelection: false },
        { text: `${sel.city} has been inconsistent on power plays, which could reduce their edge.`, supportsSelection: false },
      ];
    case 'Soccer':
      if (side.startsWith('Over') || side.startsWith('Under')) {
        return [
          { text: `Both teams could play more defensively than expected, going against ${over ? 'Over' : 'Under'}.`, supportsSelection: false },
          { text: `Travel or injuries could reduce the number of scoring chances.`, supportsSelection: false },
        ];
      }
      return [
        { text: `${sel.city} could play worse than expected, reducing their advantage.`, supportsSelection: false },
        { text: `Travel or injuries could hurt ${sel.city}'s chances.`, supportsSelection: false },
      ];
  }
}

function buildAnalysis(home: Team, away: Team, league: League, market: string, edge: number): string {
  const edgePct = (edge * 100).toFixed(1);
  const homeForm = home.recentForm.filter((r) => r === 'W').length;
  const awayForm = away.recentForm.filter((r) => r === 'W').length;
  let sportText: string;
  switch (league) {
    case 'NFL':
      sportText = `${home.offRating > away.offRating ? home.city : away.city} has been better at moving the ball and scoring. ` +
        `Being good near the end zone and winning early downs are key factors. ` +
        `${home.restDays >= away.restDays ? home.city : away.city} has had more rest days, which helps.`;
      break;
    case 'NBA':
      sportText = `${home.pace > away.pace ? home.city : away.city} plays at a faster pace, creating more scoring chances. ` +
        `Scoring vs defense: ${home.offRating.toFixed(1)}/${home.defRating.toFixed(1)} vs ${away.offRating.toFixed(1)}/${away.defRating.toFixed(1)}. ` +
        `${home.restDays >= away.restDays ? home.city : away.city} has had more rest, which helps.`;
      break;
    case 'MLB':
      sportText = `${home.offRating > away.offRating ? home.city : away.city} has a better starting pitcher and bullpen. ` +
        `Recent hitting and the ballpark both factor in. ` +
        `${home.restDays >= away.restDays ? home.city : away.city} has had more rest, which helps.`;
      break;
    case 'NHL':
      sportText = `${home.offRating > away.offRating ? home.city : away.city} creates more scoring chances. ` +
        `Goalie form and power play success are key factors. ` +
        `${home.restDays >= away.restDays ? home.city : away.city} has had more rest.`;
      break;
    case 'Soccer':
      sportText = `${home.offRating > away.offRating ? home.city : away.city} creates better scoring chances. ` +
        `How aggressively they play and the quality of their chances matter. ` +
        `Injuries and travel could shift things toward ${home.restDays >= away.restDays ? home.city : away.city}.`;
      break;
  }
  return (
    `M1 found a small edge of ${edgePct}% on the ${market} bet. ` +
    `${home.city} has won ${homeForm} of their last 5 games, while ${away.city} has won ${awayForm}. ` +
    `${sportText} ` +
    `This is a research pick only — single games are unpredictable, so this is not a guarantee. `
  );
}

// ── Sports opportunities ────────────────────────────────────────────────────

export function generateSportsOpportunities(): SportsOpportunity[] {
  const leagues = Object.keys(TEAM_POOL) as League[];
  const out: SportsOpportunity[] = [];
  let idx = 0;
  for (const league of leagues) {
    const teams = TEAM_POOL[league];
    const count = randInt(mulberry32(hashString(league + 'count')), 3, 4);
    for (let i = 0; i < count; i++) {
      const seed = hashString(`${TODAY_DATE_KEY}-${league}-${i}-${idx}`);
      const rng = mulberry32(seed);
      const homeIdx = randInt(rng, 0, teams.length - 1);
      let awayIdx = randInt(rng, 0, teams.length - 1);
      if (awayIdx === homeIdx) awayIdx = (awayIdx + 1) % teams.length;
      const home = makeTeam(rng, teams[homeIdx][0], teams[homeIdx][1], teams[homeIdx][2], teams[homeIdx][3]);
      const away = makeTeam(rng, teams[awayIdx][0], teams[awayIdx][1], teams[awayIdx][2], teams[awayIdx][3]);
      const marketSpec = generateMarketForLeague(league, rng);
      const market = marketSpec.label;
      const side = marketSpec.side(rng, home, away);
      const openingOdds = pick(rng, [-180, -150, -110, +110, +130, +150, 200, -220]);
      const movement = lineMovement(rng, openingOdds);
      const currentOdds = movement[movement.length - 1].odds;
      const implied = americanToImplied(currentOdds);
      const divergence = randFloat(rng, -0.12, 0.14);
      const modelProb = Math.min(0.92, Math.max(0.08, implied + divergence));
      const edge = modelProb - implied;
      const ev = modelProb * payoutMultiplier(currentOdds) - (1 - modelProb);
      const confidenceScore = Math.min(0.92, Math.max(0.3, 0.5 + Math.abs(edge) * 1.8 + randFloat(rng, -0.05, 0.05)));
      const status = pick(rng, ['scheduled', 'live', 'scheduled', 'scheduled'] as const);
      const startOffset = randInt(rng, -30, 240);
      const startTime = new Date(SESSION_TIME + startOffset * 60000).toISOString();
      const updatedOffset = randInt(rng, 8, 90);
      const updatedAt = new Date(SESSION_TIME - updatedOffset * 1000).toISOString();
      out.push({
        id: `SPT-${league}-${idx}`,
        league,
        matchup: `${home.abbr} @ ${away.abbr}`,
        homeTeam: home,
        awayTeam: away,
        status,
        startTime,
        market,
        side,
        openingOdds,
        currentOdds,
        lineMovement: movement,
        modelProbability: modelProb,
        impliedProbability: implied,
        edge,
        expectedValue: ev,
        confidence: confidenceFromScore(confidenceScore),
        confidenceScore,
        suggestedStake: 0, // Deprecated — computed dynamically via suggestedStake() against current bankroll
        riskClass: riskFromEdge(Math.abs(edge)),
        recentForm: { home: home.recentForm, away: away.recentForm },
        headToHead: {
          homeWins: randInt(rng, 2, 8),
          awayWins: randInt(rng, 2, 8),
          lastMeeting: new Date(SESSION_TIME - randInt(rng, 20, 120) * 86400000).toISOString(),
        },
        supportingSignals: buildSupportingSignals(rng, league, home, away, side),
        contradictingSignals: buildContradictingSignals(rng, league, home, away, side),
        riskWarnings: [
          'Variance in single-game outcomes is high; model edge does not guarantee outcome.',
          'Line movement may indicate sharp money opposing this position.',
        ],
        analysis: buildAnalysis(home, away, league, market, edge),
        modelVersion: MODEL_VERSION,
        updatedAt,
        source: 'Demo Data — connect a live provider',
      });
      idx++;
    }
  }
  return out;
}

// ── Market assets ────────────────────────────────────────────────────────────

const MARKET_DEFS: { symbol: string; name: string; base: number }[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin', base: 64200 },
  { symbol: 'ETH/USD', name: 'Ethereum', base: 3120 },
  { symbol: 'SOL/USD', name: 'Solana', base: 148 },
  { symbol: 'SPY', name: 'S&P 500 ETF', base: 524 },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', base: 458 },
];

function generateCandles(rng: () => number, base: number): MarketCandle[] {
  const candles: MarketCandle[] = [];
  let price = base;
  const count = 60;
  for (let i = count - 1; i >= 0; i--) {
    const t = SESSION_TIME - i * 3600000;
    const vol = randFloat(rng, 0.008, 0.025);
    const o = price;
    const change = randFloat(rng, -vol, vol) * price;
    const c = Math.max(0.01, o + change);
    const h = Math.max(o, c) * (1 + randFloat(rng, 0, 0.008));
    const l = Math.min(o, c) * (1 - randFloat(rng, 0, 0.008));
    const v = randInt(rng, 1000, 90000);
    candles.push({ t, o, h, l, c, v });
    price = c;
  }
  return candles;
}

function buildDirectionalGeometry(
  signal: 'long' | 'short' | 'neutral',
  price: number,
  volatility: number,
): { entryZone: [number, number]; invalidation: number; targetZone: [number, number] } {
  const volFrac = volatility / 100;
  if (signal === 'long') {
    const entryLow = price * (1 - volFrac * 0.03);
    const entryHigh = price * (1 - volFrac * 0.001);
    const invalidation = entryLow * (1 - volFrac * 0.02);
    const targetLow = price * (1 + volFrac * 0.03);
    const targetHigh = price * (1 + volFrac * 0.06);
    return { entryZone: [entryLow, entryHigh], invalidation, targetZone: [targetLow, targetHigh] };
  }
  if (signal === 'short') {
    const entryLow = price * (1 + volFrac * 0.001);
    const entryHigh = price * (1 + volFrac * 0.03);
    const invalidation = entryHigh * (1 + volFrac * 0.02);
    const targetLow = price * (1 - volFrac * 0.06);
    const targetHigh = price * (1 - volFrac * 0.03);
    return { entryZone: [entryLow, entryHigh], invalidation, targetZone: [targetLow, targetHigh] };
  }
  const entryLow = price * (1 - volFrac * 0.02);
  const entryHigh = price * (1 + volFrac * 0.02);
  const invalidation = price * (1 + volFrac * 0.05);
  const targetZone: [number, number] = [price, price];
  return { entryZone: [entryLow, entryHigh], invalidation, targetZone };
}

export function generateMarketAssets(): MarketAsset[] {
  return MARKET_DEFS.map((def) => {
    const rng = mulberry32(hashString(def.symbol));
    const candles = generateCandles(rng, def.base);
    const price = candles[candles.length - 1].c;
    const prev = candles[candles.length - 24]?.c ?? def.base;
    const change24h = price - prev;
    const changePercent = change24h / prev;
    const momentum = Math.max(-100, Math.min(100, changePercent * 100 * 4 + randFloat(rng, -10, 10)));
    const volatility = randFloat(rng, 15, 75);
    const regime = changePercent > 0.02 ? 'trending-up' : changePercent < -0.02 ? 'trending-down' : volatility > 50 ? 'volatile' : 'range-bound';
    const signal = momentum > 15 ? 'long' : momentum < -15 ? 'short' : 'neutral';
    const confidence = Math.min(0.9, 0.4 + Math.abs(momentum) / 200);
    const { entryZone, invalidation, targetZone } = buildDirectionalGeometry(signal, price, volatility);
    const updatedOffset = randInt(rng, 5, 60);
    const updatedAt = new Date(SESSION_TIME - updatedOffset * 1000).toISOString();
    return {
      id: `MKT-${def.symbol}`,
      symbol: def.symbol,
      name: def.name,
      price,
      change24h,
      changePercent,
      volume24h: randInt(rng, 1000000, 50000000),
      momentum,
      volatility,
      regime,
      signal,
      confidence,
      entryZone,
      invalidation,
      targetZone,
      suggestedSize: Math.min(8, 2 + Math.abs(momentum) / 25),
      candles,
      analysis: `M1 detects ${regime.replace('-', ' ')} conditions on ${def.symbol}. Momentum reads ${momentum.toFixed(1)} with volatility at ${volatility.toFixed(1)}%. Entry zone sits ${signal === 'long' ? 'just below' : signal === 'short' ? 'just above' : 'around'} current price; invalidation at ${invalidation.toFixed(2)}. This is a synthetic research signal — no live execution is enabled.`,
      updatedAt,
    };
  });
}

// ── Scanner opportunities ──────────────────────────────────────────────────

export function generateScannerOpportunities(
  sports: SportsOpportunity[],
  markets: MarketAsset[],
): ScannerOpportunity[] {
  const out: ScannerOpportunity[] = [];
  sports.forEach((s) => {
    out.push({
      id: `SCN-${s.id}`,
      source: 'sports',
      title: `${s.matchup} — ${getMarketType(s.market)}`,
      subtitle: `${s.league} · ${s.side} · ${s.currentOdds >= 0 ? '+' : ''}${s.currentOdds}`,
      edge: s.edge,
      expectedValue: s.expectedValue,
      confidence: s.confidenceScore,
      risk: s.riskClass,
      timeSensitivity: s.status === 'live' ? 'high' : Math.abs(new Date(s.startTime).getTime() - SESSION_TIME) < 3600000 ? 'high' : 'medium',
      reasoning: s.analysis,
      refId: s.id,
    });
  });
  markets.forEach((m) => {
    if (m.signal === 'neutral') return;
    out.push({
      id: `SCN-${m.id}`,
      source: 'markets',
      title: `${m.symbol} — ${m.signal.toUpperCase()}`,
      subtitle: `${m.regime.replace('-', ' ')} · conf ${(m.confidence * 100).toFixed(0)}%`,
      edge: m.confidence * 0.05,
      expectedValue: m.momentum / 1000,
      confidence: m.confidence,
      risk: m.volatility > 50 ? 'high' : m.volatility > 30 ? 'moderate' : 'low',
      timeSensitivity: m.volatility > 50 ? 'high' : 'medium',
      reasoning: m.analysis,
      refId: m.symbol,
    });
  });
  return out.sort((a, b) => b.expectedValue - a.expectedValue);
}

// ── Equity / P&L history (deterministic) ─────────────────────────────────────

export function generateEquityCurve(starting: number): EquityPoint[] {
  const rng = mulberry32(hashString('equity-curve'));
  const points: EquityPoint[] = [];
  let value = starting;
  const days = 30;
  for (let i = days; i >= 0; i--) {
    const t = SESSION_TIME - i * 86400000;
    const drift = randFloat(rng, -0.025, 0.03);
    value = Math.max(starting * 0.7, value * (1 + drift));
    points.push({ t, value: Math.round(value * 100) / 100 });
  }
  return points;
}

export function generateDailyPnl(): DailyPnlPoint[] {
  const rng = mulberry32(hashString('daily-pnl'));
  const points: DailyPnlPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(SESSION_TIME - i * 86400000);
    const pnl = Math.round(randFloat(rng, -40, 65) * 100) / 100;
    points.push({ date: d.toISOString().slice(0, 10), pnl });
  }
  return points;
}

export function generatePerformanceComparison(): PerformancePoint[] {
  const rng = mulberry32(hashString('perf-compare'));
  const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  return labels.map((label) => ({
    label,
    sports: Math.round(randFloat(rng, -3, 12) * 10) / 10,
    markets: Math.round(randFloat(rng, -4, 10) * 10) / 10,
  }));
}

// ── System logs ──────────────────────────────────────────────────────────────

export function generateInitialLogs(): SystemLogEntry[] {
  const base = [
    { category: 'info' as const, source: 'M1-CORE' as const, message: 'M1 Intelligence Engine initialized' },
    { category: 'info' as const, source: 'SYSTEM' as const, message: 'Secure session established · AES-256' },
    { category: 'info' as const, source: 'SPORTS' as const, message: 'Sports feed synchronized (mock provider)' },
    { category: 'signal' as const, source: 'M1-CORE' as const, message: 'Opportunity scan complete · 14 candidates ranked' },
    { category: 'info' as const, source: 'MARKET' as const, message: 'Market data feed synchronized (mock provider)' },
    { category: 'warning' as const, source: 'SYSTEM' as const, message: 'External feed pending · synthetic simulation active' },
  ];
  return base.map((b, i) => ({
    id: `log-init-${i}`,
    timestamp: new Date(SESSION_TIME - (base.length - i) * 60000).toISOString(),
    category: b.category,
    source: b.source,
    message: b.message,
  }));
}

// ── Seed bet ledger ──────────────────────────────────────────────────────────

const SEED_BET_VERSION = 'seed-v2';

function buildSeedBet(
  rng: () => number,
  opp: SportsOpportunity,
  result: 'won' | 'lost' | 'pending',
  bankroll: number,
  i: number,
): BetRecord {
  // Use the same quarter-Kelly sizing as the live UI
  const stake = Math.round(suggestedStake(opp.edge, opp.confidenceScore, bankroll, DEFAULT_RISK_SETTINGS) * 100) / 100;
  const odds = opp.currentOdds;
  const payout = stake * payoutMultiplier(odds);
  const profitLoss = result === 'won' ? payout : result === 'lost' ? -stake : 0;
  return {
    id: `seed-bet-v2-${i}`,
    type: 'straight',
    legs: [
      {
        opportunityId: opp.id,
        matchup: opp.matchup,
        market: opp.market,
        side: opp.side,
        odds,
        modelProbability: opp.modelProbability,
        edge: opp.edge,
        confidenceScore: opp.confidenceScore,
      },
    ],
    stake,
    odds,
    potentialPayout: stake + payout,
    potentialProfit: payout,
    result,
    profitLoss,
    confidence: opp.confidenceScore,
    edge: opp.edge,
    modelVersion: MODEL_VERSION,
    reasoning: opp.analysis,
    timestamp: new Date(SESSION_TIME - (8 - i) * 7200000).toISOString(),
    riskClass: opp.riskClass,
  };
}

export function generateSeedBets(opps: SportsOpportunity[]): BetRecord[] {
  const rng = mulberry32(hashString('seed-bets-v2'));
  const out: BetRecord[] = [];
  const bankroll = DEFAULT_RISK_SETTINGS.startingBankroll; // $500

  // Only use qualifying candidates: positive edge, positive EV, confidence >= 50%
  const qualifying = opps.filter((o) => o.edge > 0 && o.expectedValue > 0 && o.confidenceScore >= 0.5);
  if (qualifying.length === 0) return out;

  // Pick up to 8 qualifying candidates, sorted by edge descending for variety
  const selected = [...qualifying].sort((a, b) => b.edge - a.edge).slice(0, 8);

  // Realistic mixed record: 3 wins, 3 losses, 2 pending — modest near-flat return
  // Losses are expected despite positive edge — single-event variance is high
  const results: ('won' | 'lost' | 'pending')[] = [
    'won', 'lost', 'won', 'lost', 'lost', 'won', 'pending', 'pending',
  ];

  selected.forEach((opp, i) => {
    out.push(buildSeedBet(rng, opp, results[i] ?? 'pending', bankroll, i));
  });

  return out;
}

/**
 * Migrate persisted bets: remove old seed-v1 records (which had invalid markets
 * and wrong confidence/edge mapping) while preserving user-created bets.
 * Old seed bets have IDs starting with "seed-bet-" (not "seed-bet-v2-").
 */
export function migrateSeedBets(existingBets: BetRecord[]): BetRecord[] {
  return existingBets.filter((b) => {
    if (!b.id.startsWith('seed-bet-')) return true;
    return b.id.startsWith('seed-bet-v2-');
  });
}

/**
 * Recompute the bankroll from starting balance + settled P/L.
 * Pending exposure is tracked separately via open bets.
 */
export function computeResetBankroll(bets: BetRecord[], startingBankroll: number): number {
  const settledPnl = bets
    .filter((b) => b.result === 'won' || b.result === 'lost')
    .reduce((s, b) => s + b.profitLoss, 0);
  return Math.max(0, startingBankroll + settledPnl);
}

export { MODEL_VERSION, SEED_BET_VERSION };
