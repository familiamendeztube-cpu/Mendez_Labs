import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BetLeg,
  BetRecord,
  BetType,
  DashboardMetrics,
  FrozenPick,
  PickFiveSet,
  RiskSettings,
  SystemLogEntry,
} from '@/types/models';
import {
  fetchLiveFeed,
  settlePicks,
  type LiveEvent,
  type RankedPick,
  type ProviderHealth,
  type ModelHealth,
  type FeedResult,
} from '@/services/liveData';
import { DEFAULT_RISK_SETTINGS, applyProfile, evaluateWager, suggestedStake } from '@/utils/risk';
import { payoutMultiplier } from '@/utils/format';
import { americanToImpliedProb, calculateEdge, canAddPick, canLockPickFive, canReplacePick, isContradictory } from '@/utils/pickFive';
import {
  M1_STATE_SCHEMA_VERSION,
  SCHEMA_VERSION_KEY,
  STORAGE_KEY,
  DEFAULT_SETTINGS,
  type AppSettings,
  type PersistedState,
} from '@/utils/migration';
import { useAuth } from '@/lib/useAuth';

export type { AppSettings } from '@/utils/migration';
export { DEFAULT_SETTINGS } from '@/utils/migration';

interface StoreContextValue {
  authenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signUp: (email: string, password: string) => Promise<unknown>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  userEmail: string | null;

  bets: BetRecord[];
  addBet: (legs: BetLeg[], type: BetType, stake: number) => { ok: boolean; reason?: string; bet?: BetRecord };
  resetSimulation: () => void;

  riskSettings: RiskSettings;
  setRiskSettings: (s: RiskSettings) => void;
  setRiskProfile: (p: RiskSettings['profile']) => void;

  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;

  watchlist: string[];
  toggleWatch: (id: string) => void;

  logs: SystemLogEntry[];
  addLog: (entry: Omit<SystemLogEntry, 'id' | 'timestamp'>) => void;

  liveEvents: LiveEvent[];
  rankedPicks: RankedPick[];
  feedLoading: boolean;
  feedError: string | null;
  feedProvider: ProviderHealth | null;
  modelHealth: ModelHealth | null;
  refreshFeed: () => void;
  lastFeedFetch: Date | null;

  metrics: DashboardMetrics;

  betSlipOpen: boolean;
  setBetSlipOpen: (v: boolean) => void;
  betSlipLegs: BetLeg[];
  addBetSlipLeg: (pick: RankedPick) => void;
  removeBetSlipLeg: (oppId: string) => void;
  clearBetSlip: () => void;

  pickFiveToday: PickFiveSet;
  settledHistory: SettledPickRecord[];
  addToPickFive: (pick: RankedPick) => { ok: boolean; reason?: string };
  removeFromPickFive: (slot: number) => void;
  reorderPickFive: (fromSlot: number, toSlot: number) => void;
  lockPickFive: () => { ok: boolean; reason?: string };
  replacePick: (slot: number, pick: RankedPick, auditNote: string) => { ok: boolean; reason?: string };
  settlePendingPicks: () => Promise<void>;
}

