import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { corsHeaders, jsonResponse, terminalAuthorized, rateLimited, readJson } from "../_shared/terminal.ts";

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

  const limited = rateLimited(req);
  if (limited) return limited;

  try {
    if (!terminalAuthorized(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "POST required" }, 405);
    }

    if (!Deno.env.get("ANTHROPIC_API_KEY")) {
      return jsonResponse({ error: "AI Research needs the ANTHROPIC_API_KEY secret on this function." }, 503);
    }

    const parsed = await readJson<{ picks?: PickInput[] }>(req);
    if ("error" in parsed) return parsed.error;
    const { picks } = parsed.body;
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
        console.error(`ai-analysis: Claude API ${claudeRes.status}`);
        results.push(fallbackResult(pick.id));
        continue;
      }

      const claudeData = await claudeRes.json();
      const text =
        claudeData.content?.[0]?.text ?? "";

      const research = parseResearchResponse(pick.id, text);
      results.push(research);

      // Cache result — surface a write failure so it can't rot silently again.
      const { error: cacheErr } = await serviceClient.from("ai_research").insert({
        pick_id: pick.id,
        matchup: pick.matchup,
        league: pick.league,
        market: pick.market,
        side: pick.side,
        summary: research.summary,
        key_factors: research.key_factors,
        risk_flags: research.risk_flags,
        verdict: research.verdict,
        confidence: research.confidence,
        sources: research.sources,
      });
      if (cacheErr) console.error("ai-analysis: cache insert failed —", cacheErr.message);
    }

    return jsonResponse({ results });
  } catch (err) {
    console.error("ai-analysis:", err);
    return jsonResponse(
      { error: "Internal error" },
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
