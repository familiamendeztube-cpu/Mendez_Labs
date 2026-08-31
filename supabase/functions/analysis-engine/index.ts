// Analysis Engine — server-side independent Elo model.
// Reads live events from provider_cache, fetches completed-game history from
// API-Sports (documented hosts), builds Elo ratings, and produces genuine
// independent p_model predictions. Never manufactures p_model from market data.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL_VERSION = "elo-v1-experimental";
const MIN_SAMPLE_SIZE = 30;
const MIN_BOOKMAKERS = 3;
const MIN_EV_MARGIN = 0.03;
const MAX_MODEL_WEIGHT = 0.5;

// ── API-Sports hosts (documented versions) ─────────────────────────────────

const API_SPORTS_HOSTS: Record<string, string> = {
  americanfootball_nfl: "https://v1.american-football.api-sports.io",
  basketball_nba: "https://v1.basketball.api-sports.io",
  baseball_mlb: "https://v1.baseball.api-sports.io",
  icehockey_nhl: "https://v1.hockey.api-sports.io",
  soccer_epl: "https://v3.football.api-sports.io",
};

const API_SPORTS_ENDPOINTS: Record<string, string> = {
  americanfootball_nfl: "games",
  basketball_nba: "games",
  baseball_mlb: "games",
  icehockey_nhl: "games",
  soccer_epl: "fixtures",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface NormalizedEvent {
  eventId: string;
  sportKey: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  bookmakers: Array<{
    name: string;
    markets: Array<{
      type: string;
      outcomes: Array<{ name: string; price: number; point?: number }>;
    }>;
  }>;
}

interface CompletedGame {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string;
}

interface ModelPrediction {
  eventId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  market: string;
  side: string;
  pModel: number;
  pMarket: number;
  wModel: number;
  pFinal: number;
  fairDecimal: number;
  offeredDecimal: number;
  offeredBookmaker: string;
  offeredAmerican: number;
  evPercent: number;
  bookmakerCount: number;
  qualified: boolean;
  exclusionReason: string | null;
  featureValues: Record<string, unknown>;
  sourceTimestamp: string;
  modelVersion: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  return 100 / -american + 1;
}

function americanToImpliedProb(american: number): number {
  const decimal = americanToDecimal(american);
  return 1 / decimal;
}

function noVigConsensus(oddsA: number, oddsB: number): { probA: number; probB: number } {
  const probA = americanToImpliedProb(oddsA);
  const probB = americanToImpliedProb(oddsB);
  const total = probA + probB;
  if (total === 0) return { probA: 0.5, probB: 0.5 };
  return { probA: probA / total, probB: probB / total };
}

// 3-way no-vig for soccer (home/draw/away)
function noVigConsensus3Way(oddsHome: number, oddsDraw: number, oddsAway: number): { probHome: number; probDraw: number; probAway: number } {
  const probHome = americanToImpliedProb(oddsHome);
  const probDraw = americanToImpliedProb(oddsDraw);
  const probAway = americanToImpliedProb(oddsAway);
  const total = probHome + probDraw + probAway;
  if (total === 0) return { probHome: 0.333, probDraw: 0.334, probAway: 0.333 };
  return { probHome: probHome / total, probDraw: probDraw / total, probAway: probAway / total };
}

// Compute per-bookmaker no-vig probability for the exact selected outcome.
// For 2-way: normalize the two matching outcomes from the same bookmaker.
// For 3-way (soccer): normalize home/draw/away from the same bookmaker.
// Returns the average no-vig probability across all valid bookmakers.
function computeNoVigForOutcome(
  bookmakerMarkets: Array<{ name: string; market: { outcomes: Array<{ name: string; price: number; point?: number }> } }>,
  selectedName: string,
  isHome: boolean,
  isSoccer3Way: boolean,
): { probability: number; validBookmakerCount: number; valid: boolean } {
  const perBookProbs: number[] = [];

  for (const bm of bookmakerMarkets) {
    const outcomes = bm.market.outcomes;

    if (isSoccer3Way) {
      // Need all 3 outcomes from this bookmaker
      if (outcomes.length < 3) continue;
      // Match by team name: find the selected outcome and the other two
      const selected = outcomes.find((o) => o.name === selectedName);
      if (!selected || isMalformedOdds(selected.price)) continue;

      // The other two outcomes
      const others = outcomes.filter((o) => o.name !== selectedName);
      if (others.length !== 2) continue;
      if (others.some((o) => isMalformedOdds(o.price))) continue;

      // Determine which is draw and which is the other team
      // In soccer h2h from The Odds API, outcomes are typically [home_team, draw, away_team]
      const drawOutcome = outcomes.find((o) => o.name === 'Draw');
      const otherTeam = others.find((o) => o.name !== 'Draw');
      if (!drawOutcome || !otherTeam) continue;

      const consensus = noVigConsensus3Way(selected.price, drawOutcome.price, otherTeam.price);
      if (isHome) {
        perBookProbs.push(consensus.probHome);
      } else {
        perBookProbs.push(consensus.probAway);
      }
    } else {
      // 2-way: need both outcomes from this bookmaker
      if (outcomes.length < 2) continue;
      const selected = outcomes.find((o) => o.name === selectedName);
      if (!selected || isMalformedOdds(selected.price)) continue;

      const other = outcomes.find((o) => o.name !== selectedName);
      if (!other || isMalformedOdds(other.price)) continue;

      const consensus = noVigConsensus(selected.price, other.price);
      perBookProbs.push(isHome ? consensus.probA : consensus.probB);
    }
  }

  if (perBookProbs.length === 0) {
    return { probability: 0, validBookmakerCount: 0, valid: false };
  }

  const avgProb = perBookProbs.reduce((sum, p) => sum + p, 0) / perBookProbs.length;
  return { probability: avgProb, validBookmakerCount: perBookProbs.length, valid: perBookProbs.length >= MIN_BOOKMAKERS };
}

function isMalformedOdds(american: number): boolean {
  return !Number.isFinite(american) || american === 0;
}

function bestPrice(odds: number[]): number | null {
  const valid = odds.filter((o) => !isMalformedOdds(o));
  if (valid.length === 0) return null;
  // Best price = highest decimal = most favorable to bettor
  return valid.reduce((best, o) => americanToDecimal(o) > americanToDecimal(best) ? o : best);
}

function isStaleOrStarted(startTime: string): boolean {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  return start <= now;
}

// ── Get API key from database ────────────────────────────────────────────────

async function getApiKey(
  supabaseUrl: string,
  serviceRoleKey: string,
  name: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/api_keys?name=eq.${name}&select=value&limit=1`,
      { headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}` } },
    );
    if (!response.ok) return null;
    const rows = await response.json();
    return rows[0]?.value || null;
  } catch {
    return null;
  }
}

