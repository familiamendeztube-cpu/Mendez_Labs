import type {
  League,
  EventStatus,
  Team,
  ScannerOpportunity,
  MarketAsset,
} from '@/types/models';

// ── Provider connection status ───────────────────────────────────────────────

export type ProviderStatus = 'not-connected' | 'connected' | 'error';

export interface ProviderConnectionInfo {
  status: ProviderStatus;
  providerName: string | null;
  lastSync: string | null;
  error: string | null;
}

// ── Normalized game/schedule objects ─────────────────────────────────────────

export interface NormalizedGame {
  id: string;
  league: League;
  homeTeam: Team;
  awayTeam: Team;
  startTime: string;
  status: EventStatus;
  homeScore: number | null;
  awayScore: number | null;
  source: string;
  sourceTimestamp: string;
}

export interface NormalizedMarket {
  market: string;
  side: string;
  odds: number;
  source: string;
  sourceTimestamp: string;
}

export interface NormalizedOdds {
  gameId: string;
  markets: NormalizedMarket[];
  source: string;
  sourceTimestamp: string;
}

// ── Typed provider interfaces ────────────────────────────────────────────────

export interface SportsDataProvider {
  getGames(opts?: { league?: League; date?: string }): Promise<NormalizedGame[]>;
  getGame(id: string): Promise<NormalizedGame | undefined>;
  getTeamStats(teamAbbr: string): Promise<Team | undefined>;
  getInjuries(teamAbbr: string): Promise<Team['injuries']>;
  refresh(): Promise<void>;
}

export interface OddsDataProvider {
  getOdds(gameId: string): Promise<NormalizedOdds | undefined>;
  getLineMovement(gameId: string, market: string, side: string): Promise<{ t: number; odds: number }[]>;
  refresh(): Promise<void>;
}

export interface MarketDataProvider {
  getAssets(): Promise<MarketAsset[]>;
  getAsset(symbol: string): Promise<MarketAsset | undefined>;
}

export interface ExecutionProvider {
  placeOrder(payload: { symbol: string; side: 'buy' | 'sell'; size: number }): Promise<{ ok: boolean; id: string }>;
}

export interface ScannerProvider {
  scan(): Promise<ScannerOpportunity[]>;
}

export interface ProviderBundle {
  sports: SportsDataProvider;
  odds: OddsDataProvider;
  market: MarketDataProvider;
  execution: ExecutionProvider;
  scanner: ScannerProvider;
}

// ── Provider adapter config ──────────────────────────────────────────────────
// Secrets (ESPN/Sportradar/The Odds API keys) must live server-side in a
// Supabase Edge Function or equivalent server proxy — NEVER in VITE_ vars
// or browser storage. The client only needs a non-secret proxy URL.

export interface ProviderConfig {
  sportsData: {
    provider: string;
    proxyUrlEnv: string;
    defaultProxyUrl: string;
  };
  oddsData: {
    provider: string;
    proxyUrlEnv: string;
    defaultProxyUrl: string;
  };
}

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  sportsData: {
    provider: 'ESPN Sports / TheSportsDB',
    proxyUrlEnv: 'VITE_SPORTS_PROXY_URL',
    defaultProxyUrl: '/api/sports',
  },
  oddsData: {
    provider: 'The Odds API',
    proxyUrlEnv: 'VITE_ODDS_PROXY_URL',
    defaultProxyUrl: '/api/odds',
  },
};
