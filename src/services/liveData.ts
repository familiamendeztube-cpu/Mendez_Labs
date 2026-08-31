// Live sports data service — calls the sports-odds edge function to fetch
// real odds from The Odds API. Does NOT fall back to mock data silently.
// When data is unavailable, returns null and the UI shows an honest empty state.
// When model data is missing, probability/EV/edge fields are null — never fabricated.

import {
  type SettlementResult,
  americanToImpliedProb,
  americanToDecimalOdds,
  isProbabilityConsistentWithOdds,
  isMalformedOdds,
  isStaleOrStarted,
} from '@/utils/oddsMath';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SPORT_KEYS = [
  { key: 'americanfootball_nfl', league: 'NFL' },
  { key: 'basketball_nba', league: 'NBA' },
  { key: 'baseball_mlb', league: 'MLB' },
  { key: 'icehockey_nhl', league: 'NHL' },
  { key: 'soccer_epl', league: 'Soccer' },
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface NormalizedOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface NormalizedMarket {
  type: string;
  outcomes: NormalizedOutcome[];
}

export interface NormalizedBookmaker {
  name: string;
  markets: NormalizedMarket[];
}

export interface LiveEvent {
  eventId: string;
  sportKey: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  bookmakers: NormalizedBookmaker[];
}

export interface RankedPick {
  eventId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  market: string;
  side: string;
  line: string;
  bestOdds: number;
  bestBookmaker: string;
  consensusProbability: number | null;
  marketValueEdge: number | null;
  pModel: number | null;
  pFinal: number | null;
  wModel: number | null;
  fairDecimal: number | null;
  offeredDecimal: number;
  evPercent: number | null;
  qualified: boolean;
  exclusionReason: string | null;
  qualificationChecks: Array<{ name: string; passed: boolean; detail: string }>;
  bookmakerCount: number;
  dataCompleteness: number;
  freshnessMs: number;
  matchConfidence: number;
  reasoning: string;
  riskNote: string;
  source: string;
  sourceTimestamp: string;
  modelVersion: string;
}

export interface ProviderHealth {
  status: 'connected' | 'degraded' | 'error' | 'unavailable';
  name: string;
  lastSync: string | null;
  cacheExpires: string | null;
  remainingQuota: number | null;
  eventsCount: number;
  bookmakersCount: number;
  sportsFetched: number;
  message: string | null;
}

export interface FeedResult {
  events: LiveEvent[];
  picks: RankedPick[];
  provider: ProviderHealth;
  model: ModelHealth | null;
}

export interface ModelHealth {
  status: string;
  modelVersion: string;
  sampleSize: number;
  leagueSampleSizes: Record<string, number>;
  qualifiedCount: number;
  excludedCount: number;
  totalPredictions: number;
  totalBookmakers?: number;
  label: string;
  message: string | null;
}

// ── Fetch from edge function ─────────────────────────────────────────────────

interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price: number; point?: number }>;
    }>;
  }>;
}