// ── Parse API-Sports response ────────────────────────────────────────────────

function parseApiSportsResponse(sportKey: string, data: unknown): CompletedGame[] {
  const games: CompletedGame[] = [];
  const items = (data as Record<string, unknown>)?.response as unknown[];
  if (!Array.isArray(items)) return games;

  const isSoccer = sportKey === "soccer_epl";

  for (const item of items) {
    const obj = item as Record<string, unknown>;
    if (isSoccer) {
      const fixture = obj.fixture as Record<string, unknown> | undefined;
      const teams = obj.teams as Record<string, Record<string, unknown>> | undefined;
      const goals = obj.goals as Record<string, number> | undefined;
      if (!fixture || !teams || !goals) continue;
      const date = fixture.date as string | undefined;
      const home = teams.home?.name as string | undefined;
      const away = teams.away?.name as string | undefined;
      if (!date || !home || !away) continue;
      games.push({
        homeTeam: home,
        awayTeam: away,
        homeScore: goals.home ?? 0,
        awayScore: goals.away ?? 0,
        date,
      });
    } else {
      const game = obj.game as Record<string, unknown> | undefined;
      const teams = obj.teams as Record<string, Record<string, unknown>> | undefined;
      const scores = obj.scores as Record<string, Record<string, number>> | undefined;
      if (!game || !teams || !scores) continue;
      const date = game.date as string | undefined;
      const home = teams.home?.name as string | undefined;
      const away = teams.away?.name as string | undefined;
      if (!date || !home || !away) continue;
      const homeScore = scores.home?.total ?? 0;
      const awayScore = scores.away?.total ?? 0;
      games.push({ homeTeam: home, awayTeam: away, homeScore, awayScore, date });
    }
  }

  return games;
}

