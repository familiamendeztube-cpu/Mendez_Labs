// Edge function: settle-picks
// Settles locked Pick Five entries using verified final scores from The Odds API.
// Only settles picks whose game has completed (status: ended) and that are
// currently pending. Stores settlement source and time.
//
// This is paper tracking / research only. No real bets are placed.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

interface SettlementRequest {
  picks: Array<{
    id: string;
    eventId: string;
    sportKey: string;
    market: string;
    side: string;
    line: string;
    isHome: boolean;
    homeTeam: string;
    awayTeam: string;
  }>;
}

interface SettlementResult {
  id: string;
  result: 'won' | 'lost' | 'push' | 'void';
  finalScore: string;
  settledAt: string;
  source: string;
}

async function getApiKey(supabaseUrl: string, serviceRoleKey: string): Promise<string | null> {
  const response = await fetch(`${supabaseUrl}/rest/v1/api_keys?name=eq.THE_ODDS_API_KEY&select=value`, {
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return rows.length > 0 ? rows[0].value : null;
}

async function fetchEventScores(
  sportKey: string,
  eventId: string,
  apiKey: string,
): Promise<{ homeScore: number; awayScore: number; completed: boolean } | null> {
  const url = `${ODDS_API_BASE}/sports/${sportKey}/scores?eventIds=${eventId}&daysFrom=3&apiKey=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const scores = await response.json() as Array<{
      id: string;
      scores: Array<{ name: string; score: number }>;
      completed: boolean;
    }>;

    const event = scores.find((s) => s.id === eventId);
    if (!event || !event.completed || !event.scores || event.scores.length < 2) return null;

    // The Odds API scores endpoint returns scores in order: away first, home second.
    return {
      homeScore: event.scores[1]?.score ?? 0,
      awayScore: event.scores[0]?.score ?? 0,
      completed: event.completed,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function settleMoneyline(isHomePick: boolean, homeScore: number, awayScore: number): 'won' | 'lost' | 'push' {
  if (homeScore === awayScore) return 'push';
  const homeWon = homeScore > awayScore;
  return isHomePick ? (homeWon ? 'won' : 'lost') : (homeWon ? 'lost' : 'won');
}

function settleSpread(isHomePick: boolean, homeScore: number, awayScore: number, line: number): 'won' | 'lost' | 'push' {
  const pickScore = isHomePick ? homeScore : awayScore;
  const oppScore = isHomePick ? awayScore : homeScore;
  const margin = pickScore - oppScore + line;
  if (margin > 0) return 'won';
  if (margin < 0) return 'lost';
  return 'push';
}

function settleTotal(side: string, homeScore: number, awayScore: number, totalLine: number): 'won' | 'lost' | 'push' {
  const combined = homeScore + awayScore;
  if (combined === totalLine) return 'push';
  const isOver = side.toLowerCase().startsWith('over');
  return isOver ? (combined > totalLine ? 'won' : 'lost') : (combined < totalLine ? 'won' : 'lost');
}

function settleSoccer1x2(side: string, homeScore: number, awayScore: number): 'won' | 'lost' | 'push' {
  const s = side.toLowerCase().trim();
  if (homeScore === awayScore) return s === 'draw' || s === 'x' ? 'won' : 'lost';
  if (homeScore > awayScore) return s === 'home' || s === '1' ? 'won' : 'lost';
  return s === 'away' || s === '2' ? 'won' : 'lost';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured", results: [] }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = await getApiKey(supabaseUrl, serviceRoleKey);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured", results: [] }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json() as SettlementRequest;
    if (!body.picks || !Array.isArray(body.picks)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: picks array required", results: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: SettlementResult[] = [];
    const now = new Date().toISOString();

    for (const pick of body.picks) {
      const scoreData = await fetchEventScores(pick.sportKey, pick.eventId, apiKey);

      if (!scoreData) {
        // Game not completed or scores unavailable — leave pending
        results.push({
          id: pick.id,
          result: 'void',
          finalScore: 'N/A',
          settledAt: now,
          source: 'The Odds API (scores unavailable)',
        });
        continue;
      }

      const { homeScore, awayScore } = scoreData;
      let result: 'won' | 'lost' | 'push' | 'void';

      const marketLower = pick.market.toLowerCase();
      if (marketLower === 'moneyline' || marketLower === 'h2h') {
        result = settleMoneyline(pick.isHome, homeScore, awayScore);
      } else if (marketLower === 'spread' || marketLower === 'spreads' || marketLower === 'handicap') {
        const line = parseFloat(pick.line.replace(/[^0-9.-]/g, ''));
        result = isNaN(line) ? 'void' : settleSpread(pick.isHome, homeScore, awayScore, line);
      } else if (marketLower === 'total' || marketLower === 'totals') {
        const totalLine = parseFloat(pick.line.replace(/[^0-9.]/g, ''));
        result = isNaN(totalLine) ? 'void' : settleTotal(pick.side, homeScore, awayScore, totalLine);
      } else if (marketLower === '1x2') {
        result = settleSoccer1x2(pick.side, homeScore, awayScore);
      } else {
        result = 'void';
      }

      results.push({
        id: pick.id,
        result,
        finalScore: `${awayScore}-${homeScore}`,
        settledAt: now,
        source: 'The Odds API (verified final scores)',
      });
    }

    return new Response(
      JSON.stringify({ results, timestamp: now }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const sanitized = err instanceof Error ? err.message.replace(/api[_-]?key[^&]*/gi, "***") : "Internal server error";
    return new Response(
      JSON.stringify({ error: sanitized, results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
