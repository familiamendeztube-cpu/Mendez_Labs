// Bankroll page constants and pure helpers. Exported for tests.

export const RISK_RULES = [
  {
    id: 'quarter-kelly',
    name: 'Quarter-Kelly sizing',
    explanation: 'Each pick is sized at 25% of the mathematical optimum. Smaller bets protect your bankroll from losing streaks.',
  },
  {
    id: 'default-cap',
    name: '1% default max per pick',
    explanation: 'No single pick can risk more than 1% of your bankroll.',
  },
  {
    id: 'absolute-cap',
    name: '2% absolute maximum',
    explanation: 'Even with a very large edge, no pick ever risks more than 2% of your bankroll.',
  },
  {
    id: 'daily-stop',
    name: 'Daily stop at -5%',
    explanation: 'If your bankroll drops 5% in one day, all new picks are paused until tomorrow.',
  },
  {
    id: 'drawdown-pause',
    name: 'Pause after 10% drawdown',
    explanation: 'If your bankroll drops 10% from its highest point, picks are paused until you review.',
  },
  {
    id: 'no-martingale',
    name: 'No martingale / no chasing',
    explanation: 'The system never doubles down after a loss. Every pick is sized on its own edge.',
  },
] as const;

export const PLANNED_SPORTS_LIVE = 100;
export const PLANNED_TRADING_LIVE = 100;

export function dailyDrawdownPct(todayPnl: number, startingBankroll: number): number | null {
  if (startingBankroll <= 0) return null;
  if (todayPnl >= 0) return 0;
  return Math.abs(todayPnl) / startingBankroll;
}

export function totalDrawdownPct(currentBalance: number, startingBankroll: number): number | null {
  if (startingBankroll <= 0) return null;
  if (currentBalance >= startingBankroll) return 0;
  return (startingBankroll - currentBalance) / startingBankroll;
}
