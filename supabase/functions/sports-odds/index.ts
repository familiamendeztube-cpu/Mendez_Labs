// Edge function: sports-odds
// Proxies The Odds API (the-odds-api.com) server-side so the API key
// never reaches the browser. Returns normalized odds for upcoming games.
// The API key is stored in the api_keys table and read with the service role key.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

async function getApiKey(): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "THE_ODDS_API_KEY not configured", provider: "the-odds-api" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL(req.url);
    const params = new URLSearchParams(url.searchParams);
    params.set("apiKey", apiKey);

    // Default: upcoming NFL games with all markets
    const sport = params.get("sport") || "americanfootball_nfl";
    params.delete("sport");

    const event = params.get("event");
    params.delete("event");

    const endpoint = event
      ? `/sports/${sport}/events/${event}/odds`
      : `/sports/${sport}/odds`;

    const regions = params.get("regions") || "us";
    params.set("regions", regions);

    const markets = params.get("markets") || "h2h,spreads,totals";
    params.set("markets", markets);

    const oddsFormat = params.get("oddsFormat") || "american";
    params.set("oddsFormat", oddsFormat);

    const apiUrl = `${ODDS_API_BASE}${endpoint}?${params.toString()}`;

    const response = await fetch(apiUrl, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `The Odds API returned ${response.status}`,
          details: errorText,
          provider: "the-odds-api",
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ data, provider: "the-odds-api", timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error", provider: "the-odds-api" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