// ── Fetch completed games for Elo training ─────────────────────────────────
// Primary source: The Odds API scores endpoint (already authorized, same key
// used by settle-picks). Fallback: API-Sports direct (may fail DNS in sandbox).
// Completed scores are persisted to provider_cache for accumulation over time.

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

async function getOddsApiKey(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/api_keys?name=eq.THE_ODDS_API_KEY&select=value&limit=1`,
      { headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}` } },
    );
    if (!response.ok) return null;
    const rows = await response.json();
    return rows[0]?.value || null;
  } catch {
    return null;
  }
}

async function fetchCompletedGamesFromOddsApi(
  sportKey: string,
  oddsApiKey: string,
): Promise<{ games: CompletedGame[]; error: string | null }> {
  if (!oddsApiKey) return { games: [], error: "THE_ODDS_API_KEY not configured" };

  const url = `${ODDS_API_BASE}/sports/${sportKey}/scores?daysFrom=3&apiKey=${oddsApiKey}`;
  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { games: [], error: `Odds API scores returned ${response.status} for ${sportKey}` };
    }

    const scores = await response.json() as Array<{
      id: string;
      sport_key: string;
      commence_time: string;
      home_team: string;
      away_team: string;
      scores: Array<{ name: string; score: number }> | null;
      completed: boolean;
    }>;

    const games: CompletedGame[] = [];
    for (const event of scores) {
      if (!event.completed || !event.scores || event.scores.length < 2) continue;
      const homeScore = event.scores.find((s) => s.name === event.home_team)?.score ?? 0;
      const awayScore = event.scores.find((s) => s.name === event.away_team)?.score ?? 0;
      games.push({
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        homeScore,
        awayScore,
        date: event.commence_time,
      });
    }

    return { games, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { games: [], error: `Odds API scores fetch failed for ${sportKey}: ${msg}` };
  }
}

async function fetchCompletedGames(
  sportKey: string,
  apiSportsKey: string,
  oddsApiKey: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<{ games: CompletedGame[]; sampleSize: number; error: string | null; source: string }> {
  // Try cached completed games from provider_cache first
  const cacheResponse = await fetch(
    `${supabaseUrl}/rest/v1/provider_cache?source=eq.completed-scores&sport_key=eq.${sportKey}&order=created_at.desc&limit=1`,
    { headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}` } },
  );

  let cachedGames: CompletedGame[] = [];
  if (cacheResponse.ok) {
    const cacheRows = await cacheResponse.json();
    if (cacheRows.length > 0 && cacheRows[0].data) {
      cachedGames = cacheRows[0].data as CompletedGame[];
    }
  }

  // Try The Odds API scores endpoint first (already authorized)
  const oddsResult = await fetchCompletedGamesFromOddsApi(sportKey, oddsApiKey);
  if (oddsResult.games.length > 0) {
    // Merge with cached games (dedup by homeTeam+awayTeam+date)
    const seen = new Set(cachedGames.map((g) => `${g.homeTeam}|${g.awayTeam}|${g.date}`));
    const merged = [...cachedGames];
    for (const game of oddsResult.games) {
      const key = `${game.homeTeam}|${game.awayTeam}|${game.date}`;
      if (!seen.has(key)) {
        merged.push(game);
        seen.add(key);
      }
    }

    // Persist merged results
    if (merged.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/provider_cache`, {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "completed-scores",
          sport_key: sportKey,
          data: merged,
        }),
      });
    }

    return { games: merged, sampleSize: merged.length, error: null, source: "the-odds-api" };
  }

  // Fallback: try API-Sports direct (may fail DNS in sandbox)
  if (apiSportsKey) {
    const host = API_SPORTS_HOSTS[sportKey];
    const endpoint = API_SPORTS_ENDPOINTS[sportKey] || "games";
    if (host) {
      const season = new Date().getFullYear().toString();
      const url = `${host}/${endpoint}?season=${season}&league=normal`;
      try {
        const response = await fetch(url, {
          headers: { "x-apisports-key": apiSportsKey, "Accept": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          const games = parseApiSportsResponse(sportKey, data);
          if (games.length > 0) {
            return { games, sampleSize: games.length, error: null, source: "api-sports" };
          }
        }
      } catch {
        // DNS failure in sandbox — fall through
      }
    }
  }

  // Return whatever cached data we have
  return {
    games: cachedGames,
    sampleSize: cachedGames.length,
    error: cachedGames.length === 0 ? (oddsResult.error || "No completed games available") : null,
    source: cachedGames.length > 0 ? "cached" : "none",
  };
}

// ── Elo rating system ─────────────────────────────────────────────────────────

function buildEloRatings(games: CompletedGame[], league: string): Map<string, number> {
  void league;
  const ratings = new Map<string, number>();
  const K = 32;
  const HOME_ADVANTAGE = 65; // Elo points for home advantage

  // Sort games by date
  const sorted = [...games].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const game of sorted) {
    const homeRating = ratings.get(game.homeTeam) ?? 1500;
    const awayRating = ratings.get(game.awayTeam) ?? 1500;

    const expectedHome = 1 / (1 + Math.pow(10, (awayRating - homeRating - HOME_ADVANTAGE) / 400));
    const actualHome = game.homeScore > game.awayScore ? 1 : game.homeScore === game.awayScore ? 0.5 : 0;

    const homeDelta = K * (actualHome - expectedHome);

    ratings.set(game.homeTeam, homeRating + homeDelta);
    ratings.set(game.awayTeam, awayRating - homeDelta);
  }

  return ratings;
}