export interface SettledPickRecord extends FrozenPick {
  result: 'won' | 'lost' | 'push' | 'void' | 'pending';
  finalScore?: string;
  profitLoss: number;
  settledAt?: string;
  settlementSource?: string;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(SCHEMA_VERSION_KEY, String(M1_STATE_SCHEMA_VERSION));
  } catch {
    // ignore
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function generateTodayPickFiveId(): string {
  const today = new Date();
  return `pickfive-${today.toISOString().slice(0, 10)}`;
}

function generateTodayPickFive(): PickFiveSet {
  return {
    id: generateTodayPickFiveId(),
    date: new Date().toISOString().slice(0, 10),
    timezone: 'America/Costa_Rica',
    picks: [],
    locked: false,
    lockedAt: null,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const persisted = useRef(loadState()).current;
  const auth = useAuth();

  useEffect(() => {
    if (persisted && 'demoHistory' in persisted) {
      const cleaned = { ...persisted, demoHistory: undefined as unknown, scanner: undefined as unknown } as unknown as PersistedState;
      saveState(cleaned);
    }
  }, [persisted]);

  const [bets, setBets] = useState<BetRecord[]>(persisted?.bets ?? []);
  const [riskSettings, setRiskSettingsState] = useState<RiskSettings>(
    persisted?.riskSettings ?? DEFAULT_RISK_SETTINGS,
  );
  const [settings, setSettingsState] = useState<AppSettings>(persisted?.settings ?? DEFAULT_SETTINGS);
  const [watchlist, setWatchlist] = useState<string[]>(persisted?.watchlist ?? []);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [balance, setBalance] = useState<number>(persisted?.balance ?? riskSettings.startingBankroll);

  const [pickFiveToday, setPickFiveToday] = useState<PickFiveSet>(
    persisted?.pickFiveToday ?? generateTodayPickFive(),
  );
  const [settledHistory, setSettledHistory] = useState<SettledPickRecord[]>([]);

  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [rankedPicks, setRankedPicks] = useState<RankedPick[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedProvider, setFeedProvider] = useState<ProviderHealth | null>(null);
  const [modelHealth, setModelHealth] = useState<ModelHealth | null>(null);
  const [lastFeedFetch, setLastFeedFetch] = useState<Date | null>(null);

  const [betSlipOpen, setBetSlipOpen] = useState(false);
  const [betSlipLegs, setBetSlipLegs] = useState<BetLeg[]>([]);

  useEffect(() => {
    saveState({
      authenticated: auth.authenticated,
      bets,
      riskSettings,
      settings,
      watchlist,
      logs,
      balance,
      pickFiveToday,
      demoHistory: settledHistory as unknown as PersistedState['demoHistory'],
    } as unknown as PersistedState);
  }, [auth.authenticated, bets, riskSettings, settings, watchlist, logs, balance, pickFiveToday, settledHistory]);

  const refreshFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const result: FeedResult = await fetchLiveFeed();
      setLiveEvents(result.events);
      setRankedPicks(result.picks);
      setFeedProvider(result.provider);
      setModelHealth(result.model);
      setLastFeedFetch(new Date());
      if (result.provider.status === 'error' && result.events.length === 0) {
        setFeedError(result.provider.message || 'Unable to load live sports data');
      }
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : 'Failed to fetch live data');
      setFeedProvider({
        status: 'error',
        name: 'The Odds API',
        lastSync: null,
        cacheExpires: null,
        remainingQuota: null,
        eventsCount: 0,
        bookmakersCount: 0,
        sportsFetched: 0,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      setModelHealth(null);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth.authenticated) {
      refreshFeed();
    }
  }, [auth.authenticated, refreshFeed]);

  const addLog = useCallback((entry: Omit<SystemLogEntry, 'id' | 'timestamp'>) => {
    setLogs((prev) => [
      { ...entry, id: uid('log'), timestamp: new Date().toISOString() },
      ...prev,
    ].slice(0, 500));
  }, []);

  const setRiskSettings = useCallback((s: RiskSettings) => {
    setRiskSettingsState(s);
  }, []);

  const setRiskProfile = useCallback((p: RiskSettings['profile']) => {
    setRiskSettingsState((prev) => applyProfile(prev, p));
  }, []);

  const setSettings = useCallback((s: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...s }));
  }, []);

  const toggleWatch = useCallback((id: string) => {
    setWatchlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const addBet = useCallback(
    (legs: BetLeg[], type: BetType, stake: number): { ok: boolean; reason?: string; bet?: BetRecord } => {
      const combinedOdds = type === 'parlay'
        ? legs.reduce((acc, leg) => acc * (payoutMultiplier(leg.odds) + 1), 1) - 1
        : legs[0]?.odds ?? 0;
      const evalResult = evaluateWager(stake, balance, riskSettings.startingBankroll, bets, riskSettings);
      if (!evalResult.ok) {
        const rejectedBet: BetRecord = {
          id: uid('bet'),
          type,
          legs,
          stake,
          odds: combinedOdds,
          potentialPayout: 0,
          potentialProfit: 0,
          result: 'rejected',
          profitLoss: 0,
          confidence: legs.reduce((s, l) => s + l.confidenceScore, 0) / (legs.length || 1),
          edge: legs.reduce((s, l) => s + l.edge, 0) / (legs.length || 1),
          modelVersion: 'live-v1',
          reasoning: evalResult.reason ?? 'Rejected by risk engine',
          timestamp: new Date().toISOString(),
          riskClass: 'high',
        };
        setBets((prev) => [rejectedBet, ...prev]);
        return { ok: false, reason: evalResult.reason };
      }

      const payout = stake * payoutMultiplier(combinedOdds);
      const bet: BetRecord = {
        id: uid('bet'),
        type,
        legs,
        stake,
        odds: combinedOdds,
        potentialPayout: stake + payout,
        potentialProfit: payout,
        result: 'pending',
        profitLoss: 0,
        confidence: legs.reduce((s, l) => s + l.confidenceScore, 0) / (legs.length || 1),
        edge: legs.reduce((s, l) => s + l.edge, 0) / (legs.length || 1),
        modelVersion: 'live-v1',
        reasoning: legs.map((l) => `${l.matchup} ${l.market} ${l.side}`).join(' · '),
        timestamp: new Date().toISOString(),
        riskClass: legs.length > 1 ? 'high' : 'moderate',
      };
      setBets((prev) => [bet, ...prev]);
      setBalance((prev) => prev - stake);
      return { ok: true, bet };
    },
    [balance, bets, riskSettings],
  );

  const resetSimulation = useCallback(() => {
    setBets([]);
    setBalance(riskSettings.startingBankroll);
    setWatchlist([]);
    setSettledHistory([]);
    setPickFiveToday(generateTodayPickFive());
    setLogs([]);
  }, [riskSettings.startingBankroll]);

  const addToPickFive = useCallback((pick: RankedPick): { ok: boolean; reason?: string } => {
    const matchup = `${pick.homeTeam} vs ${pick.awayTeam}`;
    const newPick = { opportunityId: pick.eventId, matchup, startTime: pick.startTime };
    const validation = canAddPick(pickFiveToday, newPick);
    if (!validation.ok) return validation;

    if (isContradictory(pickFiveToday.picks, { matchup, market: pick.market, side: pick.side })) {
      return { ok: false, reason: 'This pick contradicts another pick from the same game.' };
    }

    const implied = americanToImpliedProb(pick.bestOdds);
    const consensus = pick.consensusProbability ?? implied;
    const edge = calculateEdge(consensus, implied);
    const stake = Math.round(suggestedStake(edge, consensus, balance, riskSettings) * 100) / 100;
    const slot = pickFiveToday.picks.length + 1;

    const frozenPick: FrozenPick = {
      slot,
      opportunityId: pick.eventId,
      matchup,
      league: pick.league as FrozenPick['league'],
      market: pick.market,
      side: pick.side,
      line: pick.line,
      odds: pick.bestOdds,
      source: pick.source,
      sourceTimestamp: pick.sourceTimestamp,
      modelProbability: consensus,
      impliedProbability: implied,
      edge,
      confidenceScore: consensus,
      suggestedStake: stake,
      reasoning: pick.reasoning,
      startTime: pick.startTime,
      frozenAt: new Date().toISOString(),
    };

    setPickFiveToday((prev) => ({
      ...prev,
      picks: [...prev.picks, frozenPick],
    }));
    return { ok: true };
  }, [pickFiveToday, balance, riskSettings]);

  const removeFromPickFive = useCallback((slot: number) => {
    setPickFiveToday((prev) => ({
      ...prev,
      picks: prev.picks.filter((p) => p.slot !== slot).map((p, i) => ({ ...p, slot: i + 1 })),
    }));
  }, []);

  const reorderPickFive = useCallback((fromSlot: number, toSlot: number) => {
    setPickFiveToday((prev) => {
      const picks = [...prev.picks];
      const [moved] = picks.splice(fromSlot - 1, 1);
      picks.splice(toSlot - 1, 0, moved);
      return { ...prev, picks: picks.map((p, i) => ({ ...p, slot: i + 1 })) };
    });
  }, []);

  const lockPickFive = useCallback((): { ok: boolean; reason?: string } => {
    const validation = canLockPickFive(pickFiveToday);
    if (!validation.ok) return validation;
    setPickFiveToday((prev) => ({
      ...prev,
      locked: true,
      lockedAt: new Date().toISOString(),
    }));
    return { ok: true };
  }, [pickFiveToday]);

  const replacePick = useCallback((slot: number, pick: RankedPick, auditNote: string): { ok: boolean; reason?: string } => {
    const matchup = `${pick.homeTeam} vs ${pick.awayTeam}`;
    const validation = canReplacePick(pickFiveToday, slot, { opportunityId: pick.eventId, matchup, startTime: pick.startTime });
    if (!validation.ok) return validation;

    const implied = americanToImpliedProb(pick.bestOdds);
    const consensus = pick.consensusProbability ?? implied;
    const edge = calculateEdge(consensus, implied);
    const stake = Math.round(suggestedStake(edge, consensus, balance, riskSettings) * 100) / 100;

    const frozenPick: FrozenPick = {
      slot,
      opportunityId: pick.eventId,
      matchup,
      league: pick.league as FrozenPick['league'],
      market: pick.market,
      side: pick.side,
      line: pick.line,
      odds: pick.bestOdds,
      source: pick.source,
      sourceTimestamp: pick.sourceTimestamp,
      modelProbability: consensus,
      impliedProbability: implied,
      edge,
      confidenceScore: consensus,
      suggestedStake: stake,
      reasoning: pick.reasoning,
      startTime: pick.startTime,
      frozenAt: new Date().toISOString(),
      auditNote,
    };

    setPickFiveToday((prev) => ({
      ...prev,
      picks: prev.picks.map((p) => (p.slot === slot ? frozenPick : p)),
    }));
    return { ok: true };
  }, [pickFiveToday, balance, riskSettings]);

  const settlePendingPicks = useCallback(async () => {
    if (!pickFiveToday.locked || pickFiveToday.picks.length === 0) return;

    const pendingPicks = pickFiveToday.picks.map((p) => ({
      id: p.opportunityId,
      eventId: p.opportunityId,
      sportKey: p.league === 'NFL' ? 'americanfootball_nfl'
        : p.league === 'NBA' ? 'basketball_nba'
        : p.league === 'MLB' ? 'baseball_mlb'
        : p.league === 'NHL' ? 'icehockey_nhl'
        : 'soccer_epl',
      market: p.market,
      side: p.side,
      line: p.line,
      isHome: p.side.includes(p.matchup.split(' vs ')[0]?.split(' ')[0] ?? '') || p.side === p.matchup.split(' vs ')[0],
    }));

    const results = await settlePicks(pendingPicks);
    if (results.length === 0) return;

    const settled: SettledPickRecord[] = pickFiveToday.picks.map((pick) => {
      const result = results.find((r) => r.id === pick.opportunityId);
      if (!result) {
        return { ...pick, result: 'pending' as const, profitLoss: 0 };
      }
      const pl = result.result === 'won'
        ? pick.suggestedStake * payoutMultiplier(pick.odds)
        : result.result === 'lost'
        ? -pick.suggestedStake
        : 0;
      return {
        ...pick,
        result: result.result,
        finalScore: result.finalScore,
        profitLoss: pl,
        settledAt: result.settledAt,
        settlementSource: result.source,
      };
    });

    const completed = settled.filter((s) => s.result !== 'pending');
    if (completed.length > 0) {
      setSettledHistory((prev) => [...prev, ...completed]);
      const totalPL = completed.reduce((s, p) => s + p.profitLoss, 0);
      setBalance((prev) => prev + totalPL);
    }
  }, [pickFiveToday]);

  useEffect(() => {
    if (!auth.authenticated) return;
    settlePendingPicks();
    const interval = setInterval(settlePendingPicks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [auth.authenticated, settlePendingPicks]);

  const addBetSlipLeg = useCallback((pick: RankedPick) => {
    setBetSlipLegs((prev) => {
      if (prev.some((l) => l.opportunityId === pick.eventId)) return prev;
      // When no verified consensus exists, fall back to the market-implied
      // probability from the offered odds (derived, never fabricated).
      const implied = americanToImpliedProb(pick.bestOdds);
      return [
        ...prev,
        {
          opportunityId: pick.eventId,
          matchup: `${pick.homeTeam} vs ${pick.awayTeam}`,
          market: pick.market,
          side: pick.side,
          odds: pick.bestOdds,
          modelProbability: pick.consensusProbability ?? implied,
          edge: pick.marketValueEdge ?? 0,
          confidenceScore: pick.consensusProbability ?? implied,
        },
      ];
    });
    setBetSlipOpen(true);
  }, []);

  const removeBetSlipLeg = useCallback((oppId: string) => {
    setBetSlipLegs((prev) => prev.filter((l) => l.opportunityId !== oppId));
  }, []);

  const clearBetSlip = useCallback(() => setBetSlipLegs([]), []);

  const metrics: DashboardMetrics = useMemo(() => {
    const openBets = bets.filter((b) => b.result === 'pending');
    const openExposure = openBets.reduce((s, b) => s + b.stake, 0);
    const betsWon = bets.filter((b) => b.result === 'won').length;
    const betsLost = bets.filter((b) => b.result === 'lost').length;
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayPnl = bets
      .filter((b) => (b.result === 'won' || b.result === 'lost') && new Date(b.timestamp) >= todayStart)
      .reduce((s, b) => s + b.profitLoss, 0);
    const totalReturnPct = riskSettings.startingBankroll > 0 ? (balance - riskSettings.startingBankroll) / riskSettings.startingBankroll : 0;
    return {
      startingBankroll: riskSettings.startingBankroll,
      currentBalance: balance,
      todayPnl,
      totalReturnPct,
      openExposure,
      maxDrawdown: 0,
      activeOpportunities: rankedPicks.length,
      modelConfidence: 0,
      betsWon,
      betsLost,
      engineStatus: 'online',
    };
  }, [bets, balance, riskSettings, rankedPicks]);

  const value: StoreContextValue = {
    authenticated: auth.authenticated,
    authLoading: auth.loading,
    authError: auth.error,
    clearAuthError: auth.clearError,
    signUp: auth.signUp,
    signIn: auth.signIn,
    signOut: auth.signOut,
    userEmail: auth.user?.email ?? null,
    bets,
    addBet,
    resetSimulation,
    riskSettings,
    setRiskSettings,
    setRiskProfile,
    settings,
    setSettings,
    watchlist,
    toggleWatch,
    logs,
    addLog,
    liveEvents,
    rankedPicks,
    feedLoading,
    feedError,
    feedProvider,
    modelHealth,
    refreshFeed,
    lastFeedFetch,
    metrics,
    betSlipOpen,
    setBetSlipOpen,
    betSlipLegs,
    addBetSlipLeg,
    removeBetSlipLeg,
    clearBetSlip,
    pickFiveToday,
    settledHistory,
    addToPickFive,
    removeFromPickFive,
    reorderPickFive,
    lockPickFive,
    replacePick,
    settlePendingPicks,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export { suggestedStake };
