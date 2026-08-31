import type { BetRecord, RiskSettings, RiskProfile } from '@/types/models';

export interface RiskEvaluation {
  ok: boolean;
  reason?: string;
}

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  profile: 'controlled',
  startingBankroll: 500,
  maxStakePercent: 5,
  maxDailyExposure: 25,
  maxDailyLoss: 15,
  maxOpenPositions: 6,
  profitCompounding: false,
  drawdownShutdown: 20,
  emergencyStop: false,
};

export const RISK_PROFILES: Record<
  RiskProfile,
  { label: string; description: string; settings: Partial<RiskSettings> }
> = {
  controlled: {
    label: 'Controlled',
    description: 'Conservative staking with strict exposure limits.',
    settings: { maxStakePercent: 5, maxDailyExposure: 25, maxDailyLoss: 15, maxOpenPositions: 6, drawdownShutdown: 20 },
  },
  aggressive: {
    label: 'Aggressive',
    description: 'Larger stakes and wider exposure tolerance.',
    settings: { maxStakePercent: 12, maxDailyExposure: 50, maxDailyLoss: 30, maxOpenPositions: 10, drawdownShutdown: 30 },
  },
  speculative: {
    label: 'Speculative',
    description: 'High-conviction staking with minimal guardrails.',
    settings: { maxStakePercent: 20, maxDailyExposure: 75, maxDailyLoss: 50, maxOpenPositions: 15, drawdownShutdown: 45 },
  },
};

export function applyProfile(settings: RiskSettings, profile: RiskProfile): RiskSettings {
  return { ...settings, profile, ...RISK_PROFILES[profile].settings };
}

// Evaluate whether a proposed wager is allowed by the risk engine.
export function evaluateWager(
  stake: number,
  currentBalance: number,
  startingBankroll: number,
  openBets: BetRecord[],
  settings: RiskSettings,
): RiskEvaluation {
  if (settings.emergencyStop) {
    return { ok: false, reason: 'Emergency stop is active — new positions are halted.' };
  }
  if (stake <= 0) return { ok: false, reason: 'Stake must be greater than zero.' };
  if (stake > currentBalance) {
    return { ok: false, reason: 'Stake exceeds available balance.' };
  }

  const maxStake = (settings.profitCompounding ? currentBalance : startingBankroll) * (settings.maxStakePercent / 100);
  if (stake > maxStake) {
    return { ok: false, reason: `Stake exceeds ${settings.maxStakePercent}% max per position (${maxStake.toFixed(2)}).` };
  }

  const openExposure = openBets.filter((b) => b.result === 'pending').reduce((s, b) => s + b.stake, 0);
  const maxExposure = (settings.profitCompounding ? currentBalance : startingBankroll) * (settings.maxDailyExposure / 100);
  if (openExposure + stake > maxExposure) {
    return { ok: false, reason: `Exceeds ${settings.maxDailyExposure}% max daily exposure.` };
  }

  const pendingCount = openBets.filter((b) => b.result === 'pending').length;
  if (pendingCount >= settings.maxOpenPositions) {
    return { ok: false, reason: `Max open positions (${settings.maxOpenPositions}) reached.` };
  }

  // Daily loss check (settled bets today)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const settledToday = openBets.filter(
    (b) => (b.result === 'won' || b.result === 'lost') && new Date(b.timestamp) >= todayStart,
  );
  const lossToday = settledToday.reduce((s, b) => s + b.profitLoss, 0);
  const maxLoss = (settings.profitCompounding ? currentBalance : startingBankroll) * (settings.maxDailyLoss / 100);
  if (lossToday < 0 && Math.abs(lossToday) >= maxLoss) {
    return { ok: false, reason: `Max daily loss limit (${settings.maxDailyLoss}%) reached.` };
  }

  // Drawdown shutdown
  const drawdown = startingBankroll > 0 ? (startingBankroll - currentBalance) / startingBankroll : 0;
  if (drawdown * 100 >= settings.drawdownShutdown) {
    return { ok: false, reason: `Drawdown shutdown triggered at ${settings.drawdownShutdown}%.` };
  }

  return { ok: true };
}

/**
 * Documented fractional Kelly stake sizing.
 *
 * Formula: f* = (b·p - q) / b   where b = decimal odds - 1, p = model prob, q = 1 - p
 * Fractional Kelly uses f* × fraction (default 0.25 = quarter Kelly).
 * Hard cap: 2% of bankroll, regardless of Kelly output.
 *
 * This does NOT guarantee returns. It is a risk-management heuristic for simulation.
 */
export function suggestedStake(
  edge: number,
  confidenceScore: number,
  bankroll: number,
  settings: RiskSettings,
): number {
  // Fractional Kelly: edge * confidence scaled, quarter-Kelly fraction
  const kelly = Math.max(0, edge * confidenceScore * 0.25);
  const base = settings.profitCompounding ? bankroll : settings.startingBankroll;
  const raw = base * kelly;
  // Hard 2% cap regardless of risk profile
  const hardCap = base * 0.02;
  return Math.min(raw, hardCap);
}

/**
 * Position size for market trades: fractional Kelly with 2% hard cap.
 * Returns position size as percent of bankroll.
 */
export function suggestedPositionSize(
  edge: number,
  confidenceScore: number,
): number {
  const kelly = Math.max(0, edge * confidenceScore * 0.25);
  return Math.min(kelly, 0.02); // 2% hard cap
}

/**
 * Risk at stop: capped at 1% of simulated bankroll.
 * riskAtStop = positionSize * (entryMid - invalidation) / entryMid
 */
export function computeRiskAtStop(
  positionSizePct: number,
  entryMid: number,
  invalidation: number,
): number {
  const rawRisk = positionSizePct * Math.abs(entryMid - invalidation) / entryMid;
  return Math.min(rawRisk, 0.01); // 1% cap
}
