// Value-betting engine: EV, fair price, blend, Kelly, qualification gates.
// All functions pure and deterministic. No probabilities are invented.
// When model data is unavailable, outputs are null — never fabricated.

import {
  isStaleOrStarted,
  medianNoVigConsensus,
  medianNoVigNWay,
  type BookmakerPair,
  type BookmakerNWay,
} from './oddsMath';

// ── Expected value ────────────────────────────────────────────────────────────

export function expectedValuePerDollar(pFinal: number | null, decimalOdds: number | null): number | null {
  if (pFinal === null || decimalOdds === null) return null;
  if (!Number.isFinite(pFinal) || !Number.isFinite(decimalOdds)) return null;
  if (pFinal <= 0 || pFinal >= 1 || decimalOdds <= 1) return null;
  return pFinal * decimalOdds - 1;
}

export function fairDecimalPrice(pFinal: number | null): number | null {
  if (pFinal === null) return null;
  if (!Number.isFinite(pFinal) || pFinal <= 0 || pFinal >= 1) return null;
  return 1 / pFinal;
}

// ── Model weight derivation ───────────────────────────────────────────────────

export interface ModelWeightInputs {
  brierScore: number | null;
  sampleSize: number;
  featureCompleteness: number;
  leagueCoverage: number;
}

export function deriveModelWeight(inputs: ModelWeightInputs): number {
  const { brierScore, sampleSize, featureCompleteness, leagueCoverage } = inputs;

  if (brierScore === null || sampleSize < 30) {
    return 0;
  }

  const brierWeight = Math.max(0, Math.min(0.4, (0.25 - brierScore) / 0.25 * 0.4));
  const sampleFactor = Math.min(1.0, sampleSize / 200);
  const rawWeight = brierWeight * sampleFactor * featureCompleteness * leagueCoverage;

  return Math.min(0.5, Math.max(0, rawWeight));
}

// ── Blend ────────────────────────────────────────────────────────────────────

export function blendProbability(
  pModel: number | null,
  pMarket: number | null,
  wModel: number,
): number | null {
  if (pMarket === null || !Number.isFinite(pMarket as number)) return null;
  if (pModel === null || !Number.isFinite(pModel as number) || wModel <= 0) return pMarket;
  return wModel * (pModel as number) + (1 - wModel) * (pMarket as number);
}

// ── Market consensus: median of per-bookmaker no-vig (2-way) ─────────────────

export function marketConsensus2Way(
  pairs: BookmakerPair[],
  minBookmakers = 3,
): { probA: number | null; probB: number | null; bookmakerCount: number; valid: boolean } {
  const result = medianNoVigConsensus(pairs, minBookmakers);
  if (!result.valid) {
    return { probA: null, probB: null, bookmakerCount: result.bookmakerCount, valid: false };
  }
  return {
    probA: result.probA,
    probB: result.probB,
    bookmakerCount: result.bookmakerCount,
    valid: true,
  };
}

// ── Market consensus: median of per-bookmaker no-vig (N-way) ─────────────────

export function marketConsensusNWay(
  books: BookmakerNWay[],
  minBookmakers = 3,
): { probs: (number | null)[]; bookmakerCount: number; valid: boolean } {
  const result = medianNoVigNWay(books, minBookmakers);
  if (!result.valid) {
    return { probs: [], bookmakerCount: result.bookmakerCount, valid: false };
  }
  return {
    probs: result.probs,
    bookmakerCount: result.bookmakerCount,
    valid: true,
  };
}

// ── Legacy compatibility wrapper ─────────────────────────────────────────────

export function noVigMarketProbability(
  sideAOdds: number[],
  sideBOdds: number[],
  minBookmakers = 3,
): { probA: number; probB: number; bookmakerCount: number; valid: boolean } {
  const count = Math.min(sideAOdds.length, sideBOdds.length);
  const pairs: BookmakerPair[] = [];
  for (let i = 0; i < count; i++) {
    pairs.push({ name: `book-${i}`, sideAOdds: sideAOdds[i], sideBOdds: sideBOdds[i] });
  }
  const result = medianNoVigConsensus(pairs, minBookmakers);
  if (!result.valid) {
    return { probA: NaN, probB: NaN, bookmakerCount: result.bookmakerCount, valid: false };
  }
  return {
    probA: result.probA,
    probB: result.probB,
    bookmakerCount: result.bookmakerCount,
    valid: true,
  };
}

