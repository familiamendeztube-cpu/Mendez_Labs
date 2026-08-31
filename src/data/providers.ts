import type {
  MarketAsset,
  ScannerOpportunity,
  SportsOpportunity,
  Team,
} from '@/types/models';
import type { ProviderBundle, NormalizedGame, NormalizedOdds } from '@/types/providers';
import {
  generateMarketAssets,
  generateScannerOpportunities,
  generateSportsOpportunities,
} from '@/data/mockData';

// ── Mock provider implementations ───────────────────────────────────────────

class MockSportsDataProvider {
  private data: SportsOpportunity[];
  constructor() {
    this.data = generateSportsOpportunities();
  }
  async getGames(): Promise<NormalizedGame[]> {
    return [];
  }
  async getGame(): Promise<NormalizedGame | undefined> {
    return undefined;
  }
  async getTeamStats(): Promise<Team | undefined> {
    return undefined;
  }
  async getInjuries(): Promise<Team['injuries']> {
    return [];
  }
  async getOpportunities(): Promise<SportsOpportunity[]> {
    return this.data;
  }
  async getOpportunity(id: string): Promise<SportsOpportunity | undefined> {
    return this.data.find((o) => o.id === id);
  }
  refresh(): Promise<void> {
    this.data = generateSportsOpportunities();
    return Promise.resolve();
  }
}

class MockOddsDataProvider {
  async getOdds(): Promise<NormalizedOdds | undefined> {
    return undefined;
  }
  async getLineMovement(opportunityId: string): Promise<{ t: number; odds: number }[]> {
    const sports = new MockSportsDataProvider();
    const opp = await sports.getOpportunity(opportunityId);
    return opp?.lineMovement ?? [];
  }
  async refresh(): Promise<void> {}
}

class MockMarketDataProvider {
  private data: MarketAsset[];
  constructor() {
    this.data = generateMarketAssets();
  }
  async getAssets(): Promise<MarketAsset[]> {
    return this.data;
  }
  async getAsset(symbol: string): Promise<MarketAsset | undefined> {
    return this.data.find((a) => a.symbol === symbol);
  }
}

class MockExecutionProvider {
  async placeOrder(): Promise<{ ok: boolean; id: string }> {
    return { ok: true, id: `sim-exec-${Date.now()}` };
  }
}

class MockScannerProvider {
  private sports: SportsOpportunity[];
  private markets: MarketAsset[];
  constructor() {
    this.sports = generateSportsOpportunities();
    this.markets = generateMarketAssets();
  }
  async scan(): Promise<ScannerOpportunity[]> {
    return generateScannerOpportunities(this.sports, this.markets);
  }
}

export function createMockProviders(): ProviderBundle & {
  refreshSports: () => void;
  getSportsSnapshot: () => SportsOpportunity[];
  getMarketSnapshot: () => MarketAsset[];
} {
  const sportsProvider = new MockSportsDataProvider();
  const marketProvider = new MockMarketDataProvider();
  const scannerProvider = new MockScannerProvider();

  return {
    sports: sportsProvider,
    odds: new MockOddsDataProvider(),
    market: marketProvider,
    execution: new MockExecutionProvider(),
    scanner: scannerProvider,
    refreshSports: () => { void sportsProvider.refresh(); },
    getSportsSnapshot: () => sportsProvider['data'],
    getMarketSnapshot: () => marketProvider['data'],
  };
}
