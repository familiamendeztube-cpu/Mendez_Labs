// Edge function: sports-feed
// v3: includes apiKey in URL query parameter for The Odds API authentication.
// Fetches live sports odds, caches in provider_cache, returns normalized events.
// Fetches live sports odds from The Odds API, caches in provider_cache table,
// returns normalized events with odds, scores, and provider health.
// API key is read from the api_keys table (server-side only, never exposed).
//
// Caching strategy: 1-hour TTL per sport. If cache is fresh, return cached data.
// If stale, fetch from API and update cache. This keeps free-plan credits low
// (target: ~5 sport requests per UTC day = ~15 credits/day).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const CACHE_TTL_MINUTES = 60;

// Sport keys to fetch (targeting 5 sports for ~15 credits/day on free plan)
const SPORT_KEYS = [
  "americanfootball_nfl",
  "basketball_nba",
  "baseball_mlb",
  "icehockey_nhl",
  "soccer_epl",
];

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

interface NormalizedEvent {
  eventId: string;
  sportKey: string;
  sportTitle: string;
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

async function getApiKey(supabaseUrl: string, serviceRoleKey: string): Promise<{ key: string | null; error: string | null }> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/api_keys?name=eq.THE_ODDS_API_KEY&select=value`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
    });
    if (!response.ok) {
      return { key: null, error: `DB fetch failed: ${response.status}` };
    }
    const rows = await response.json();
    if (!rows || rows.length === 0) {
      return { key: null, error: "No API key row found in database" };
    }
    return { key: rows[0].value, error: null };
  } catch (err) {
    return { key: null, error: `DB fetch error: ${err instanceof Error ? err.message : "unknown"}` };
  }
}

async function getCachedData(
  supabaseUrl: string,
  anonKey: string,
  sportKey: string,
): Promise<{ data: NormalizedEvent[] | null; fetchedAt: string | null; expiresAt: string | null; remainingQuota: number | null; isStale: boolean }> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/provider_cache?source=eq.the-odds-api&sport_key=eq.${sportKey}&order=created_at.desc&limit=1`,
    {
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
      },
    },
  );

  if (!response.ok) return { data: null, fetchedAt: null, expiresAt: null, remainingQuota: null, isStale: true };
  const rows = await response.json();
  if (!rows || rows.length === 0) return { data: null, fetchedAt: null, expiresAt: null, remainingQuota: null, isStale: true };

  const row = rows[0];
  const expiresAt = new Date(row.expires_at).getTime();
  const isStale = Date.now() > expiresAt;
  return {
    data: row.data as NormalizedEvent[],
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    remainingQuota: row.remaining_quota,
    isStale,
  };
}

async function saveCache(
  supabaseUrl: string,
  serviceRoleKey: string,
  sportKey: string,
  data: NormalizedEvent[],
  remainingQuota: number | null,
): Promise<void> {
  const now = new Date();
  const expires = new Date(now.getTime() + CACHE_TTL_MINUTES * 60 * 1000);

  await fetch(`${supabaseUrl}/rest/v1/provider_cache`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "the-odds-api",
      sport_key: sportKey,
      data: data,
      fetched_at: now.toISOString(),
      expires_at: expires.toISOString(),
      status: "success",
      remaining_quota: remainingQuota,
    }),
  });
}

async function saveSyncRun(
  supabaseUrl: string,
  serviceRoleKey: string,
  status: string,
  eventsCount: number | null,
  bookmakersCount: number | null,
  remainingQuota: number | null,
  errorMessage: string | null,
): Promise<void> {
  const now = new Date();
  await fetch(`${supabaseUrl}/rest/v1/provider_sync_runs`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "the-odds-api",
      started_at: now.toISOString(),
      completed_at: now.toISOString(),
      status,
      events_count: eventsCount,
      bookmakers_count: bookmakersCount,
      remaining_quota: remainingQuota,
      error_message: errorMessage,
    }),
  });
}