// ── Qualification gates ──────────────────────────────────────────────────────

export interface QualificationInputs {
  startTime: string;
  sourceTimestamp: string;
  matchConfidence: number;
  bookmakerCount: number;
  minBookmakers: number;
  sampleSize: number;
  minSampleSize: number;
  featureCompleteness: number;
  minFeatureCompleteness: number;
  evPercent: number | null;
  minEvMargin: number;
  edgePp: number | null;
  minEdgePp: number;
  oddsMalformed: boolean;
  isCorrelated: boolean;
  modelAvailable: boolean;
  modelCalibrated: boolean;
  providerMatchVerified: boolean;
  probabilitySanityPass: boolean;
}

export interface QualificationResult {
  qualified: boolean;
  exclusionReason: string | null;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
}

export function checkQualification(inputs: QualificationInputs): QualificationResult {
  const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

  const notStarted = !isStaleOrStarted(inputs.startTime);
  checks.push({ name: 'Game not started', passed: notStarted, detail: notStarted ? 'Game is in the future' : 'Game has already started' });

  const sourceAge = Date.now() - new Date(inputs.sourceTimestamp).getTime();
  const fresh = sourceAge < 15 * 60 * 1000;
  checks.push({ name: 'Odds fresh (≤15 min)', passed: fresh, detail: fresh ? `Updated ${Math.round(sourceAge / 60000)} min ago` : `Stale: ${Math.round(sourceAge / 60000)} min old` });

  const reliableMatch = inputs.matchConfidence >= 0.6;
  checks.push({ name: 'Reliable event match', passed: reliableMatch, detail: reliableMatch ? `Confidence: ${(inputs.matchConfidence * 100).toFixed(0)}%` : `Low confidence: ${(inputs.matchConfidence * 100).toFixed(0)}%` });

  const providerVerified = inputs.providerMatchVerified;
  checks.push({ name: 'Provider match verified', passed: providerVerified, detail: providerVerified ? 'Event confirmed across providers' : 'Unverified event mapping' });

  const enoughBooks = inputs.bookmakerCount >= inputs.minBookmakers;
  checks.push({ name: `${inputs.minBookmakers}+ bookmakers`, passed: enoughBooks, detail: enoughBooks ? `${inputs.bookmakerCount} bookmakers` : `Only ${inputs.bookmakerCount} bookmakers` });

  const enoughSample = inputs.sampleSize >= inputs.minSampleSize;
  checks.push({ name: 'Sufficient historical data (≥30)', passed: enoughSample, detail: enoughSample ? `${inputs.sampleSize} completed games` : `Only ${inputs.sampleSize} games (need ${inputs.minSampleSize})` });

  const featuresComplete = inputs.featureCompleteness >= inputs.minFeatureCompleteness;
  checks.push({ name: 'Features complete', passed: featuresComplete, detail: featuresComplete ? `${(inputs.featureCompleteness * 100).toFixed(0)}% complete` : `Only ${(inputs.featureCompleteness * 100).toFixed(0)}% (need ${(inputs.minFeatureCompleteness * 100).toFixed(0)}%)` });

  const modelAvail = inputs.modelAvailable;
  checks.push({ name: 'Independent model available', passed: modelAvail, detail: modelAvail ? 'Model produces independent probability' : 'No independent model — market data only' });

  const modelCalib = inputs.modelCalibrated;
  checks.push({ name: 'Model calibrated', passed: modelCalib, detail: modelCalib ? 'Brier score within range' : 'Model not calibrated or insufficient data' });

  const sanitySafe = inputs.probabilitySanityPass;
  checks.push({ name: 'Probability/price sanity', passed: sanitySafe, detail: sanitySafe ? 'Consistent probability vs odds' : 'Inconsistent probability vs offered odds' });

  const edgeOk = inputs.edgePp !== null && inputs.edgePp >= inputs.minEdgePp;
  checks.push({ name: `Edge ≥ ${(inputs.minEdgePp * 100).toFixed(0)}pp`, passed: edgeOk, detail: inputs.edgePp !== null ? `Edge: ${(inputs.edgePp * 100).toFixed(1)}pp` : 'Edge unavailable (no model)' });

  const evOk = inputs.evPercent !== null && inputs.evPercent >= inputs.minEvMargin;
  checks.push({ name: `EV ≥ ${(inputs.minEvMargin * 100).toFixed(1)}%`, passed: evOk, detail: inputs.evPercent !== null ? `EV: +${(inputs.evPercent * 100).toFixed(1)}%` : 'EV unavailable (no model)' });

  const lineValid = !inputs.oddsMalformed;
  checks.push({ name: 'Valid odds', passed: lineValid, detail: lineValid ? 'Odds are valid' : 'Malformed odds' });

  const notCorrelated = !inputs.isCorrelated;
  checks.push({ name: 'Not correlated', passed: notCorrelated, detail: notCorrelated ? 'Independent pick' : 'Correlated with another selected pick' });

  const failedChecks = checks.filter((c) => !c.passed);
  const qualified = failedChecks.length === 0;
  const exclusionReason = qualified ? null : failedChecks.map((c) => c.name).join('; ');

  return { qualified, exclusionReason, checks };
}

