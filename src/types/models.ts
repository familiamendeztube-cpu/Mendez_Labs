// Core domain models for the Mendez Labs sports betting research terminal.

export type League = 'NBA' | 'NFL' | 'MLB' | 'NHL' | 'Soccer';
export type EventStatus = 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled';
export type RiskClass = 'low' | 'moderate' | 'high';
export type ConfidenceLevel = 'low' | 'moderate' | 'high' | 'very-high';

// ── Team ─────────────────────────────────────────────────────────────────────

export interface Team {
  name: string;
  abbr: string;
  city: string;
  color: string;
  record: string;
  recentForm: string[];
  offRating: number;
  defRating: number;
  pace: number;
  homeRecord: string;
  awayRecord: string;
  restDays: number;
  injuries: InjuryIndicator[];
}

export interface InjuryIndicator {
  player: string;
  status: 'questionable' | 'doubtful' | 'out';
  impact: 'low' | 'moderate' | 'high';
}

// ── Odds ─────────────────────────────────────────────────────────────────────

export interface OddsPoint {
  t: number;
  odds: number;
}

export interface GameOdds {
  source: string;
  sourceTimestamp: string;
  openingOdds: number;
  currentOdds: number;
  lineMovement: OddsPoint[];
}

// ── Sports Opportunity (researched pick candidate) ───────────────────────────

export interface EvidenceSignal {
  text: string;
  supportsSelection: boolean;
}

export interface SportsOpportunity {
  id: string;
  league: League;
  matchup: string;
  homeTeam: Team;
  awayTeam: Team;
  status: EventStatus;
  startTime: string;
  market: string;
  side: string;
  openingOdds: number;
  currentOdds: number;
  lineMovement: OddsPoint[];
  modelProbability: number;
  impliedProbability: number;
  edge: number;
  expectedValue: number;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  suggestedStake: number;
  riskClass: RiskClass;
  recentForm: { home: string[]; away: string[] };
  headToHead: { homeWins: number; awayWins: number; lastMeeting: string };
  supportingSignals: EvidenceSignal[];
  contradictingSignals: EvidenceSignal[];
  riskWarnings: string[];
  analysis: string;
  modelVersion: string;
  updatedAt: string;
  source: string;
}

// ── Pick Five (locked daily picks) ────────────────────────────────────────────

export type PickResult = 'pending' | 'won' | 'lost' | 'push' | 'void';

export interface FrozenPick {
  slot: number;
  opportunityId: string;
  matchup: string;
  league: League;
  market: string;
  side: string;
  line: string;
  odds: number;
  source: string;
  sourceTimestamp: string;
  modelProbability: number;
  impliedProbability: number;
  edge: number;
  confidenceScore: number;
  suggestedStake: number;
  reasoning: string;
  startTime: string;
  frozenAt: string;
  auditNote?: string;
}

export interface PickFiveSet {
  id: string;
  date: string;
  timezone: string;
  picks: FrozenPick[];
  locked: boolean;
  lockedAt: string | null;
}

export interface SettledPick extends FrozenPick {
  result: PickResult;
  finalScore: string;
  profitLoss: number;
  closingOdds?: number;
  beatClosingLine?: boolean;
  settledAt: string;
}

export interface PickFiveDayRecord {
  date: string;
  picks: SettledPick[];
  record: { won: number; lost: number; push: number; pending: number; void: number; total: number; settled: number; winPercentage: number };
  dailyProfit: number;
}

// ── Bet Record (legacy compatibility for migration) ──────────────────────────

export type BetResult = 'pending' | 'won' | 'lost' | 'voided' | 'rejected';
export type BetType = 'straight' | 'parlay';

export interface BetLeg {
  opportunityId: string;
  matchup: string;
  market: string;
  side: string;
  odds: number;
  modelProbability: number;
  edge: number;
  confidenceScore: number;
}

export interface BetRecord {
  id: string;
  type: BetType;
  legs: BetLeg[];
  stake: number;
  odds: number;
  potentialPayout: number;
  potentialProfit: number;
  result: BetResult;
  profitLoss: number;
  confidence: number;
  edge: number;
  modelVersion: string;
  reasoning: string;
  timestamp: string;
  riskClass: RiskClass;
}

// ── Risk Settings ────────────────────────────────────────────────────────────

export type RiskProfile = 'controlled' | 'aggressive' | 'speculative';

export interface RiskSettings {
  profile: RiskProfile;
  startingBankroll: number;
  maxStakePercent: number;
  maxDailyExposure: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  profitCompounding: boolean;
  drawdownShutdown: number;
  emergencyStop: boolean;
}

// ── System ───────────────────────────────────────────────────────────────────

export type LogCategory = 'info' | 'signal' | 'warning' | 'risk' | 'error';
export type LogSource = 'M1-CORE' | 'SPORTS' | 'MARKET' | 'RISK' | 'EXEC' | 'SYSTEM';

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  category: LogCategory;
  source: LogSource;
  message: string;
  meta?: Record<string, string | number>;
}

// ── Market Assets (Labs / Coming later) ──────────────────────────────────────

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent: number;
  volume24h: number;
  momentum: number;
  volatility: number;
  regime: 'trending-up' | 'trending-down' | 'range-bound' | 'volatile';
  signal: 'long' | 'short' | 'neutral';
  confidence: number;
  entryZone: [number, number];
  invalidation: number;
  targetZone: [number, number];
  suggestedSize: number;
  candles: MarketCandle[];
  analysis: string;
  updatedAt: string;
}

export interface MarketCandle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

// ── Scanner (legacy compatibility) ──────────────────────────────────────────

export interface ScannerOpportunity {
  id: string;
  source: 'sports' | 'markets';
  title: string;
  subtitle: string;
  edge: number;
  expectedValue: number;
  confidence: number;
  risk: RiskClass;
  timeSensitivity: 'low' | 'medium' | 'high';
  reasoning: string;
  refId: string;
}

// ── Dashboard Metrics ────────────────────────────────────────────────────────

export interface DashboardMetrics {
  startingBankroll: number;
  currentBalance: number;
  todayPnl: number;
  totalReturnPct: number;
  openExposure: number;
  maxDrawdown: number;
  activeOpportunities: number;
  modelConfidence: number;
  betsWon: number;
  betsLost: number;
  engineStatus: 'online' | 'halted';
}

export interface EquityPoint {
  t: number;
  value: number;
}

export interface DailyPnlPoint {
  date: string;
  pnl: number;
}

export interface PerformancePoint {
  label: string;
  sports: number;
  markets: number;
}