export async function fetchLiveFeed(): Promise<FeedResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      events: [],
      picks: [],
      provider: {
        status: 'unavailable',
        name: 'The Odds API',
        lastSync: null,
        cacheExpires: null,
        remainingQuota: null,
        eventsCount: 0,
        bookmakersCount: 0,
        sportsFetched: 0,
        message: 'Server not configured',
      },
      model: null,
    };
  }

  // Warm the odds cache first: sports-feed pulls from The Odds API only when
  // its 1-hour cache is stale, then the analysis engine reads that cache.
  // Best-effort — a failure here just means the engine uses whatever is cached.
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/sports-feed`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    // cache warm-up is best-effort
  }

  // Then the analysis-engine (server-side independent model predictions).
  try {
    const engineResponse = await fetch(`${SUPABASE_URL}/functions/v1/analysis-engine`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (engineResponse.ok) {
      const engineData = await engineResponse.json();
      if (engineData.predictions && engineData.predictions.length > 0) {
        const allPicks = engineData.predictions
          .map(convertEnginePrediction)
          .filter((p: RankedPick | null): p is RankedPick => p !== null);

        const qualified = allPicks.filter((p: RankedPick) => p.qualified);
        const excluded = allPicks.filter((p: RankedPick) => !p.qualified);
        const seenEventIds = new Set<string>();
        const uniqueQualified: RankedPick[] = [];
        for (const pick of qualified) {
          if (!seenEventIds.has(pick.eventId)) {
            seenEventIds.add(pick.eventId);
            uniqueQualified.push(pick);
          }
        }
        uniqueQualified.sort((a: RankedPick, b: RankedPick) => (b.evPercent ?? -Infinity) - (a.evPercent ?? -Infinity));
        excluded.sort((a: RankedPick, b: RankedPick) => (b.evPercent ?? -Infinity) - (a.evPercent ?? -Infinity));
        const picks = [...uniqueQualified, ...excluded];
        const model: ModelHealth = engineData.model || {
          status: 'experimental',
          modelVersion: 'elo-v1-experimental',
          sampleSize: 0,
          leagueSampleSizes: {},
          qualifiedCount: uniqueQualified.length,
          excludedCount: excluded.length,
          totalPredictions: allPicks.length,
          label: 'Experimental — paper tracking only',
          message: null,
        };
        return {
          events: [],
          picks,
          provider: {
            status: 'connected',
            name: 'The Odds API + Analysis Engine',
            lastSync: new Date().toISOString(),
            cacheExpires: null,
            remainingQuota: null,
            eventsCount: picks.length,
            bookmakersCount: model.totalBookmakers || 0,
            sportsFetched: 5,
            message: null,
          },
          model,
        };
      }
    }
  } catch {
    // Analysis engine unavailable — fall through to odds-only fetch
  }

  // Analysis engine unavailable — fetch events for All Games display only.
  // No picks are produced. Top Five shows zero picks and "Analysis unavailable".
  const allEvents: LiveEvent[] = [];
  let totalBookmakers = 0;
  let sportsFetched = 0;
  let lastError: string | null = null;
  let remainingQuota: number | null = null;

  const results = await Promise.allSettled(
    SPORT_KEYS.map(async ({ key, league }): Promise<{ league: string; events: LiveEvent[]; bookmakerCount: number }> => {
      const url = `${SUPABASE_URL}/functions/v1/sports-odds?sport=${key}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${league}`);
      }

      const json = await response.json();
      if (json.error) {
        throw new Error(json.error);
      }

      const rawEvents = json.data as OddsApiEvent[];
      if (!rawEvents) return { league, events: [], bookmakerCount: 0 };

      const remaining = response.headers.get('x-requests-remaining');
      if (remaining) remainingQuota = parseInt(remaining, 10);

      const normalized: LiveEvent[] = rawEvents.map((event) => ({
        eventId: event.id,
        sportKey: event.sport_key,
        league,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        startTime: event.commence_time,
        bookmakers: event.bookmakers.map((bm) => ({
          name: bm.title,
          markets: bm.markets.map((m) => ({
            type: m.key,
            outcomes: m.outcomes.map((o) => ({
              name: o.name,
              price: o.price,
              point: o.point,
            })),
          })),
        })),
      }));

      return { league, events: normalized, bookmakerCount: normalized.length > 0 ? normalized[0].bookmakers.length : 0 };
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value.events);
      totalBookmakers += result.value.bookmakerCount;
      sportsFetched++;
    } else {
      lastError = result.reason?.message || 'Unknown error';
    }
  }

  const provider: ProviderHealth = {
    status: sportsFetched === 0 ? 'error' : sportsFetched < SPORT_KEYS.length ? 'degraded' : 'connected',
    name: 'The Odds API',
    lastSync: sportsFetched > 0 ? new Date().toISOString() : null,
    cacheExpires: null,
    remainingQuota,
    eventsCount: allEvents.length,
    bookmakersCount: totalBookmakers,
    sportsFetched,
    message: lastError,
  };

  return { events: allEvents, picks: [], provider, model: null };
}

// ── Convert analysis-engine prediction to RankedPick ───────────────────────────
// Validates all server values. Rejects impossible probability/odds mappings.
// If model data is missing, fields are null — never fabricated.

function convertEnginePrediction(p: Record<string, unknown>): RankedPick | null {
  const eventId = p.eventId as string;
  const league = p.league as string;
  const homeTeam = p.homeTeam as string;
  const awayTeam = p.awayTeam as string;
  const startTime = p.startTime as string;
  const market = p.market as string;
  const side = p.side as string;
  const lineVal = p.line as string ?? 'ML';

  // Validate essential fields exist
  if (!eventId || !league || !homeTeam || !awayTeam || !startTime || !market || !side) {
    return null;
  }

  const offeredAmerican = p.offeredAmerican as number | undefined;
  const bookmakerCount = p.bookmakerCount as number ?? 0;
  const bestBook = p.offeredBookmaker as string ?? 'Unknown';
  const modelVersion = p.modelVersion as string ?? 'unknown';
  const sourceTimestamp = p.sourceTimestamp as string ?? new Date().toISOString();

  // Validate offered odds
  if (offeredAmerican === undefined || isMalformedOdds(offeredAmerican)) {
    return makePick({
      eventId, league, homeTeam, awayTeam, startTime, market, side, line: lineVal,
      bestOdds: offeredAmerican ?? 0, bestBookmaker: bestBook, bookmakerCount,
      sourceTimestamp, modelVersion,
      exclusionReason: 'Malformed offered odds',
    });
  }

  const offeredDecimal = americanToDecimalOdds(offeredAmerican);
  const impliedFromOdds = americanToImpliedProb(offeredAmerican);

  // Server-provided values — validate each, reject if inconsistent
  const serverPModel = asFiniteOrNull(p.pModel as number | undefined);
  const serverWModel = asFiniteOrNull(p.wModel as number | undefined);

  // ── Recompute pMarket from raw quotes; NEVER accept server pMarket ─────
  // If the prediction carries raw bookmaker pairs, recompute median no-vig.
  // Otherwise pMarket is null — we refuse to display unverifiable server values.
  let pMarket: number | null = null;
  let probabilitySanityPass = true;
  const rawPairs = p.rawQuotes as Array<{ bookmaker: string; sideAOdds: number; sideBOdds: number }> | undefined;
  if (rawPairs && Array.isArray(rawPairs) && rawPairs.length > 0) {
    const pairs: Array<{ name: string; sideAOdds: number; sideBOdds: number }> = rawPairs
      .filter((q) => !isMalformedOdds(q.sideAOdds) && !isMalformedOdds(q.sideBOdds))
      .map((q) => ({ name: q.bookmaker, sideAOdds: q.sideAOdds, sideBOdds: q.sideBOdds }));
    if (pairs.length >= 3) {
      const consensus = medianNoVigConsensusLocal(pairs);
      if (consensus.valid) {
        pMarket = consensus.probA;
        if (!isProbabilityConsistentWithOdds(pMarket, offeredAmerican, 0.20)) {
          probabilitySanityPass = false;
          pMarket = null;
        }
      }
    }
  }

  // pModel: reject if it's a constant fallback (0.408, 0.5) or not a real model output
  let pModel = serverPModel;
  const modelAvailable = pModel !== null
    && pModel !== 0.5
    && !(pModel > 0.407 && pModel < 0.409)
    && pModel > 0 && pModel < 1;
  if (!modelAvailable) {
    pModel = null;
  }

  // ── Qualification prerequisites ───────────────────────────────────────
  const sampleSize = (p.sampleSize as number) ?? 0;
  const featureCompleteness = (p.featureCompleteness as number) ?? 0;
  const brierScore = asFiniteOrNull(p.brierScore as number | undefined);
  const modelCalibrated = brierScore !== null && sampleSize >= 30 && brierScore < 0.25;

  // Null-force gate: if league sample <30, features incomplete, or model
  // not calibrated/available, force all derived metrics to null.
  const gatePass = sampleSize >= 30 && featureCompleteness >= 0.8 && modelCalibrated && modelAvailable;
  if (!gatePass) {
    pModel = null;
  }

  // wModel: only valid if model is available AND gate passes
  const wModel = gatePass ? (serverWModel ?? 0) : null;

  // pFinal: recompute from pModel and pMarket if both available, otherwise null
  let pFinal: number | null = null;
  if (gatePass && pModel !== null && pMarket !== null && wModel !== null && wModel > 0) {
    pFinal = wModel * pModel + (1 - wModel) * pMarket;
  }

  // Fair decimal and EV — only when pFinal is real
  const fairDecimal = pFinal !== null && pFinal > 0 && pFinal < 1 ? 1 / pFinal : null;
  const evPercent = pFinal !== null && offeredDecimal > 1 ? pFinal * offeredDecimal - 1 : null;

  // Edge: only when calibrated independent p AND matched market p both valid
  const edgePp = (gatePass && pModel !== null && pMarket !== null) ? pModel - pMarket : null;

  // Market value edge (consensus vs best price) — only when pMarket verified
  const marketEdge = pMarket !== null ? pMarket - impliedFromOdds : null;

  const qualResult = checkQualificationForPick({
    startTime,
    sourceTimestamp,
    bookmakerCount,
    sampleSize,
    featureCompleteness,
    evPercent,
    edgePp,
    modelAvailable,
    modelCalibrated,
    probabilitySanityPass,
    oddsMalformed: isMalformedOdds(offeredAmerican),
  });

  const reasoning = buildReasoning({ pModel, pMarket, pFinal, fairDecimal, offeredDecimal, bestBook, evPercent, modelAvailable });

  return {
    eventId,
    league,
    homeTeam,
    awayTeam,
    startTime,
    market,
    side,
    line: lineVal,
    bestOdds: offeredAmerican,
    bestBookmaker: bestBook,
    consensusProbability: pMarket,
    marketValueEdge: marketEdge,
    pModel,
    pFinal,
    wModel,
    fairDecimal,
    offeredDecimal,
    evPercent,
    qualified: qualResult.qualified,
    exclusionReason: qualResult.exclusionReason,
    qualificationChecks: qualResult.checks,
    bookmakerCount,
    dataCompleteness: featureCompleteness,
    freshnessMs: Date.now() - new Date(sourceTimestamp).getTime(),
    matchConfidence: 1.0,
    reasoning,
    riskNote: 'Paper tracking only — no real bets are placed.',
    source: 'The Odds API + Analysis Engine',
    sourceTimestamp,
    modelVersion,
  };
}

function asFiniteOrNull(v: number | undefined | null): number | null {
  if (v === undefined || v === null || !Number.isFinite(v)) return null;
  return v;
}

function medianNoVigConsensusLocal(pairs: Array<{ name: string; sideAOdds: number; sideBOdds: number }>): { probA: number; valid: boolean } {
  const validProbs: number[] = [];
  for (const pair of pairs) {
    if (isMalformedOdds(pair.sideAOdds) || isMalformedOdds(pair.sideBOdds)) continue;
    const implA = americanToImpliedProb(pair.sideAOdds);
    const implB = americanToImpliedProb(pair.sideBOdds);
    if (!Number.isFinite(implA) || !Number.isFinite(implB)) continue;
    const total = implA + implB;
    if (total === 0) continue;
    const probA = implA / total;
    if (probA <= 0 || probA >= 1) continue;
    validProbs.push(probA);
  }
  if (validProbs.length < 3) return { probA: NaN, valid: false };
  const sorted = [...validProbs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const med = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { probA: med, valid: true };
}

function checkQualificationForPick(inputs: {
  startTime: string;
  sourceTimestamp: string;
  bookmakerCount: number;
  sampleSize: number;
  featureCompleteness: number;
  evPercent: number | null;
  edgePp: number | null;
  modelAvailable: boolean;
  modelCalibrated: boolean;
  probabilitySanityPass: boolean;
  oddsMalformed: boolean;
}): { qualified: boolean; exclusionReason: string | null; checks: Array<{ name: string; passed: boolean; detail: string }> } {
  const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

  const notStarted = !isStaleOrStarted(inputs.startTime);
  checks.push({ name: 'Game not started', passed: notStarted, detail: notStarted ? 'Game is in the future' : 'Game has already started' });

  const sourceAge = Date.now() - new Date(inputs.sourceTimestamp).getTime();
  const fresh = sourceAge < 15 * 60 * 1000;
  checks.push({ name: 'Odds fresh (≤15 min)', passed: fresh, detail: fresh ? `Updated ${Math.round(sourceAge / 60000)} min ago` : `Stale: ${Math.round(sourceAge / 60000)} min old` });

  const enoughBooks = inputs.bookmakerCount >= 3;
  checks.push({ name: '3+ bookmakers', passed: enoughBooks, detail: enoughBooks ? `${inputs.bookmakerCount} bookmakers` : `Only ${inputs.bookmakerCount} bookmakers` });

  const enoughSample = inputs.sampleSize >= 30;
  checks.push({ name: 'Sufficient historical data (≥30)', passed: enoughSample, detail: enoughSample ? `${inputs.sampleSize} completed games` : `Only ${inputs.sampleSize} games (need 30)` });

  const featuresComplete = inputs.featureCompleteness >= 0.8;
  checks.push({ name: 'Features complete', passed: featuresComplete, detail: featuresComplete ? `${(inputs.featureCompleteness * 100).toFixed(0)}% complete` : `Only ${(inputs.featureCompleteness * 100).toFixed(0)}% (need 80%)` });

  const modelAvail = inputs.modelAvailable;
  checks.push({ name: 'Independent model available', passed: modelAvail, detail: modelAvail ? 'Model produces independent probability' : 'No independent model — market data only' });

  const modelCalib = inputs.modelCalibrated;
  checks.push({ name: 'Model calibrated', passed: modelCalib, detail: modelCalib ? 'Brier score within range' : 'Model not calibrated or insufficient data' });

  const sanitySafe = inputs.probabilitySanityPass;
  checks.push({ name: 'Probability/price sanity', passed: sanitySafe, detail: sanitySafe ? 'Consistent probability vs odds' : 'Inconsistent probability vs offered odds' });

  const edgeOk = inputs.edgePp !== null && inputs.edgePp >= 0.02;
  checks.push({ name: 'Edge ≥ 2pp', passed: edgeOk, detail: inputs.edgePp !== null ? `Edge: ${(inputs.edgePp * 100).toFixed(1)}pp` : 'Edge unavailable (no model)' });

  const evOk = inputs.evPercent !== null && inputs.evPercent >= 0.03;
  checks.push({ name: 'EV ≥ 3.0%', passed: evOk, detail: inputs.evPercent !== null ? `EV: +${(inputs.evPercent * 100).toFixed(1)}%` : 'EV unavailable (no model)' });

  const lineValid = !inputs.oddsMalformed;
  checks.push({ name: 'Valid odds', passed: lineValid, detail: lineValid ? 'Odds are valid' : 'Malformed odds' });

  const failedChecks = checks.filter((c) => !c.passed);
  const qualified = failedChecks.length === 0;
  const exclusionReason = qualified ? null : failedChecks.map((c) => c.name).join('; ');

  return { qualified, exclusionReason, checks };
}

function makePick(base: {
  eventId: string; league: string; homeTeam: string; awayTeam: string; startTime: string;
  market: string; side: string; line: string; bestOdds: number; bestBookmaker: string;
  bookmakerCount: number; sourceTimestamp: string; modelVersion: string;
  exclusionReason: string;
}): RankedPick {
  return {
    ...base,
    consensusProbability: null,
    marketValueEdge: null,
    pModel: null,
    pFinal: null,
    wModel: null,
    fairDecimal: null,
    offeredDecimal: americanToDecimalOdds(base.bestOdds) || 0,
    evPercent: null,
    qualified: false,
    qualificationChecks: [],
    dataCompleteness: 0,
    freshnessMs: Date.now(),
    matchConfidence: 0,
    reasoning: base.exclusionReason,
    riskNote: 'Paper tracking only — no real bets are placed.',
    source: 'The Odds API + Analysis Engine',
  };
}

function buildReasoning(d: {
  pModel: number | null; pMarket: number | null; pFinal: number | null;
  fairDecimal: number | null; offeredDecimal: number; bestBook: string;
  evPercent: number | null; modelAvailable: boolean;
}): string {
  const parts: string[] = [];
  if (d.modelAvailable && d.pModel !== null) {
    parts.push(`Independent model: ${(d.pModel * 100).toFixed(1)}%`);
  } else {
    parts.push('Independent model: N/A');
  }
  if (d.pMarket !== null) {
    parts.push(`Market no-vig: ${(d.pMarket * 100).toFixed(1)}%`);
  } else {
    parts.push('Market no-vig: N/A');
  }
  if (d.pFinal !== null) {
    parts.push(`Blended: ${(d.pFinal * 100).toFixed(1)}%`);
  }
  if (d.fairDecimal !== null) {
    parts.push(`Fair odds: ${d.fairDecimal.toFixed(2)}`);
  }
  parts.push(`Best price: ${d.offeredDecimal.toFixed(2)} from ${d.bestBook}`);
  if (d.evPercent !== null) {
    parts.push(`EV: ${d.evPercent >= 0 ? '+' : ''}${(d.evPercent * 100).toFixed(1)}%`);
  } else {
    parts.push('EV: N/A');
  }
  return parts.join('. ') + '.';
}

// ── Costa Rica time formatting ────────────────────────────────────────────────

export function fmtCostaRicaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Costa_Rica',
  });
}

export function fmtCostaRicaDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Costa_Rica',
  });
}

export function fmtCostaRicaDateTime(iso: string): string {
  return `${fmtCostaRicaDate(iso)} · ${fmtCostaRicaTime(iso)}`;
}

// ── Settlement via edge function ───────────────────────────────────────────────

export async function settlePicks(picks: Array<{
  id: string;
  eventId: string;
  sportKey: string;
  market: string;
  side: string;
  line: string;
  isHome: boolean;
}>): Promise<Array<{ id: string; result: SettlementResult; finalScore: string; settledAt: string; source: string }>> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/settle-picks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ picks }),
    });

    if (!response.ok) return [];
    const json = await response.json();
    return json.results || [];
  } catch {
    return [];
  }
}
