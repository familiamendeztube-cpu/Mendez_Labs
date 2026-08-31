import { computeResetBankroll, generateInitialLogs, generateSeedBets } from '@/data/mockData';
import { generateDemoHistory, generateTodayPickFive } from '@/data/demoHistory';
import { DEFAULT_RISK_SETTINGS } from '@/utils/risk';
import type { BetRecord, PickFiveDayRecord, PickFiveSet, RiskSettings, SportsOpportunity, SystemLogEntry } from '@/types/models';

export const M1_STATE_SCHEMA_VERSION = 4;
export const SCHEMA_VERSION_KEY = 'mendez-terminal-schema-version';
export const STORAGE_KEY = 'mendez-terminal-v1';

export interface AppSettings {
  reducedMotion: boolean;
  rainIntensity: number;
  soundEnabled: boolean;
  defaultRiskProfile: RiskSettings['profile'];
  preferredLeagues: string[];
  numberFormat: 'standard' | 'compact';
  utcTime: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  reducedMotion: false,
  rainIntensity: 0.6,
  soundEnabled: false,
  defaultRiskProfile: 'controlled',
  preferredLeagues: ['NBA', 'NFL', 'MLB', 'NHL', 'Soccer'],
  numberFormat: 'standard',
  utcTime: true,
};

export interface PersistedState {
  authenticated: boolean;
  bets: BetRecord[];
  riskSettings: RiskSettings;
  settings: AppSettings;
  watchlist: string[];
  logs: SystemLogEntry[];
  balance: number;
  // v4 additions
  pickFiveToday: PickFiveSet;
  demoHistory: PickFiveDayRecord[];
}

export function needsMigration(storedVersion: string | null): boolean {
  if (storedVersion === null) return true;
  const v = parseInt(storedVersion, 10);
  return isNaN(v) || v < M1_STATE_SCHEMA_VERSION;
}

export function performMigration(
  oldState: PersistedState | null,
  sports: SportsOpportunity[],
): PersistedState {
  const seedBets = generateSeedBets(sports);
  const startingBankroll = DEFAULT_RISK_SETTINGS.startingBankroll;
  const balance = computeResetBankroll(seedBets, startingBankroll);

  return {
    authenticated: oldState?.authenticated ?? false,
    bets: seedBets,
    riskSettings: DEFAULT_RISK_SETTINGS,
    settings: DEFAULT_SETTINGS,
    watchlist: [],
    logs: generateInitialLogs(),
    balance,
    pickFiveToday: generateTodayPickFive(),
    demoHistory: generateDemoHistory(),
  };
}