// ── Quarter-Kelly stake ──────────────────────────────────────────────────────

export function quarterKellyStake(
  pFinal: number | null,
  decimalOdds: number | null,
  bankroll: number,
  maxPerPickPct = 0.01,
  maxDailyExposurePct = 0.05,
  currentDailyExposure = 0,
): { stake: number; capped: boolean; capReason: string | null } {
  if (pFinal === null || decimalOdds === null) {
    return { stake: 0, capped: true, capReason: 'Missing probability or odds' };
  }
  if (!Number.isFinite(pFinal) || !Number.isFinite(decimalOdds)) {
    return { stake: 0, capped: true, capReason: 'Invalid probability or odds' };
  }
  if (pFinal <= 0 || pFinal >= 1 || decimalOdds <= 1) {
    return { stake: 0, capped: true, capReason: 'Invalid probability or odds' };
  }

  const fullKelly = (pFinal * decimalOdds - 1) / (decimalOdds - 1);
  if (fullKelly <= 0) {
    return { stake: 0, capped: true, capReason: 'Negative Kelly (no edge)' };
  }

  const quarterKelly = fullKelly * 0.25;
  const rawStake = quarterKelly * bankroll;

  const maxPerPick = bankroll * maxPerPickPct;
  let stake = Math.min(rawStake, maxPerPick);
  let capped = stake < rawStake;
  let capReason = capped ? `Capped at 1% of bankroll (${maxPerPick.toFixed(2)})` : null;

  const remainingDaily = bankroll * maxDailyExposurePct - currentDailyExposure;
  if (stake > remainingDaily) {
    stake = Math.max(0, remainingDaily);
    capped = true;
    capReason = `Daily exposure cap reached (${(maxDailyExposurePct * 100).toFixed(0)}% of bankroll)`;
  }

  return { stake: Math.round(stake * 100) / 100, capped, capReason };
}

// ── Correlation check ────────────────────────────────────────────────────────

export function isCorrelatedPick(
  newPick: { eventId: string; market: string; side: string; homeTeam: string; awayTeam: string },
  existingPicks: Array<{ eventId: string; market: string; side: string; homeTeam: string; awayTeam: string }>,
): boolean {
  for (const existing of existingPicks) {
    if (existing.eventId === newPick.eventId) return true;
    const newTeams = [newPick.homeTeam, newPick.awayTeam];
    const existingTeams = [existing.homeTeam, existing.awayTeam];
    if (newTeams.some((t) => existingTeams.includes(t))) return true;
  }
  return false;
}

export function isContradictoryPick(
  newPick: { eventId: string; market: string; side: string },
  existingPicks: Array<{ eventId: string; market: string; side: string }>,
): boolean {
  for (const existing of existingPicks) {
    if (existing.eventId !== newPick.eventId) continue;
    if (existing.market === newPick.market) {
      const newSideLower = newPick.side.toLowerCase();
      const existingSideLower = existing.side.toLowerCase();
      if (newSideLower !== existingSideLower) {
        const newFirst = newSideLower.split(' ')[0];
        const existingFirst = existingSideLower.split(' ')[0];
        const opposites: Record<string, string> = { over: 'under', under: 'over', home: 'away', away: 'home', '1': '2', '2': '1', draw: 'x', x: 'draw' };
        if (opposites[existingFirst] === newFirst) return true;
      }
    }
  }
  return false;
}