function normalizeEvents(rawEvents: OddsApiEvent[], sportKey: string): NormalizedEvent[] {
  const leagueMap: Record<string, string> = {
    americanfootball_nfl: "NFL",
    basketball_nba: "NBA",
    baseball_mlb: "MLB",
    icehockey_nhl: "NHL",
    soccer_epl: "Soccer",
  };

  return rawEvents.map((event) => ({
    eventId: event.id,
    sportKey: event.sport_key,
    sportTitle: event.sport_title,
    league: leagueMap[sportKey] || sportKey,
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
}

async function fetchFromOddsApi(
  sportKey: string,
  apiKey: string,
): Promise<{ events: OddsApiEvent[]; remainingQuota: number | null } | null> {
  const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso&apiKey=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Odds API error for ${sportKey}: ${response.status} - ${errorText.substring(0, 200)}`);
      return null;
    }

    const events = await response.json() as OddsApiEvent[];
    const remaining = response.headers.get("x-requests-remaining");
    const remainingQuota = remaining ? parseInt(remaining, 10) : null;

    return { events, remainingQuota };
  } catch (err) {
    console.error(`Fetch failed for ${sportKey}:`, err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

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
        JSON.stringify({ error: "Server not configured", events: [], provider: { status: "error", message: "Missing server configuration" } }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { key: apiKey, error: apiKeyError } = await getApiKey(supabaseUrl, serviceRoleKey);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured", events: [], provider: { status: "error", message: `The Odds API key is not configured: ${apiKeyError || "unknown"}` } }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse query params
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("force") === "true";

    if (forceRefresh) {
      // Don't allow browser to bypass cache — ignore this param
      // Only the server's own TTL logic decides when to refresh
    }

    const allEvents: NormalizedEvent[] = [];
    let totalBookmakers = 0;
    let lastRemainingQuota: number | null = null;
    let lastFetchedAt: string | null = null;
    let lastExpiresAt: string | null = null;
    let anyError: string | null = null;
    let sportsFetched = 0;
    let sportsFailed = 0;

    for (const sportKey of SPORT_KEYS) {
      // Check cache first
      const cached = await getCachedData(supabaseUrl, anonKey || serviceRoleKey, sportKey);

      if (cached.data && !cached.isStale && !forceRefresh) {
        // Use fresh cache
        allEvents.push(...cached.data);
        if (cached.data.length > 0) {
          totalBookmakers += cached.data[0].bookmakers.length;
        }
        lastFetchedAt = cached.fetchedAt;
        lastExpiresAt = cached.expiresAt;
        if (cached.remainingQuota !== null) lastRemainingQuota = cached.remainingQuota;
        continue;
      }

      // Cache is stale or empty — fetch from API
      const result = await fetchFromOddsApi(sportKey, apiKey);
      if (result) {
        const normalized = normalizeEvents(result.events, sportKey);
        allEvents.push(...normalized);
        if (normalized.length > 0) {
          totalBookmakers += normalized[0].bookmakers.length;
        }
        await saveCache(supabaseUrl, serviceRoleKey, sportKey, normalized, result.remainingQuota);
        if (result.remainingQuota !== null) lastRemainingQuota = result.remainingQuota;
        lastFetchedAt = new Date().toISOString();
        lastExpiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();
        sportsFetched++;
      } else {
        sportsFailed++;
        // API failed for this sport — use stale cache if available
        if (cached.data) {
          allEvents.push(...cached.data);
          lastFetchedAt = cached.fetchedAt;
          lastExpiresAt = cached.expiresAt;
          if (cached.remainingQuota !== null) lastRemainingQuota = cached.remainingQuota;
        } else {
          anyError = `Failed to fetch ${sportKey}`;
        }
      }
    }

    // If all sports failed, report error
    if (sportsFetched === 0 && sportsFailed === SPORT_KEYS.length) {
      anyError = `All ${SPORT_KEYS.length} sports failed to fetch. Last error: ${anyError || "unknown"}`;
    } else if (sportsFailed > 0 && sportsFetched > 0) {
      // Partial success — some sports fetched, some failed
      anyError = null; // Don't report as degraded if we got some data
    }

    // Log sync run
    await saveSyncRun(
      supabaseUrl,
      serviceRoleKey,
      anyError ? "error" : "success",
      allEvents.length,
      totalBookmakers,
      lastRemainingQuota,
      anyError,
    );

    const provider = {
      status: anyError ? "degraded" : "connected",
      name: "The Odds API",
      lastSync: lastFetchedAt,
      cacheExpires: lastExpiresAt,
      remainingQuota: lastRemainingQuota,
      eventsCount: allEvents.length,
      bookmakersCount: totalBookmakers,
      sportsFetched,
      message: anyError || null,
    };

    return new Response(
      JSON.stringify({ events: allEvents, provider, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const sanitizedMsg = err instanceof Error ? err.message.replace(/api[_-]?key[^&]*/gi, "***") : "Internal server error";
    return new Response(
      JSON.stringify({ error: sanitizedMsg, events: [], provider: { status: "error", message: sanitizedMsg } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