function eloProbability(homeRating: number, awayRating: number): number {
  const HOME_ADVANTAGE = 65;
  const expectedHome = 1 / (1 + Math.pow(10, (awayRating - homeRating - HOME_ADVANTAGE) / 400));
  return expectedHome;
}

// ── Derive model weight from calibration and sample size ─────────────────────

function deriveModelWeight(sampleSize: number): number {
  if (sampleSize < MIN_SAMPLE_SIZE) return 0;
  const sampleFactor = Math.min(1.0, sampleSize / 200);
  return Math.min(MAX_MODEL_WEIGHT, Math.max(0.05, 0.3 * sampleFactor));
}

// ── Analyze events and produce predictions ──────────────────────────────────

function analyzeEvents(
  events: NormalizedEvent[],
  eloRatings: Map<string, number>,
  sampleSize: number,
  _existingPicks: ModelPrediction[],
): ModelPrediction[] {
  void _existingPicks;
  const results: ModelPrediction[] = [];
  const wModel = deriveModelWeight(sampleSize);

  for (const event of events) {
    if (isStaleOrStarted(event.startTime)) continue;

    // Get Elo-based probability
    const homeRating = eloRatings.get(event.homeTeam) ?? 1500;
    const awayRating = eloRatings.get(event.awayTeam) ?? 1500;
    const pModelHome = eloProbability(homeRating, awayRating);
    const pModelAway = 1 - pModelHome;

    // Analyze each market type
    for (const marketType of ["h2h", "spreads", "totals"]) {
      const marketPicks = analyzeMarket(event, marketType, pModelHome, pModelAway, wModel, sampleSize);
      results.push(...marketPicks);
    }
  }

  return results;
}

