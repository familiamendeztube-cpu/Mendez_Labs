// Edge function: ai-picks
// Claude ranks the day's best five plays from the full slate — not just the
// ones that clear the strict Elo gates. It weighs model edge, market value,
// line quality and matchup context, and is told to return fewer than five (or
// none) when the board is thin. Advisory: the operator still locks the card.

import { corsHeaders, jsonResponse, terminalAuthorized, rateLimited, readJson } from "../_shared/terminal.ts";

const MODEL = "claude-sonnet-5";
const MAX_CANDIDATES = 60;

interface Candidate {
  eventId: string;
  matchup: string;
  league: string;
  market: string;
  side: string;
  americanOdds: number;
  evPercent: number | null;
  modelProbability: number | null;
  marketProbability: number | null;
  bookmakerCount: number;
  startTime: string;
  qualified: boolean;
  exclusionReason: string | null;
}

interface AiPick {
  eventId: string;
  side: string;
  market: string;
  rank: number;
  confidence: number;
  rationale: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const limited = rateLimited(req);
  if (limited) return limited;

  try {
    if (!terminalAuthorized(req)) return jsonResponse({ error: "Unauthorized" }, 401);
    if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonResponse({ error: "AI Select needs the ANTHROPIC_API_KEY secret on this function." }, 503);
    }

    const parsed = await readJson<{ candidates?: Candidate[]; bankroll?: number }>(req);
    if ("error" in parsed) return parsed.error;
    const { candidates, bankroll } = parsed.body;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return jsonResponse({ error: "candidates array required" }, 400);
    }

    const slate = candidates.slice(0, MAX_CANDIDATES);

    const prompt = `You are the head bettor for a small private sports fund. Below is today's full slate of model predictions. Pick the best FIVE plays for a five-leg card — or fewer if the board is thin, or none if there is genuinely no value.

Bankroll: $${bankroll ?? 100} (paper). Stakes are quarter-Kelly, capped at 1% per pick.

How to choose:
- Prefer plays with real edge: model probability meaningfully above market probability, positive EV after the vig, backed by 3+ books.
- A pick marked qualified:false is not disqualified from your card — the Elo model is still accumulating history so its gates are conservative. Use your own read of the value.
- Diversify: no two legs from the same game, at most two from one league unless the value is overwhelming.
- Avoid stale lines and coin-flip prices with no edge.
- If nothing has value, return an empty picks array and say so in the summary. Never pad the card.

Slate (JSON):
${JSON.stringify(slate)}

Respond with ONLY this JSON (no prose, no code fences):
{
  "summary": "2-3 sentences on the state of today's board and your overall read",
  "picks": [
    { "eventId": "<from slate>", "side": "<exact side from slate>", "market": "<exact market from slate>", "rank": 1, "confidence": 0.0-1.0, "rationale": "one sentence: why this play" }
  ]
}`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      console.error(`ai-picks: Claude API ${claudeRes.status}`);
      return jsonResponse({ error: `AI Select is unavailable right now (${claudeRes.status}).` }, 502);
    }

    const data = await claudeRes.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .trim();

    const aiResult = parsePicks(text);
    const norm = (s: string) => s.trim().toLowerCase();
    const validIds = new Set(slate.map((c) => `${c.eventId}|${norm(c.market)}|${norm(c.side)}`));
    const seen = new Set<string>();
    const picks = aiResult.picks
      .filter((p) => {
        const key = `${p.eventId}|${norm(p.market)}|${norm(p.side)}`;
        if (!validIds.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5);

    return jsonResponse({ summary: aiResult.summary, picks, model: MODEL });
  } catch (err) {
    console.error("ai-picks:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

function parsePicks(text: string): { summary: string; picks: AiPick[] } {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const json = JSON.parse(cleaned.slice(start, end + 1));
    return {
      summary: String(json.summary ?? "").slice(0, 600),
      picks: Array.isArray(json.picks)
        ? json.picks.map((p: Record<string, unknown>, i: number): AiPick => ({
            eventId: String(p.eventId ?? ""),
            side: String(p.side ?? ""),
            market: String(p.market ?? ""),
            rank: typeof p.rank === "number" ? p.rank : i + 1,
            confidence:
              typeof p.confidence === "number" ? Math.min(1, Math.max(0, p.confidence)) : 0.5,
            rationale: String(p.rationale ?? "").slice(0, 400),
          }))
        : [],
    };
  } catch {
    return { summary: "AI Select could not parse a response. Try again.", picks: [] };
  }
}
