// V55C — Trading page constants and pure helpers. Exported for tests.

// ── Connection states ───────────────────────────────────────────────────────

export type ConnectionStatus = 'connected' | 'missing_credentials' | 'api_not_verified' | 'error';

export interface ConnectionCard {
  id: string;
  name: string;
  status: ConnectionStatus;
  description: string;
  lastSync: string | null;
  latencyMs: number | null;
  quota: string | null;
  nextAction: string;
}

export function defaultConnections(): ConnectionCard[] {
  return [
    {
      id: 'alpaca-paper',
      name: 'Alpaca Paper',
      status: 'missing_credentials',
      description: 'Paper trading API for simulated orders',
      lastSync: null,
      latencyMs: null,
      quota: null,
      nextAction: 'Add Alpaca paper API keys in Bolt Secrets',
    },
    {
      id: 'alpaca-live',
      name: 'Alpaca Live',
      status: 'missing_credentials',
      description: 'Live trading API (locked until verified)',
      lastSync: null,
      latencyMs: null,
      quota: null,
      nextAction: 'Add Alpaca live API keys in Bolt Secrets',
    },
    {
      id: 'market-data',
      name: 'Market Data',
      status: 'missing_credentials',
      description: 'Real-time and historical market data',
      lastSync: null,
      latencyMs: null,
      quota: null,
      nextAction: 'Add market data API keys in Bolt Secrets',
    },
  ];
}

// ── Settings connections (sports + trading) ──────────────────────────────────

export function defaultSettingsConnections(): ConnectionCard[] {
  return [
    {
      id: 'odds-api',
      name: 'The Odds API',
      status: 'missing_credentials',
      description: 'Sports odds from 70+ bookmakers',
      lastSync: null,
      latencyMs: null,
      quota: null,
      nextAction: 'Add API key in Bolt Secrets',
    },
    {
      id: 'api-sports',
      name: 'API-Sports',
      status: 'missing_credentials',
      description: 'Sports statistics and scores',
      lastSync: null,
      latencyMs: null,
      quota: null,
      nextAction: 'Add API key in Bolt Secrets',
    },
    {
      id: 'betdaq',
      name: 'BETDAQ Exchange',
      status: 'api_not_verified',
      description: 'Betting exchange API access',
      lastSync: null,
      latencyMs: null,
      quota: null,
      nextAction: 'Website login does not verify API access. Add API credentials in Bolt Secrets.',
    },
    {
      id: 'alpaca-paper',
      name: 'Alpaca Paper',
      status: 'missing_credentials',
      description: 'Paper trading API',
      lastSync: null,
      latencyMs: null,
      quota: null,
      nextAction: 'Add Alpaca paper API keys in Bolt Secrets',
    },
    {
      id: 'alpaca-live',
      name: 'Alpaca Live',
      status: 'missing_credentials',
      description: 'Live trading API (locked)',
      lastSync: null,
      latencyMs: null,
      quota: null,
      nextAction: 'Add Alpaca live API keys in Bolt Secrets',
    },
  ];
}

// ── Readiness summary ───────────────────────────────────────────────────────

export interface ReadinessSummary {
  sportsData: boolean;
  sportsExecution: 'locked';
  tradingPaper: boolean;
  tradingLive: 'locked';
}

export function computeReadiness(connections: ConnectionCard[]): ReadinessSummary {
  const oddsApi = connections.find((c) => c.id === 'odds-api');
  return {
    sportsData: oddsApi?.status === 'connected',
    sportsExecution: 'locked',
    tradingPaper: connections.find((c) => c.id === 'alpaca-paper')?.status === 'connected',
    tradingLive: 'locked',
  };
}

// ── Readiness checklist items ───────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  label: string;
  verified: boolean;
  blocksLive: boolean;
}

export function defaultChecklist(): ChecklistItem[] {
  return [
    { id: 'paper-keys', label: 'Server-side paper API keys verified', verified: false, blocksLive: true },
    { id: 'paper-reachable', label: 'Paper account reachable', verified: false, blocksLive: true },
    { id: 'market-data', label: 'Market data entitlement verified', verified: false, blocksLive: true },
    { id: 'quotes-fresh', label: 'Quotes fresh (<15s)', verified: false, blocksLive: true },
    { id: 'paper-orders', label: 'Paper orders tested', verified: false, blocksLive: true },
    { id: 'cancel-replace', label: 'Cancel/replace tested', verified: false, blocksLive: true },
    { id: 'reconciliation', label: 'Position reconciliation tested', verified: false, blocksLive: true },
    { id: 'risk-caps', label: 'Risk caps active', verified: false, blocksLive: true },
    { id: 'kill-switch', label: 'Emergency kill switch active', verified: false, blocksLive: true },
    { id: 'min-sample', label: 'Minimum paper sample complete', verified: false, blocksLive: true },
    { id: 'live-toggle', label: 'Explicit live trading toggle', verified: false, blocksLive: true },
  ];
}

export function isLiveReady(checklist: ChecklistItem[]): boolean {
  return checklist.every((c) => c.verified);
}

// ── Risk constants (trading) ────────────────────────────────────────────────

export const TRADING_PLANNED_LIVE = 100;
export const TRADING_DEFAULT_RISK_PCT = 0.01;
export const TRADING_ABSOLUTE_RISK_PCT = 0.02;
export const TRADING_DAILY_STOP_PCT = 0.05;
export const TRADING_DRAWDOWN_PAUSE_PCT = 0.10;

// ── Watchlist column definitions ────────────────────────────────────────────

export const WATCHLIST_COLUMNS = [
  'symbol', 'price', 'trend', 'volatility', 'volume',
  'score', 'entry', 'stop', 'target', 'riskReward',
  'positionSize', 'status', 'reason',
] as const;

export type WatchlistColumn = typeof WATCHLIST_COLUMNS[number];

// ── Account metrics (all N/A until verified) ────────────────────────────────

export interface AccountMetrics {
  equity: number | null;
  cash: number | null;
  buyingPower: number | null;
  dayPL: number | null;
  totalPL: number | null;
  positions: number | null;
  grossExposure: number | null;
  netExposure: number | null;
  maxDrawdown: number | null;
}

export function emptyAccountMetrics(): AccountMetrics {
  return {
    equity: null, cash: null, buyingPower: null,
    dayPL: null, totalPL: null, positions: null,
    grossExposure: null, netExposure: null, maxDrawdown: null,
  };
}

// ── Signal metrics (all N/A until verified) ─────────────────────────────────

export interface SignalMetrics {
  symbolsScanned: number | null;
  qualified: number | null;
  excluded: number | null;
  pending: number | null;
  settledWinRate: number | null;
  profitFactor: number | null;
  averageGain: number | null;
  averageLoss: number | null;
  expectancy: number | null;
  sharpe: number | null;
  estimatedSlippage: number | null;
  dataTimestamp: string | null;
}

export function emptySignalMetrics(): SignalMetrics {
  return {
    symbolsScanned: null, qualified: null, excluded: null, pending: null,
    settledWinRate: null, profitFactor: null, averageGain: null,
    averageLoss: null, expectancy: null, sharpe: null,
    estimatedSlippage: null, dataTimestamp: null,
  };
}

// ── Status label ────────────────────────────────────────────────────────────

export function connectionStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connected': return 'Connected';
    case 'missing_credentials': return 'Missing credentials';
    case 'api_not_verified': return 'API access not verified';
    case 'error': return 'Error';
  }
}
