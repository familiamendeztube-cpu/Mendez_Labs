// V55B3 — Results scorecard computation utilities.
// Pure, deterministic, no side effects. Exported for use by the Results page and tests.

export interface SettledRecord {
  result: 'won' | 'lost' | 'push' | 'void' | 'pending';
  profitLoss: number;
  suggestedStake: number;
  odds: number;
  modelProbability: number;
  impliedProbability: number;
  edge: number;
  confidenceScore: number;
  startTime: string;
  frozenAt: string;
  settledAt?: string;
}

// ── Core counts ─────────────────────────────────────────────────────────────

export function countByResult(records: SettledRecord[]) {
  const won = records.filter((r) => r.result === 'won').length;
  const lost = records.filter((r) => r.result === 'lost').length;
  const push = records.filter((r) => r.result === 'push').length;
  const pending = records.filter((r) => r.result === 'pending').length;
  const voided = records.filter((r) => r.result === 'void').length;
  const settled = won + lost;
  return { won, lost, push, pending, voided, settled, total: records.length };
}

// ── Win % (settled only = W+L, excludes push/pending/void) ──────────────────

export function winPercent(records: SettledRecord[]): number | null {
  const { won, settled } = countByResult(records);
  if (settled === 0) return null;
  return won / settled;
}

// ── ROI = net P/L / total settled stake ─────────────────────────────────────

export function roi(records: SettledRecord[]): number | null {
  const settledOnly = records.filter((r) => r.result === 'won' || r.result === 'lost');
  if (settledOnly.length === 0) return null;
  const totalStake = settledOnly.reduce((s, r) => s + r.suggestedStake, 0);
  if (totalStake === 0) return null;
  const netPL = settledOnly.reduce((s, r) => s + r.profitLoss, 0);
  return netPL / totalStake;
}

// ── Net units = total P/L / average stake ───────────────────────────────────

export function netUnits(records: SettledRecord[]): number | null {
  const settledOnly = records.filter((r) => r.result === 'won' || r.result === 'lost');
  if (settledOnly.length === 0) return null;
  const avgStake = settledOnly.reduce((s, r) => s + r.suggestedStake, 0) / settledOnly.length;
  if (avgStake === 0) return null;
  const netPL = settledOnly.reduce((s, r) => s + r.profitLoss, 0);
  return netPL / avgStake;
}

// ── Amount staked (settled only) ────────────────────────────────────────────

export function totalStaked(records: SettledRecord[]): number {
  return records
    .filter((r) => r.result === 'won' || r.result === 'lost')
    .reduce((s, r) => s + r.suggestedStake, 0);
}

// ── Total P/L (settled only — pending contributes 0) ────────────────────────

export function totalPL(records: SettledRecord[]): number {
  return records
    .filter((r) => r.result === 'won' || r.result === 'lost')
    .reduce((s, r) => s + r.profitLoss, 0);
}

// ── Average odds (American, settled only) ───────────────────────────────────

export function averageOdds(records: SettledRecord[]): number | null {
  const settledOnly = records.filter((r) => r.result === 'won' || r.result === 'lost');
  if (settledOnly.length === 0) return null;
  return settledOnly.reduce((s, r) => s + r.odds, 0) / settledOnly.length;
}

// ── Max drawdown (running P/L of settled picks in chronological order) ──────

export function maxDrawdown(records: SettledRecord[]): number | null {
  const settledOnly = records.filter((r) => r.result === 'won' || r.result === 'lost');
  if (settledOnly.length === 0) return null;
  let cumPL = 0;
  let peak = 0;
  let maxDD = 0;
  for (const r of settledOnly) {
    cumPL += r.profitLoss;
    if (cumPL > peak) peak = cumPL;
    const dd = peak - cumPL;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

// ── Longest losing streak ───────────────────────────────────────────────────

export function longestLosingStreak(records: SettledRecord[]): number | null {
  const settledOnly = records.filter((r) => r.result === 'won' || r.result === 'lost');
  if (settledOnly.length === 0) return null;
  let maxStreak = 0;
  let current = 0;
  for (const r of settledOnly) {
    if (r.result === 'lost') {
      current++;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 0;
    }
  }
  return maxStreak;
}

// ── CLV (closing line value) — requires closingOdds on SettledPick ──────────
// Not available in SettledPickRecord yet, so always returns null.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function averageCLV(_records: SettledRecord[]): number | null {
  return null;
}

// ── Brier score — requires valid pregame probability and binary outcome ─────
// Needs >= 30 settled picks with valid modelProbability.

export function brierScore(records: SettledRecord[]): number | null {
  const eligible = records.filter(
    (r) => (r.result === 'won' || r.result === 'lost') && r.modelProbability > 0 && r.modelProbability < 1,
  );
  if (eligible.length < 30) return null;
  const sum = eligible.reduce((s, r) => {
    const outcome = r.result === 'won' ? 1 : 0;
    return s + (r.modelProbability - outcome) ** 2;
  }, 0);
  return sum / eligible.length;
}

// ── Log loss ────────────────────────────────────────────────────────────────

export function logLoss(records: SettledRecord[]): number | null {
  const eligible = records.filter(
    (r) => (r.result === 'won' || r.result === 'lost') && r.modelProbability > 0 && r.modelProbability < 1,
  );
  if (eligible.length < 30) return null;
  const eps = 1e-15;
  const sum = eligible.reduce((s, r) => {
    const p = Math.max(eps, Math.min(1 - eps, r.modelProbability));
    const outcome = r.result === 'won' ? 1 : 0;
    return s - (outcome * Math.log(p) + (1 - outcome) * Math.log(1 - p));
  }, 0);
  return sum / eligible.length;
}

// ── Calibration error (ECE, 10 bins) ────────────────────────────────────────

export function calibrationError(records: SettledRecord[]): number | null {
  const eligible = records.filter(
    (r) => (r.result === 'won' || r.result === 'lost') && r.modelProbability > 0 && r.modelProbability < 1,
  );
  if (eligible.length < 30) return null;
  const bins = Array.from({ length: 10 }, () => ({ count: 0, sumProb: 0, sumOutcome: 0 }));
  for (const r of eligible) {
    const idx = Math.min(9, Math.floor(r.modelProbability * 10));
    bins[idx].count++;
    bins[idx].sumProb += r.modelProbability;
    bins[idx].sumOutcome += r.result === 'won' ? 1 : 0;
  }
  let ece = 0;
  for (const bin of bins) {
    if (bin.count === 0) continue;
    const avgProb = bin.sumProb / bin.count;
    const avgOutcome = bin.sumOutcome / bin.count;
    ece += (bin.count / eligible.length) * Math.abs(avgProb - avgOutcome);
  }
  return ece;
}

// ── Daily grouping ──────────────────────────────────────────────────────────

export function groupByDay(records: SettledRecord[]): Map<string, SettledRecord[]> {
  const map = new Map<string, SettledRecord[]>();
  for (const r of records) {
    const key = (r.settledAt ?? r.frozenAt).slice(0, 10);
    const bucket = map.get(key);
    if (bucket) bucket.push(r);
    else map.set(key, [r]);
  }
  return map;
}
