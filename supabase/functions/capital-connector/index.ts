// Edge function: capital-connector
// Proxies the operator's Capital.com account (CFDs). Capital.com uses a
// session-token scheme rather than per-request signing: you exchange an API
// key + credentials for a CST / X-SECURITY-TOKEN pair that expires after ~10
// minutes of inactivity. Those credentials must never reach the browser, so
// the whole exchange happens here and the tokens are cached per isolate.
//
// Secrets: CAPITAL_API_KEY, CAPITAL_IDENTIFIER (login email),
//          CAPITAL_PASSWORD (the API key's password).
// Live orders additionally require CAPITAL_ORDERS_ENABLED === "true".

import { corsHeaders, jsonResponse, terminalAuthorized, rateLimited } from "../_shared/terminal.ts";

const LIVE = "https://api-capital.backend-capital.com";
const DEMO = "https://demo-api-capital.backend-capital.com";

function envOrThrow(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret: ${name}`);
  return v;
}

// ── Session cache ───────────────────────────────────────────────────────────
// Capital.com sessions die after ~10 minutes idle. Re-authenticating on every
// request would burn the 1-per-second /session rate limit, so cache per
// environment and refresh a minute before expiry.
interface Session { cst: string; token: string; expires: number }
const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 9 * 60 * 1000;

async function getSession(base: string): Promise<Session> {
  const cached = sessions.get(base);
  if (cached && cached.expires > Date.now()) return cached;

  const res = await fetch(`${base}/api/v1/session`, {
    method: "POST",
    headers: {
      "X-CAP-API-KEY": envOrThrow("CAPITAL_API_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifier: envOrThrow("CAPITAL_IDENTIFIER"),
      password: envOrThrow("CAPITAL_PASSWORD"),
      encryptedPassword: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Capital.com login failed (${res.status}): ${text.slice(0, 160)}`);
  }

  const cst = res.headers.get("CST");
  const token = res.headers.get("X-SECURITY-TOKEN");
  if (!cst || !token) throw new Error("Capital.com did not return session tokens");

  const session = { cst, token, expires: Date.now() + SESSION_TTL_MS };
  sessions.set(base, session);
  return session;
}

