import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, x-terminal-key",
};

// Single-user terminal — access gated by one shared code in the x-terminal-key
// header, checked against the TERMINAL_ACCESS_KEY secret.
function terminalAuthorized(req: Request): boolean {
  const expected = Deno.env.get("TERMINAL_ACCESS_KEY") ?? "312593";
  return req.headers.get("x-terminal-key") === expected;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function envOrThrow(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret: ${name}`);
  return v;
}

interface PickInput {
  id: string;
  matchup: string;
  league: string;
  market: string;
  side: string;
  startTime: string;
}

interface ResearchResult {
  pick_id: string;
  summary: string;
  key_factors: string[];
  risk_flags: string[];
  verdict: "supports" | "neutral" | "against";
  confidence: number;
  sources: string[];
}

const CACHE_HOURS = 6;
const MAX_PICKS = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!terminalAuthorized(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "POST required" }, 405);
    }

    const { picks } = (await req.json()) as { picks: PickInput[] };
    if (!picks || !Array.isArray(picks) || picks.length === 0) {
      return jsonResponse({ error: "picks array required" }, 400);
    }

    const limitedPicks = picks.slice(0, MAX_PICKS);
    const results: ResearchResult[] = [];

    // Check cache first
    const cutoff = new Date(
      Date.now() - CACHE_HOURS * 60 * 60 * 1000
    ).toISOString();

    const serviceClient = createClient(
      envOrThrow("SUPABASE_URL"),
      envOrThrow("SUPABASE_SERVICE_ROLE_KEY")
    );

    for (const pick of limitedPicks) {
      // Try cache
      const { data: cached } = await serviceClient
        .from("ai_research")
        .select("*")
        .eq("pick_id", pick.id)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        results.push({
          pick_id: cached.pick_id,
          summary: cached.summary,
          key_factors: cached.key_factors,
          risk_flags: cached.risk_flags,
          verdict: cached.verdict,
          confidence: cached.confidence,
          sources: cached.sources,
        });
        continue;
      }

      // Call Claude for research
      const anthropicKey = envOrThrow("ANTHROPIC_API_KEY");
      const prompt = buildResearchPrompt(pick);

      const claudeRes = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-5",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      if (!claudeRes.ok) {
        const errText = await claudeRes.text();
        console.error(`Claude API error: ${claudeRes.status} ${errText}`);
        results.push(fallbackResult(pick.id));
        continue;
      }

      const claudeData = await claudeRes.json();
      const text =
        claudeData.content?.[0]?.text ?? "";

      const parsed = parseResearchResponse(pick.id, text);
      results.push(parsed);

      // Cache result
      await serviceClient.from("ai_research").insert({
        pick_id: pick.id,
        matchup: pick.matchup,
        league: pick.league,
        market: pick.market,
        side: pick.side,
        summary: parsed.summary,
        key_factors: parsed.key_factors,
        risk_flags: parsed.risk_flags,
        verdict: parsed.verdict,
        confidence: parsed.confidence,
        sources: parsed.sources,
      });
    }

    return jsonResponse({ results });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});

function buildResearchPrompt(pick: PickInput): string {
  return `You are a sports research analyst. Analyze this upcoming matchup and provide an independent assessment.

Matchup: ${pick.matchup}
League: ${pick.league}
Market: ${pick.market}
Side being considered: ${pick.side}
Start time: ${pick.startTime}

Research these factors:
1. Recent team/player form (last 5-10 games)
2. Key injuries and lineup changes
3. Rest days and schedule fatigue
4. Head-to-head history
5. Motivation factors (playoff implications, rivalries, etc.)
6. Weather/venue factors if applicable

IMPORTANT: Do NOT invent statistics. If you don't know a specific stat, say so. Only cite things you are confident about.

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "summary": "2-3 sentence assessment of whether the selected side has value",
  "key_factors": ["factor 1", "factor 2", "factor 3"],
  "risk_flags": ["risk 1", "risk 2"],
  "verdict": "supports" or "neutral" or "against",
  "confidence": 0.0 to 1.0,
  "sources": ["source description 1", "source description 2"]
}`;
}

function parseResearchResponse(
  pickId: string,
  text: string
): ResearchResult {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      pick_id: pickId,
      summary: String(parsed.summary ?? "Analysis unavailable"),
      key_factors: Array.isArray(parsed.key_factors)
        ? parsed.key_factors.map(String)
        : [],
      risk_flags: Array.isArray(parsed.risk_flags)
        ? parsed.risk_flags.map(String)
        : [],
      verdict: ["supports", "neutral", "against"].includes(parsed.verdict)
        ? parsed.verdict
        : "neutral",
      confidence:
        typeof parsed.confidence === "number"
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.5,
      sources: Array.isArray(parsed.sources)
        ? parsed.sources.map(String)
        : [],
    };
  } catch {
    return fallbackResult(pickId);
  }
}

function fallbackResult(pickId: string): ResearchResult {
  return {
    pick_id: pickId,
    summary:
      "AI research could not be completed for this pick. Manual review recommended.",
    key_factors: [],
    risk_flags: ["Research unavailable"],
    verdict: "neutral",
    confidence: 0,
    sources: [],
  };
}
