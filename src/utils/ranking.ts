// M1 Opportunity Ranking Engine
// opportunityScore = expectedValueWeight + calibratedConfidenceWeight
//                   + marketQualityWeight + dataFreshnessWeight
//                   - volatilityPenalty - uncertaintyPenalty
//
// This score is a transparent decision-support heuristic. It is NOT a guarantee
// of outcome. All opportunities are simulated; no real funds are at risk.

export interface RankableOpportunity {
  expectedValue: number;
  confidenceScore: number;
  edge: number;
  riskClass: 'low' | 'moderate' | 'high';
  startTime: string;
  modelVersion: string;
  updatedAt?: string;
}

export interface ScoreBreakdown {
  total: number;
  expectedValueWeight: number;
  calibratedConfidenceWeight: number;
  marketQualityWeight: number;
  dataFreshnessWeight: number;
  volatilityPenalty: number;
  uncertaintyPenalty: number;
}

const RISK_VOLATILITY: Record<string, number> = { low: 0.15, moderate: 0.35, high: 0.6 };
const MARKET_QUALITY_BASE = 0.5;

export function scoreOpportunity(opp: RankableOpportunity): ScoreBreakdown {
  // EV weight: positive EV contributes, scaled to 0-0.3 range
  const expectedValueWeight = Math.max(0, Math.min(0.3, opp.expectedValue * 1.5));

  // Calibrated confidence: confidence score scaled, but damped at extremes
  const conf = Math.max(0, Math.min(1, opp.confidenceScore));
  const calibratedConfidenceWeight = conf * 0.25;

  // Market quality: edge magnitude indicates market inefficiency (good for us)
  // but very high edges may indicate stale or erroneous data
  const absEdge = Math.abs(opp.edge);
  const marketQualityWeight = Math.min(0.2, absEdge * 1.5) + MARKET_QUALITY_BASE * 0.1;

  // Data freshness: use updatedAt if available (when the snapshot was generated),
  // otherwise fall back to startTime. More recent data = higher freshness weight.
  const refTime = opp.updatedAt ? new Date(opp.updatedAt).getTime() : new Date(opp.startTime).getTime();
  const now = Date.now();
  const hoursSinceUpdate = (now - refTime) / 3600000;
  let dataFreshnessWeight: number;
  if (hoursSinceUpdate < 0.1) dataFreshnessWeight = 0.15; // just updated
  else if (hoursSinceUpdate < 1) dataFreshnessWeight = 0.13;
  else if (hoursSinceUpdate < 6) dataFreshnessWeight = 0.10;
  else if (hoursSinceUpdate < 24) dataFreshnessWeight = 0.07;
  else dataFreshnessWeight = 0.04; // stale data

  // Volatility penalty: higher risk class = more variance
  const volatilityPenalty = RISK_VOLATILITY[opp.riskClass] ?? 0.35;

  // Uncertainty penalty: if confidence is very low or edge is very small,
  // the model is less certain
  const uncertaintyPenalty = (1 - conf) * 0.15 + Math.max(0, 0.05 - absEdge) * 2;

  const total =
    expectedValueWeight +
    calibratedConfidenceWeight +
    marketQualityWeight +
    dataFreshnessWeight -
    volatilityPenalty -
    uncertaintyPenalty;

  return {
    total,
    expectedValueWeight,
    calibratedConfidenceWeight,
    marketQualityWeight,
    dataFreshnessWeight,
    volatilityPenalty,
    uncertaintyPenalty,
  };
}

export function rankOpportunities<T extends RankableOpportunity>(opps: T[]): Array<T & { m1Score: ScoreBreakdown; m1Rank: number }> {
  const scored = opps.map((opp) => ({
    ...opp,
    m1Score: scoreOpportunity(opp),
  }));
  scored.sort((a, b) => b.m1Score.total - a.m1Score.total);
  return scored.map((opp, i) => ({ ...opp, m1Rank: i + 1 }));
}

/**
 * Filter to only actionable candidates: positive EV AND positive edge.
 * Then re-rank so the #1 result truly has the highest score among qualifiers.
 */
export function filterAndRank<T extends RankableOpportunity>(
  opps: T[],
  opts: { minConfidence?: number; positiveEvOnly?: boolean; positiveEdgeOnly?: boolean; positiveScoreOnly?: boolean } = {},
): Array<T & { m1Score: ScoreBreakdown; m1Rank: number }> {
  let filtered = opps;
  if (opts.positiveEvOnly) filtered = filtered.filter((o) => o.expectedValue > 0);
  if (opts.positiveEdgeOnly) filtered = filtered.filter((o) => o.edge > 0);
  if (opts.minConfidence) filtered = filtered.filter((o) => o.confidenceScore >= opts.minConfidence!);
  const ranked = rankOpportunities(filtered);
  if (opts.positiveScoreOnly) return ranked.filter((o) => o.m1Score.total > 0);
  return ranked;
}

/**
 * Compute risk/reward ratio from entry midpoint, invalidation, and first target.
 * Returns reward-to-risk ratio (e.g., 2.5 means 2.5:1 reward-to-risk).
 */
export function computeRiskReward(
  entryMidpoint: number,
  invalidation: number,
  firstTarget: number,
): number {
  const risk = Math.abs(entryMidpoint - invalidation);
  const reward = Math.abs(firstTarget - entryMidpoint);
  if (risk === 0) return 0;
  return reward / risk;
}