async function capital<T>(base: string, path: string, method = "GET", body?: unknown): Promise<T> {
  const doCall = async (s: Session) =>
    fetch(`${base}/api/v1${path}`, {
      method,
      headers: {
        CST: s.cst,
        "X-SECURITY-TOKEN": s.token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let res = await doCall(await getSession(base));
  // A stale session comes back 401 — drop it and retry once with a fresh one.
  if (res.status === 401) {
    sessions.delete(base);
    res = await doCall(await getSession(base));
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Capital.com ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// Capital.com identifies instruments by "epic". These are the common ones;
// anything else can be passed through directly from the UI.
const DEFAULT_EPICS = ["US500", "US100", "AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "META"];

const RESOLUTION: Record<string, string> = {
  "1Min": "MINUTE", "5Min": "MINUTE_5", "15Min": "MINUTE_15",
  "1Hour": "HOUR", "1Day": "DAY",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const limited = rateLimited(req, 90);
  if (limited) return limited;

  try {
    if (!terminalAuthorized(req)) return jsonResponse({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/capital-connector\/?/, "");
    const params = url.searchParams;
    const isDemo = params.get("env") !== "live";
    const base = isDemo ? DEMO : LIVE;

    // ── Account ────────────────────────────────────────────────────────
    if (path === "account" && req.method === "GET") {
      const data = await capital<{ accounts: Array<Record<string, unknown>> }>(base, "/accounts");
      const list = data.accounts ?? [];
      const acct = (list.find((a) => a.preferred) ?? list[0]) as
        | { accountId?: string; accountName?: string; currency?: string; status?: string;
            balance?: { balance?: number; deposit?: number; profitLoss?: number; available?: number } }
        | undefined;
      const b = acct?.balance ?? {};
      const equity = b.balance ?? 0;
      const pl = b.profitLoss ?? 0;
      return jsonResponse({
        broker: "capital",
        id: acct?.accountId ?? "",
        account_number: acct?.accountName ?? "",
        status: acct?.status ?? "",
        currency: acct?.currency ?? "USD",
        equity: String(equity),
        // Capital reports open P/L directly, so yesterday's close is derivable.
        last_equity: String(equity - pl),
        cash: String(b.available ?? 0),
        buying_power: String(b.available ?? 0),
        portfolio_value: String(equity),
      });
    }

    // ── Positions ──────────────────────────────────────────────────────
    if (path === "positions" && req.method === "GET") {
      const data = await capital<{ positions: Array<{ position: Record<string, unknown>; market: Record<string, unknown> }> }>(base, "/positions");
      return jsonResponse(
        (data.positions ?? []).map(({ position: p, market: m }) => {
          const size = Number(p.size ?? 0);
          const open = Number(p.level ?? 0);
          const bid = Number(m.bid ?? 0);
          const offer = Number(m.offer ?? 0);
          const mid = bid && offer ? (bid + offer) / 2 : bid || offer;
          const upl = Number(p.upl ?? 0);
          const basis = open * size;
          return {
            asset_id: String(p.dealId ?? ""),
            symbol: String(m.epic ?? m.instrumentName ?? ""),
            qty: String(size),
            avg_entry_price: String(open),
            market_value: String(mid * size),
            cost_basis: String(basis),
            unrealized_pl: String(upl),
            unrealized_plpc: String(basis ? upl / basis : 0),
            current_price: String(mid),
            change_today: "0",
            side: String(p.direction ?? "BUY").toLowerCase() === "sell" ? "short" : "long",
          };
        }),
      );
    }

    // ── Quotes ─────────────────────────────────────────────────────────
    if (path === "quotes" && req.method === "GET") {
      const epics = (params.get("symbols") ?? DEFAULT_EPICS.join(",")).split(",").filter(Boolean);
      const data = await capital<{ marketDetails: Array<{ instrument?: { epic?: string }; snapshot?: Record<string, unknown> }> }>(
        base, `/markets?epics=${encodeURIComponent(epics.join(","))}`,
      );
      const quotes: Record<string, { ap: number; bp: number; as: number; bs: number; t: string }> = {};
      for (const d of data.marketDetails ?? []) {
        const epic = d.instrument?.epic;
        const s = d.snapshot ?? {};
        if (!epic) continue;
        quotes[epic] = {
          ap: Number(s.offer ?? 0),
          bp: Number(s.bid ?? 0),
          as: 0,
          bs: 0,
          t: new Date().toISOString(),
        };
      }
      return jsonResponse({ quotes });
    }

    // ── Candles ────────────────────────────────────────────────────────
    if (path === "bars" && req.method === "GET") {
      const epic = (params.get("symbols") ?? "US500").split(",")[0];
      const resolution = RESOLUTION[params.get("timeframe") ?? "5Min"] ?? "MINUTE_5";
      const data = await capital<{ prices: Array<Record<string, { bid?: number; ask?: number }> & { snapshotTime?: string; lastTradedVolume?: number }> }>(
        base, `/prices/${encodeURIComponent(epic)}?resolution=${resolution}&max=200`,
      );
      const mid = (p?: { bid?: number; ask?: number }) => {
        const b = Number(p?.bid ?? 0); const a = Number(p?.ask ?? 0);
        return b && a ? (b + a) / 2 : b || a;
      };
      const bars = (data.prices ?? []).map((r) => ({
        t: String(r.snapshotTime ?? new Date().toISOString()),
        o: mid(r.openPrice), h: mid(r.highPrice), l: mid(r.lowPrice), c: mid(r.closePrice),
        v: Number(r.lastTradedVolume ?? 0), n: 0, vw: mid(r.closePrice),
      }));
      return jsonResponse({ bars: { [epic]: bars } });
    }

    // ── Orders: list (open positions + resting working orders) ─────────
    if (path === "orders" && req.method === "GET") {
      const wo = await capital<{ workingOrders: Array<{ workingOrderData: Record<string, unknown>; market: Record<string, unknown> }> }>(
        base, "/workingorders",
      ).catch(() => ({ workingOrders: [] }));
      return jsonResponse(
        (wo.workingOrders ?? []).map(({ workingOrderData: o, market: m }) => ({
          id: String(o.dealId ?? ""),
          client_order_id: String(o.dealId ?? ""),
          status: "new",
          symbol: String(m.epic ?? ""),
          qty: String(o.orderSize ?? 0),
          filled_qty: "0",
          side: String(o.direction ?? "").toLowerCase(),
          type: String(o.orderType ?? "limit").toLowerCase(),
          time_in_force: "gtc",
          limit_price: o.orderLevel != null ? String(o.orderLevel) : null,
          stop_price: null,
          filled_avg_price: null,
          submitted_at: String(o.createdDate ?? new Date().toISOString()),
          filled_at: null,
          created_at: String(o.createdDate ?? new Date().toISOString()),
        })),
      );
    }

    // ── Orders: place (double-gated on live) ───────────────────────────
    if (path === "orders" && req.method === "POST") {
      if (!isDemo && Deno.env.get("CAPITAL_ORDERS_ENABLED") !== "true") {
        return jsonResponse(
          { error: "Live Capital.com orders are disabled. Set CAPITAL_ORDERS_ENABLED to 'true' to place real orders." },
          403,
        );
      }
      let payload: { symbol?: string; qty?: number; side?: string; type?: string; limit_price?: number; stop_price?: number };
      try { payload = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }
      const { symbol, qty, side, type, limit_price, stop_price } = payload;
      if (!symbol || !qty || !side) return jsonResponse({ error: "symbol, qty and side are required" }, 400);

      const direction = side === "sell" ? "SELL" : "BUY";
      const result = type === "limit" && limit_price
        ? await capital<{ dealReference?: string }>(base, "/workingorders", "POST", {
            epic: symbol, direction, size: qty, level: limit_price, type: "LIMIT",
            ...(stop_price ? { stopLevel: stop_price } : {}),
          })
        : await capital<{ dealReference?: string }>(base, "/positions", "POST", {
            epic: symbol, direction, size: qty,
            ...(stop_price ? { stopLevel: stop_price } : {}),
          });

      return jsonResponse({
        id: result?.dealReference ?? "",
        client_order_id: result?.dealReference ?? "",
        status: "accepted",
        symbol, qty: String(qty), filled_qty: "0", side,
        type: type ?? "market", time_in_force: "gtc",
        limit_price: limit_price ? String(limit_price) : null,
        stop_price: stop_price ? String(stop_price) : null,
        filled_avg_price: null,
        submitted_at: new Date().toISOString(),
        filled_at: null,
        created_at: new Date().toISOString(),
      });
    }

    // ── Orders: cancel every resting order (kill switch) ───────────────
    if (path === "orders" && req.method === "DELETE") {
      if (!isDemo && Deno.env.get("CAPITAL_ORDERS_ENABLED") !== "true") {
        return jsonResponse({ error: "Live Capital.com order cancellation disabled. Set CAPITAL_ORDERS_ENABLED to enable." }, 403);
      }
      const wo = await capital<{ workingOrders: Array<{ workingOrderData: { dealId?: string } }> }>(base, "/workingorders")
        .catch(() => ({ workingOrders: [] }));
      let cancelled = 0;
      for (const o of wo.workingOrders ?? []) {
        const id = o.workingOrderData?.dealId;
        if (!id) continue;
        try { await capital(base, `/workingorders/${id}`, "DELETE"); cancelled++; } catch { /* keep going */ }
      }
      return jsonResponse({ cancelled });
    }

    // ── Portfolio history — Capital.com exposes activity, not an equity
    //    curve, so the app renders an honest "no history" state.
    if (path === "portfolio-history" && req.method === "GET") {
      return jsonResponse({ timestamp: [], equity: [], profit_loss: [], profit_loss_pct: [] });
    }

    if (path === "status" && req.method === "GET") {
      await capital(base, "/accounts");
      return jsonResponse({ connected: true, broker: "capital", env: isDemo ? "demo" : "live" });
    }

    return jsonResponse({ error: `Unknown route: ${path}` }, 404);
  } catch (err) {
    console.error("capital-connector:", err);
    const msg = err instanceof Error && (err.message.startsWith("Missing secret:") || err.message.startsWith("Capital.com"))
      ? err.message
      : "Internal error";
    return jsonResponse({ error: msg }, 500);
  }
});