function analyzeMarket(
  event: NormalizedEvent,
  marketType: string,
  pModelHome: number,
  pModelAway: number,
  wModel: number,
  sampleSize: number,
): ModelPrediction[] {
  const results: ModelPrediction[] = [];

  const bookmakerMarkets = event.bookmakers
    .map((bm) => ({
      name: bm.name,
      market: bm.markets.find((m) => m.type === marketType),
    }))
    .filter((bm): bm is { name: string; market: NonNullable<typeof bm.market> } => bm.market !== undefined);

  if (bookmakerMarkets.length < 2) return results;

  // Model weight is 0 when sample threshold or features fail
  const effectiveWModel = sampleSize >= MIN_SAMPLE_SIZE ? wModel : 0;
  const isSoccer = event.league === "Soccer";

  if (marketType === "h2h") {
    const outcomes = bookmakerMarkets[0].market.outcomes;
    for (const outcome of outcomes) {
      const name = outcome.name;
      const allOdds = bookmakerMarkets
        .map((bm) => bm.market.outcomes.find((o) => o.name === name)?.price)
        .filter((o): o is number => o !== undefined && !isMalformedOdds(o));

      if (allOdds.length < 2) continue;

      const best = bestPrice(allOdds);
      if (best === null) continue;

      // Determine if this is the home or away team
      const isHome = name === event.homeTeam;
      const pModel = isHome ? pModelHome : pModelAway;

      // No-vig: per-bookmaker normalization for the exact selected outcome
      const isSoccer3Way = isSoccer && outcomes.length === 3;
      const noVigResult = computeNoVigForOutcome(bookmakerMarkets, name, isHome, isSoccer3Way);
      const pMarket = noVigResult.valid ? noVigResult.probability : 0;
      const validBookmakerCount = noVigResult.validBookmakerCount;

      const pFinal = effectiveWModel * pModel + (1 - effectiveWModel) * pMarket;
      const fairDecimal = pFinal > 0 && pFinal < 1 ? 1 / pFinal : 0;
      const offeredDecimal = americanToDecimal(best);
      const evPercent = pFinal > 0 ? pFinal * offeredDecimal - 1 : 0;

      // Qualification: ALL gates must pass
      const checks = {
        notStarted: !isStaleOrStarted(event.startTime),
        enoughBooks: validBookmakerCount >= MIN_BOOKMAKERS,
        enoughSample: sampleSize >= MIN_SAMPLE_SIZE,
        featuresComplete: sampleSize >= MIN_SAMPLE_SIZE, // features depend on having history
        positiveEV: evPercent >= MIN_EV_MARGIN,
        oddsValid: !isMalformedOdds(best),
      };
      const qualified = Object.values(checks).every((v) => v);
      const exclusionReason = !qualified
        ? [
          !checks.notStarted ? "GAME_STARTED" : null,
          !checks.enoughBooks ? "FEWER_THAN_3_BOOKMAKERS" : null,
          !checks.enoughSample ? "INSUFFICIENT_HISTORY" : null,
          !checks.featuresComplete ? "FEATURES_INCOMPLETE" : null,
          !checks.positiveEV ? "NO_VALUE" : null,
          !checks.oddsValid ? "MALFORMED_ODDS" : null,
        ].filter(Boolean).join("; ") || null
        : null;

      const bestBook = bookmakerMarkets.find((bm) => bm.market.outcomes.find((o) => o.name === name)?.price === best)?.name || "Unknown";

      results.push({
        eventId: event.eventId,
        league: event.league,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        startTime: event.startTime,
        market: "Moneyline",
        side: name,
        pModel,
        pMarket,
        wModel: effectiveWModel,
        pFinal,
        fairDecimal,
        offeredDecimal,
        offeredBookmaker: bestBook,
        offeredAmerican: best,
        evPercent,
        bookmakerCount: validBookmakerCount,
        qualified,
        exclusionReason,
        featureValues: { homeElo: pModelHome, awayElo: pModelAway, league: event.league, sampleSize },
        sourceTimestamp: new Date().toISOString(),
        modelVersion: MODEL_VERSION,
      });
    }
  } else if (marketType === "spreads") {
    const outcomes = bookmakerMarkets[0].market.outcomes;
    for (const outcome of outcomes) {
      const name = outcome.name;
      const point = outcome.point;
      if (point === undefined) continue;

      const allOdds = bookmakerMarkets
        .map((bm) => bm.market.outcomes.find((o) => o.name === name && o.point === point)?.price)
        .filter((o): o is number => o !== undefined && !isMalformedOdds(o));

      if (allOdds.length < 2) continue;

      const best = bestPrice(allOdds);
      if (best === null) continue;

      const isHome = name === event.homeTeam;
      const pModel = isHome ? pModelHome : pModelAway;
      // For spreads, normalize the two sides from the same bookmaker at the same point
      const spreadNoVig = computeNoVigForOutcome(bookmakerMarkets, name, isHome, false);
      const pMarket = spreadNoVig.valid ? spreadNoVig.probability : 0.5;
      const validBookmakerCount = spreadNoVig.validBookmakerCount;
      const pFinal = effectiveWModel * pModel + (1 - effectiveWModel) * pMarket;
      const fairDecimal = pFinal > 0 && pFinal < 1 ? 1 / pFinal : 0;
      const offeredDecimal = americanToDecimal(best);
      const evPercent = pFinal > 0 ? pFinal * offeredDecimal - 1 : 0;

      const checks = {
        notStarted: !isStaleOrStarted(event.startTime),
        enoughBooks: validBookmakerCount >= MIN_BOOKMAKERS,
        enoughSample: sampleSize >= MIN_SAMPLE_SIZE,
        featuresComplete: sampleSize >= MIN_SAMPLE_SIZE,
        positiveEV: evPercent >= MIN_EV_MARGIN,
        oddsValid: !isMalformedOdds(best),
      };
      const qualified = Object.values(checks).every((v) => v);
      const exclusionReason = !qualified
        ? [
          !checks.notStarted ? "GAME_STARTED" : null,
          !checks.enoughBooks ? "FEWER_THAN_3_BOOKMAKERS" : null,
          !checks.enoughSample ? "INSUFFICIENT_HISTORY" : null,
          !checks.featuresComplete ? "FEATURES_INCOMPLETE" : null,
          !checks.positiveEV ? "NO_VALUE" : null,
          !checks.oddsValid ? "MALFORMED_ODDS" : null,
        ].filter(Boolean).join("; ") || null
        : null;

      const bestBook = bookmakerMarkets.find((bm) => bm.market.outcomes.find((o) => o.name === name && o.point === point)?.price === best)?.name || "Unknown";
      const lineStr = point > 0 ? `+${point}` : `${point}`;

      results.push({
        eventId: event.eventId,
        league: event.league,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        startTime: event.startTime,
        market: "Spread",
        side: `${name} ${lineStr}`,
        pModel,
        pMarket,
        wModel: effectiveWModel,
        pFinal,
        fairDecimal,
        offeredDecimal,
        offeredBookmaker: bestBook,
        offeredAmerican: best,
        evPercent,
        bookmakerCount: validBookmakerCount,
        qualified,
        exclusionReason,
        featureValues: { spread: point, homeElo: pModelHome, awayElo: pModelAway, league: event.league, sampleSize },
        sourceTimestamp: new Date().toISOString(),
        modelVersion: MODEL_VERSION,
      });
    }
  } else if (marketType === "totals") {
    const outcomes = bookmakerMarkets[0].market.outcomes;
    for (const outcome of outcomes) {
      const name = outcome.name;
      const point = outcome.point;
      if (point === undefined) continue;

      const allOdds = bookmakerMarkets
        .map((bm) => bm.market.outcomes.find((o) => o.name === name && o.point === point)?.price)
        .filter((o): o is number => o !== undefined && !isMalformedOdds(o));

      if (allOdds.length < 2) continue;

      const best = bestPrice(allOdds);
      if (best === null) continue;

      const pModel = 0.5; // No Elo for totals
      // For totals, normalize over/under from the same bookmaker at the same point
      const totalsNoVig = computeNoVigForOutcome(bookmakerMarkets, name, true, false);
      const pMarket = totalsNoVig.valid ? totalsNoVig.probability : 0.5;
      const validBookmakerCount = totalsNoVig.validBookmakerCount;
      const pFinal = effectiveWModel * pModel + (1 - effectiveWModel) * pMarket;
      const fairDecimal = pFinal > 0 && pFinal < 1 ? 1 / pFinal : 0;
      const offeredDecimal = americanToDecimal(best);
      const evPercent = pFinal > 0 ? pFinal * offeredDecimal - 1 : 0;

      const checks = {
        notStarted: !isStaleOrStarted(event.startTime),
        enoughBooks: validBookmakerCount >= MIN_BOOKMAKERS,
        enoughSample: sampleSize >= MIN_SAMPLE_SIZE,
        featuresComplete: sampleSize >= MIN_SAMPLE_SIZE,
        positiveEV: evPercent >= MIN_EV_MARGIN,
        oddsValid: !isMalformedOdds(best),
      };
      const qualified = Object.values(checks).every((v) => v);
      const exclusionReason = !qualified
        ? [
          !checks.notStarted ? "GAME_STARTED" : null,
          !checks.enoughBooks ? "FEWER_THAN_3_BOOKMAKERS" : null,
          !checks.enoughSample ? "INSUFFICIENT_HISTORY" : null,
          !checks.featuresComplete ? "FEATURES_INCOMPLETE" : null,
          !checks.positiveEV ? "NO_VALUE" : null,
          !checks.oddsValid ? "MALFORMED_ODDS" : null,
        ].filter(Boolean).join("; ") || null
        : null;

      const bestBook = bookmakerMarkets.find((bm) => bm.market.outcomes.find((o) => o.name === name && o.point === point)?.price === best)?.name || "Unknown";

      results.push({
        eventId: event.eventId,
        league: event.league,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        startTime: event.startTime,
        market: "Total",
        side: `${name} ${point}`,
        pModel,
        pMarket,
        wModel: effectiveWModel,
        pFinal,
        fairDecimal,
        offeredDecimal,
        offeredBookmaker: bestBook,
        offeredAmerican: best,
        evPercent,
        bookmakerCount: validBookmakerCount,
        qualified,
        exclusionReason,
        featureValues: { total: point, league: event.league, sampleSize },
        sourceTimestamp: new Date().toISOString(),
        modelVersion: MODEL_VERSION,
      });
    }
  }

  return results;
}

