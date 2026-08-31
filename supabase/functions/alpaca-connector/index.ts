import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

function alpacaHeaders(env: "paper" | "live") {
  const keyId =
    env === "paper"
      ? envOrThrow("ALPACA_PAPER_KEY_ID")
      : envOrThrow("ALPACA_LIVE_KEY_ID");
  const secret =
    env === "paper"
      ? envOrThrow("ALPACA_PAPER_SECRET")
      : envOrThrow("ALPACA_LIVE_SECRET");
  return {
    "APCA-API-KEY-ID": keyId,
    "APCA-API-SECRET-KEY": secret,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function alpacaBase(env: "paper" | "live") {
  return env === "paper"
    ? "https://paper-api.alpaca.markets"
    : "https://api.alpaca.markets";
}

const DATA_BASE = "https://data.alpaca.markets";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      envOrThrow("SUPABASE_URL"),
      envOrThrow("SUPABASE_ANON_KEY"),
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization") ?? "",
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/alpaca-connector\/?/, "");
    const searchParams = url.searchParams;
    const env = (searchParams.get("env") === "live" ? "live" : "paper") as
      | "paper"
      | "live";
    const headers = alpacaHeaders(env);
    const base = alpacaBase(env);

    // ── Route: GET account ──────────────────────────────────────────
    if (path === "account" && req.method === "GET") {
      const res = await fetch(`${base}/v2/account`, { headers });
      if (!res.ok)
        return jsonResponse(
          { error: `Alpaca ${res.status}: ${await res.text()}` },
          res.status
        );
      return jsonResponse(await res.json());
    }

    // ── Route: GET positions ────────────────────────────────────────
    if (path === "positions" && req.method === "GET") {
      const res = await fetch(`${base}/v2/positions`, { headers });
      if (!res.ok)
        return jsonResponse(
          { error: `Alpaca ${res.status}: ${await res.text()}` },
          res.status
        );
      return jsonResponse(await res.json());
    }

    // ── Route: GET quotes?symbols=SPY,QQQ ───────────────────────────
    if (path === "quotes" && req.method === "GET") {
      const symbols = searchParams.get("symbols") ?? "";
      if (!symbols) return jsonResponse({ error: "symbols required" }, 400);
      const res = await fetch(
        `${DATA_BASE}/v2/stocks/quotes/latest?symbols=${encodeURIComponent(symbols)}&feed=iex`,
        { headers }
      );
      if (!res.ok)
        return jsonResponse(
          { error: `Alpaca ${res.status}: ${await res.text()}` },
          res.status
        );
      return jsonResponse(await res.json());
    }

    // ── Route: GET bars?symbols=SPY&timeframe=1Day&start=...&end=... ─
    if (path === "bars" && req.method === "GET") {
      const symbols = searchParams.get("symbols") ?? "";
      const timeframe = searchParams.get("timeframe") ?? "1Day";
      const start = searchParams.get("start") ?? "";
      const end = searchParams.get("end") ?? "";
      if (!symbols) return jsonResponse({ error: "symbols required" }, 400);
      const qs = new URLSearchParams({ symbols, timeframe, feed: "iex" });
      if (start) qs.set("start", start);
      if (end) qs.set("end", end);
      qs.set("limit", "1000");
      const res = await fetch(`${DATA_BASE}/v2/stocks/bars?${qs}`, {
        headers,
      });
      if (!res.ok)
        return jsonResponse(
          { error: `Alpaca ${res.status}: ${await res.text()}` },
          res.status
        );
      return jsonResponse(await res.json());
    }

    // ── Route: POST orders ──────────────────────────────────────────
    if (path === "orders" && req.method === "POST") {
      if (env !== "paper")
        return jsonResponse(
          { error: "Live orders disabled — paper only" },
          403
        );
      const body = await req.json();
      const res = await fetch(`${base}/v2/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok)
        return jsonResponse(
          { error: `Alpaca ${res.status}: ${await res.text()}` },
          res.status
        );
      return jsonResponse(await res.json());
    }

    // ── Route: GET orders ───────────────────────────────────────────
    if (path === "orders" && req.method === "GET") {
      const status = searchParams.get("status") ?? "all";
      const limit = searchParams.get("limit") ?? "50";
      const res = await fetch(
        `${base}/v2/orders?status=${status}&limit=${limit}&direction=desc`,
        { headers }
      );
      if (!res.ok)
        return jsonResponse(
          { error: `Alpaca ${res.status}: ${await res.text()}` },
          res.status
        );
      return jsonResponse(await res.json());
    }

    // ── Route: GET portfolio-history?period=1M&timeframe=1D ────────
    if (path === "portfolio-history" && req.method === "GET") {
      const period = searchParams.get("period") ?? "1M";
      const timeframe = searchParams.get("timeframe") ?? "1D";
      const qs = new URLSearchParams({ period, timeframe });
      const res = await fetch(
        `${base}/v2/account/portfolio/history?${qs}`,
        { headers }
      );
      if (!res.ok)
        return jsonResponse(
          { error: `Alpaca ${res.status}: ${await res.text()}` },
          res.status
        );
      return jsonResponse(await res.json());
    }

    // ── Route: DELETE orders (cancel all open orders) ───────────────
    if (path === "orders" && req.method === "DELETE") {
      if (env !== "paper")
        return jsonResponse(
          { error: "Live order cancellation disabled — paper only" },
          403
        );
      const res = await fetch(`${base}/v2/orders`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok)
        return jsonResponse(
          { error: `Alpaca ${res.status}: ${await res.text()}` },
          res.status
        );
      const cancelled = await res.json().catch(() => []);
      return jsonResponse({
        cancelled: Array.isArray(cancelled) ? cancelled.length : 0,
      });
    }

    return jsonResponse({ error: `Unknown route: ${path}` }, 404);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
