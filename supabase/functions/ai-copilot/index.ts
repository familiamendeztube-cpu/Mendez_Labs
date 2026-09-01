// Edge function: ai-copilot
// The conversational assistant for the terminal. Takes the chat history plus a
// snapshot of the operator's real state (Alpaca account, open positions,
// today's sports picks, bankroll) and answers questions grounded in those
// numbers. Advice only — it never places a trade or a bet.

import { corsHeaders, jsonResponse, terminalAuthorized, rateLimited, readJson } from "../_shared/terminal.ts";

// Flagship model for the advisor. Swap to "claude-opus-5" for maximum depth
// (slower), or "claude-haiku-4-5-20251001" for the fastest replies.
const COPILOT_MODEL = "claude-sonnet-5";
const MAX_TURNS = 16; // trailing conversation turns sent to the model

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonResponse(
        { error: "The assistant needs the ANTHROPIC_API_KEY secret set on this function." },
        503,
      );
    }

    const parsed = await readJson<{
      messages?: ChatMessage[];
      context?: Record<string, unknown>;
      image?: { media_type: string; data: string } | null;
    }>(req);
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) {
      return jsonResponse({ error: "messages array required" }, 400);
    }

    const trimmed: Array<{ role: "user" | "assistant"; content: unknown }> = messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-MAX_TURNS)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    // Guarantee the model gets a user turn last.
    if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== "user") {
      return jsonResponse({ error: "last message must be from the user" }, 400);
    }

    // Attach an uploaded image to the final user turn as a vision block.
    // ~6.6M base64 chars ≈ 4.9 MB decoded, just under Anthropic's 5 MB limit.
    const img = body.image;
    const mediaType = img?.media_type === "image/jpg" ? "image/jpeg" : img?.media_type;
    if (
      img && typeof img.data === "string" && img.data.length < 6_600_000 &&
      mediaType && /^image\/(png|jpeg|webp|gif)$/.test(mediaType)
    ) {
      const last = trimmed[trimmed.length - 1];
      last.content = [
        { type: "image", source: { type: "base64", media_type: mediaType, data: img.data } },
        { type: "text", text: typeof last.content === "string" ? last.content : "What do you make of this?" },
      ];
    }

    const system = buildSystemPrompt(body.context ?? {});

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: COPILOT_MODEL,
        max_tokens: 1200,
        system,
        messages: trimmed,
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error(`Claude API error ${claudeRes.status}: ${errText}`);
      return jsonResponse(
        { error: `The assistant is unavailable right now (${claudeRes.status}).` },
        502,
      );
    }

    const data = await claudeRes.json();
    const reply = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    return jsonResponse({
      reply: reply || "I don't have a response for that — try rephrasing.",
      model: COPILOT_MODEL,
    });
  } catch (err) {
    console.error("ai-copilot:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

function buildSystemPrompt(context: Record<string, unknown>): string {
  const snapshot = JSON.stringify(context, null, 2).slice(0, 12000);

  return `You are the Copilot inside "Mendez Labs" — a private, single-operator terminal that runs two things: a stock/ETF trading cockpit wired to the operator's Alpaca account, and a sports-betting research lab built on an Elo model.

You are talking to the operator directly. Be warm, direct, and concise — this is a conversation, not a report. It's fine to answer "how are you doing today?" like a person would, then pivot to their numbers.

## What you can see

Below is a live snapshot of the operator's real state, captured the moment they sent their message. Use these exact numbers. If a field is null, missing, or marked not-connected, say plainly that it isn't available yet rather than guessing.

\`\`\`json
${snapshot}
\`\`\`

## How to answer

- **"How are the trades doing?" / "are we up or down?"** — Read \`trading.account\` (equity vs lastEquity for the day, cash, buyingPower) and \`trading.positions\` (each with unrealized P/L). Give the bottom line first: up or down today, by how much, then the notable movers. If \`trading.connected\` is false, say the Alpaca account isn't connected yet and point them to Settings.
- **"Any bets you recommend today?" / "what should I play?"** — Look at \`sports.qualifiedPicks\`. If there are qualified picks, walk through them: matchup, side, the model's edge (evPercent), and your read. If the list is empty, say so directly — "nothing clears the bar today, I'd sit this one out" — and, if useful, mention what the closest misses were from \`sports.excludedSample\` and why they're excluded. Never manufacture a pick to have something to say.
- **"Should I bet on X?"** — Give a real opinion grounded in the model numbers and general knowledge, then note the risk. Always remind that stake sizing is quarter-Kelly and this is paper tracking unless they say otherwise.
- **Questions about the app** — You know it well: Trading (dashboard, signals, paper portfolio, performance), Sports Lab (Today's analysis, Top Five, Results, Bankroll, Intelligence), Settings. The only login is the master code. Explain features plainly.
- **If the model has no history** (\`sports.modelHealth.sampleSize\` is 0) — be honest that the Elo model is still cold and picks won't qualify until it has game history; don't oversell it.

## Hard rules

- You give advice and analysis. You do NOT place trades or bets, lock picks, or change settings — you have no way to, and you should tell the operator to do those actions themselves.
- Never invent statistics, prices, injury news, or results. If you're not sure, say so.
- This is the operator's own money and account. No hype, no false confidence. If the honest answer is "flat day, nothing to do," say that.
- Keep replies tight — a few sentences to a short paragraph unless they ask for depth.`;
}