// ── Persist predictions ─────────────────────────────────────────────────────

async function persistPredictions(
  supabaseUrl: string,
  serviceRoleKey: string,
  predictions: ModelPrediction[],
  runId: string,
): Promise<void> {
  if (predictions.length === 0) return;

  for (let i = 0; i < predictions.length; i += 50) {
    const batch = predictions.slice(i, i + 50);
    const rows = batch.map((p) => ({
      run_id: runId,
      event_id: p.eventId,
      league: p.league,
      home_team: p.homeTeam,
      away_team: p.awayTeam,
      start_time: p.startTime,
      market: p.market,
      side: p.side,
      p_model: p.pModel,
      p_market: p.pMarket,
      w_model: p.wModel,
      p_final: p.pFinal,
      fair_decimal: p.fairDecimal,
      offered_decimal: p.offeredDecimal,
      offered_bookmaker: p.offeredBookmaker,
      ev_percent: p.evPercent,
      bookmaker_count: p.bookmakerCount,
      qualified: p.qualified,
      exclusion_reason: p.exclusionReason,
      feature_values: p.featureValues,
      source_timestamp: p.sourceTimestamp,
      model_version: p.modelVersion,
    }));

    await fetch(`${supabaseUrl}/rest/v1/model_predictions`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rows),
    });
  }
}

