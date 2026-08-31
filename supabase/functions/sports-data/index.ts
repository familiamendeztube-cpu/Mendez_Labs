// Edge function: sports-data
// Proxies API-Sports (api-sports.io) server-side so the API key
// never reaches the browser. Returns normalized games, teams, and stats.
// The API key is stored in the api_keys table and read with the service role key.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// API-Sports base URLs per sport
const API_SPORTS_BASE: Record<string, string> = {
  nba: "https://v1.basketball.api-sports.io",
  nfl: "https://v1.american-football.api-sports.io",
  mlb: "https://v1.baseball.api-sports.io",
  nhl: "https://v1.hockey.api-sports.io",
  soccer: "https://v3.football.api-sports.io",
};

async function getApiKey(): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/api_keys?name=eq.API_SPORTS_KEY&select=value`, {
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
        JSON.stringify({ error: "API_SPORTS_KEY not configured", provider: "api-sports" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL(req.url);
    const sport = (url.searchParams.get("sport") || "nba").toLowerCase();
    const endpoint = url.searchParams.get("endpoint") || "games";

    const baseUrl = API_SPORTS_BASE[sport];
    if (!baseUrl) {
      return new Response(
        JSON.stringify({ error: `Unsupported sport: ${sport}`, provider: "api-sports" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build the API-Sports URL with all remaining query params
    const params = new URLSearchParams(url.searchParams);
    params.delete("sport");
    params.delete("endpoint");

    const apiUrl = params.toString()
      ? `${baseUrl}/${endpoint}?${params.toString()}`
      : `${baseUrl}/${endpoint}`;

    const response = await fetch(apiUrl, {
      headers: {
        "x-apisports-key": apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `API-Sports returned ${response.status}`,
          details: errorText,
          provider: "api-sports",
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ data, provider: "api-sports", sport, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error", provider: "api-sports" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