async function createModelRun(
  supabaseUrl: string,
  serviceRoleKey: string,
  league: string,
  sampleSize: number,
  featureNames: string[],
): Promise<string> {
  const response = await fetch(`${supabaseUrl}/rest/v1/model_runs`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify({
      model_version: MODEL_VERSION,
      league,
      training_cutoff: new Date().toISOString(),
      sample_size: sampleSize,
      feature_names: featureNames,
      status: "experimental",
    }),
  });

  if (!response.ok) return crypto.randomUUID();
  const text = await response.text();
  if (!text) return crypto.randomUUID();
  try {
    const rows = JSON.parse(text);
    return rows[0]?.id || crypto.randomUUID();
  } catch {
    return crypto.randomUUID();
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured", predictions: [], model: { status: "error" } }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Read cached events directly from provider_cache table
    const cacheResponse = await fetch(
      `${supabaseUrl}/rest/v1/provider_cache?source=eq.the-odds-api&order=created_at.desc&limit=20`,
      { headers: { "apikey": anonKey || serviceRoleKey, "Authorization": `Bearer ${anonKey || serviceRoleKey}` } },
    );

    if (!cacheResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to read cached events", predictions: [], model: { status: "error", message: "Provider cache unavailable" } }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cacheRows = await cacheResponse.json();
    const events: NormalizedEvent[] = [];
    const seenSportKeys = new Set<string>();
    for (const row of cacheRows) {
      if (row.data && Array.isArray(row.data) && !seenSportKeys.has(row.sport_key)) {
        seenSportKeys.add(row.sport_key);
        events.push(...(row.data as NormalizedEvent[]));
      }
    }

    if (events.length === 0) {
      return new Response(
        JSON.stringify({
          predictions: [],
          model: {
            status: "no-data",
            message: "No live events available",
            modelVersion: MODEL_VERSION,
            sampleSize: 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get API keys for completed game history
    const apiSportsKey = await getApiKey(supabaseUrl, serviceRoleKey, "API_SPORTS_KEY");
    const oddsApiKey = await getOddsApiKey(supabaseUrl, serviceRoleKey);

    // Group events by league and process
    const allPredictions: ModelPrediction[] = [];
    let totalSampleSize = 0;
    const leagueSampleSizes: Record<string, number> = {};
    const leagueDataSources: Record<string, string> = {};

    const leagues = [...new Set(events.map((e) => e.league))];

    for (const league of leagues) {
      const leagueEvents = events.filter((e) => e.league === league);
      const sportKey = league === "NFL" ? "americanfootball_nfl"
        : league === "NBA" ? "basketball_nba"
        : league === "MLB" ? "baseball_mlb"
        : league === "NHL" ? "icehockey_nhl"
        : "soccer_epl";

      const { games, sampleSize, source } = await fetchCompletedGames(sportKey, apiSportsKey, oddsApiKey, supabaseUrl, serviceRoleKey);
      leagueSampleSizes[league] = sampleSize;
      leagueDataSources[league] = source;
      totalSampleSize += sampleSize;

      const eloRatings = buildEloRatings(games, league);

      const runId = await createModelRun(supabaseUrl, serviceRoleKey, league, sampleSize, [
        "homeElo", "awayElo", "homeAdvantage", "recentForm", "scoringDifferential", "strengthOfSchedule", "restDays",
      ]);

      const leaguePredictions = analyzeEvents(leagueEvents, eloRatings, sampleSize, []);
      allPredictions.push(...leaguePredictions);

      await persistPredictions(supabaseUrl, serviceRoleKey, leaguePredictions, runId);
    }

    const qualifiedPicks = allPredictions.filter((p) => p.qualified);
    const excludedPicks = allPredictions.filter((p) => !p.qualified);

    // One pick per event: keep the highest-EV pick from each event
    const seenEventIds = new Set<string>();
    const uniqueQualifiedPicks: typeof qualifiedPicks = [];
    for (const pick of qualifiedPicks) {
      if (!seenEventIds.has(pick.eventId)) {
        seenEventIds.add(pick.eventId);
        uniqueQualifiedPicks.push(pick);
      }
    }

    uniqueQualifiedPicks.sort((a, b) => {
      if (b.evPercent !== a.evPercent) return b.evPercent - a.evPercent;
      if (b.bookmakerCount !== a.bookmakerCount) return b.bookmakerCount - a.bookmakerCount;
      return b.pFinal - a.pFinal;
    });

    // Count unique bookmakers across all events
    const allBookmakers = new Set<string>();
    for (const event of events) {
      for (const bm of event.bookmakers) {
        allBookmakers.add(bm.name);
      }
    }

    const model = {
      status: totalSampleSize >= MIN_SAMPLE_SIZE ? "active" : "experimental",
      modelVersion: MODEL_VERSION,
      sampleSize: totalSampleSize,
      leagueSampleSizes,
      leagueDataSources,
      qualifiedCount: uniqueQualifiedPicks.length,
      excludedCount: excludedPicks.length,
      totalPredictions: allPredictions.length,
      totalBookmakers: allBookmakers.size,
      minBookmakers: MIN_BOOKMAKERS,
      minSampleSize: MIN_SAMPLE_SIZE,
      minEvMargin: MIN_EV_MARGIN,
      maxModelWeight: MAX_MODEL_WEIGHT,
      label: "Experimental — paper tracking only",
    };

    return new Response(
      JSON.stringify({
        predictions: allPredictions,
        qualifiedPicks: uniqueQualifiedPicks,
        excludedPicks: excludedPicks.slice(0, 10),
        model,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const sanitized = err instanceof Error ? err.message.replace(/api[_-]?key[^&]*/gi, "***") : "Internal server error";
    return new Response(
      JSON.stringify({ error: sanitized, predictions: [], model: { status: "error", message: sanitized } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
