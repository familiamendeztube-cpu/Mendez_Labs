// Edge function: kraken-connector
// Proxies the operator's Kraken account. Kraken's private endpoints require an
// HMAC-SHA512 request signature computed from the API secret, so every private
// call has to happen server-side — the secret never reaches the browser.
//
// Secrets: KRAKEN_API_KEY, KRAKEN_API_SECRET (base64, as Kraken issues it).
// Live orders additionally require KRAKEN_ORDERS_ENABLED === "true".

import { corsHeaders, jsonResponse, terminalAuthorized, rateLimited } from "../_shared/terminal.ts";

const API = "https://api.kraken.com";

function envOrThrow(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret: ${name}`);
  return v;
}

/**
 * Kraken's signature scheme:
 *   HMAC-SHA512( path_bytes || SHA256(nonce || postdata), base64decode(secret) )
 */
async function krakenSign(path: string, nonce: string, postData: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const sha256 = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(nonce + postData)));
  const pathBytes = enc.encode(path);
  const message = new Uint8Array(pathBytes.length + sha256.length);
  message.set(pathBytes, 0);
  message.set(sha256, pathBytes.length);

  const keyBytes = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, message);
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function krakenPrivate(endpoint: string, params: Record<string, string> = {}) {
  const key = envOrThrow("KRAKEN_API_KEY");
  const secret = envOrThrow("KRAKEN_API_SECRET");
  const path = `/0/private/${endpoint}`;
  const nonce = String(Date.now() * 1000);
  const body = new URLSearchParams({ nonce, ...params }).toString();
  const signature = await krakenSign(path, nonce, body, secret);

  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "API-Key": key,
      "API-Sign": signature,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "MendezLabs/1.0",
    },
    body,
  });

  const json = await res.json();
  if (json.error?.length) throw new Error(`Kraken: ${json.error.join("; ")}`);
  return json.result;
}

async function krakenPublic(endpoint: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/0/public/${endpoint}${qs ? `?${qs}` : ""}`);
  const json = await res.json();
  if (json.error?.length) throw new Error(`Kraken: ${json.error.join("; ")}`);
  return json.result;
}

// Kraken uses legacy asset codes (XXBT, ZUSD). Normalize for display.
function displaySymbol(code: string): string {
  const map: Record<string, string> = {
    XXBT: "BTC", XBT: "BTC", XETH: "ETH", ZUSD: "USD", ZEUR: "EUR",
    XXRP: "XRP", XLTC: "LTC", XXDG: "DOGE",
  };
  return map[code] ?? code;
}

const DEFAULT_PAIRS = ["XBTUSD", "ETHUSD", "SOLUSD", "XRPUSD", "ADAUSD", "DOTUSD", "LINKUSD", "AVAXUSD"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const limited = rateLimited(req, 90);
  if (limited) return limited;

  try {
    if (!terminalAuthorized(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/kraken-connector\/?/, "");
    const params = url.searchParams;

    // ── Account: balances + equity, mapped to the shared broker shape ──
    if (path === "account" && req.method === "GET") {
      const [balances, tradeBalance] = await Promise.all([
        krakenPrivate("Balance"),
        krakenPrivate("TradeBalance", { asset: "ZUSD" }).catch(() => null),
      ]);
      const cash = parseFloat(balances?.ZUSD ?? "0");
      const equity = tradeBalance ? parseFloat(tradeBalance.eb ?? "0") : cash;
      return jsonResponse({
        broker: "kraken",
        currency: "USD",
        equity: String(equity),
        cash: String(cash),
        buying_power: String(tradeBalance ? parseFloat(tradeBalance.tb ?? String(cash)) : cash),
        portfolio_value: String(equity),
        balances: Object.fromEntries(
          Object.entries(balances ?? {}).map(([k, v]) => [displaySymbol(k), v]),
        ),
      });
    }

    // ── Positions: non-zero, non-USD balances valued at last trade price ──
    if (path === "positions" && req.method === "GET") {
      const balances = await krakenPrivate("Balance");
      const holdings = Object.entries(balances ?? {})
        .map(([code, amt]) => ({ code, symbol: displaySymbol(code), qty: parseFloat(amt as string) }))
        .filter((h) => h.qty > 0.00000001 && !["USD", "EUR"].includes(h.symbol));

      if (holdings.length === 0) return jsonResponse([]);

      const pairs = holdings.map((h) => `${h.symbol === "BTC" ? "XBT" : h.symbol}USD`);
      const tick = await krakenPublic("Ticker", { pair: pairs.join(",") }).catch(() => ({}));
      const priceFor = (sym: string): number => {
        const want = sym === "BTC" ? "XBT" : sym;
        for (const [k, v] of Object.entries(tick ?? {})) {
          if (k.includes(want)) return parseFloat((v as { c: string[] }).c?.[0] ?? "0");
        }
        return 0;
      };

      return jsonResponse(
        holdings.map((h) => {
          const price = priceFor(h.symbol);
          const value = h.qty * price;
          return {
            symbol: h.symbol,
            qty: String(h.qty),
            avg_entry_price: "0",
            market_value: String(value),
            cost_basis: "0",
            unrealized_pl: "0",
            unrealized_plpc: "0",
            current_price: String(price),
            change_today: "0",
            side: "long",
          };
        }),
      );
    }

    // ── Quotes (public) ──
    if (path === "quotes" && req.method === "GET") {
      const symbols = (params.get("symbols") ?? DEFAULT_PAIRS.join(",")).split(",");
      const pairs = symbols.map((s) => (s === "BTC" ? "XBTUSD" : s.endsWith("USD") ? s : `${s}USD`));
      const tick = await krakenPublic("Ticker", { pair: pairs.join(",") });
      const quotes: Record<string, { ap: number; bp: number; as: number; bs: number; t: string }> = {};
      for (const [pair, v] of Object.entries(tick ?? {})) {
        const d = v as { a: string[]; b: string[]; c: string[] };
        const label = displaySymbol(pair.replace(/USD$|ZUSD$/, "").replace(/^X/, "X"));
        const clean = label.replace(/^XX?BT$/, "BTC").replace(/^X/, "");
        quotes[clean || pair] = {
          ap: parseFloat(d.a?.[0] ?? "0"),
          bp: parseFloat(d.b?.[0] ?? "0"),
          as: parseFloat(d.a?.[2] ?? "0"),
          bs: parseFloat(d.b?.[2] ?? "0"),
          t: new Date().toISOString(),
        };
      }
      return jsonResponse({ quotes });
    }

    // ── OHLC candles (public) ──
    if (path === "bars" && req.method === "GET") {
      const sym = params.get("symbols") ?? "XBTUSD";
      const pair = sym === "BTC" ? "XBTUSD" : sym.endsWith("USD") ? sym : `${sym}USD`;
      const interval = params.get("interval") ?? "5";
      const ohlc = await krakenPublic("OHLC", { pair, interval });
      const series = Object.entries(ohlc ?? {}).find(([k]) => k !== "last")?.[1] as unknown[][] | undefined;
      const bars = (series ?? []).map((r) => ({
        t: new Date((r[0] as number) * 1000).toISOString(),
        o: parseFloat(r[1] as string),
        h: parseFloat(r[2] as string),
        l: parseFloat(r[3] as string),
        c: parseFloat(r[4] as string),
        v: parseFloat(r[6] as string),
        n: 0,
        vw: parseFloat(r[5] as string),
      }));
      return jsonResponse({ bars: { [sym]: bars } });
    }

    // ── Orders: list ──
    if (path === "orders" && req.method === "GET") {
      const status = params.get("status") ?? "all";
      const open = await krakenPrivate("OpenOrders").catch(() => ({ open: {} }));
      const rows: unknown[] = [];
      for (const [id, o] of Object.entries(open?.open ?? {})) {
        const d = o as { descr: { pair: string; type: string; ordertype: string; price: string }; vol: string; vol_exec: string; status: string; opentm: number };
        rows.push({
          id,
          client_order_id: id,
          status: d.status,
          symbol: d.descr?.pair ?? "",
          qty: d.vol,
          filled_qty: d.vol_exec,
          side: d.descr?.type ?? "",
          type: d.descr?.ordertype ?? "",
          time_in_force: "gtc",
          limit_price: d.descr?.price ?? null,
          stop_price: null,
          filled_avg_price: null,
          submitted_at: new Date((d.opentm ?? 0) * 1000).toISOString(),
          filled_at: null,
          created_at: new Date((d.opentm ?? 0) * 1000).toISOString(),
        });
      }
      if (status === "open") return jsonResponse(rows);

      const closed = await krakenPrivate("ClosedOrders").catch(() => ({ closed: {} }));
      for (const [id, o] of Object.entries(closed?.closed ?? {}).slice(0, 40)) {
        const d = o as { descr: { pair: string; type: string; ordertype: string; price: string }; vol: string; vol_exec: string; status: string; opentm: number; closetm: number; price: string };
        rows.push({
          id,
          client_order_id: id,
          status: d.status,
          symbol: d.descr?.pair ?? "",
          qty: d.vol,
          filled_qty: d.vol_exec,
          side: d.descr?.type ?? "",
          type: d.descr?.ordertype ?? "",
          time_in_force: "gtc",
          limit_price: d.descr?.price ?? null,
          stop_price: null,
          filled_avg_price: d.price ?? null,
          submitted_at: new Date((d.opentm ?? 0) * 1000).toISOString(),
          filled_at: d.closetm ? new Date(d.closetm * 1000).toISOString() : null,
          created_at: new Date((d.opentm ?? 0) * 1000).toISOString(),
        });
      }
      return jsonResponse(rows);
    }

    // ── Orders: place (real money — double-gated) ──
    if (path === "orders" && req.method === "POST") {
      if (Deno.env.get("KRAKEN_ORDERS_ENABLED") !== "true") {
        return jsonResponse(
          { error: "Kraken orders are disabled. Set the KRAKEN_ORDERS_ENABLED secret to 'true' to place real orders." },
          403,
        );
      }
      let payload: { symbol?: string; qty?: number; side?: string; type?: string; limit_price?: number };
      try {
        payload = await req.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }
      const { symbol, qty, side, type, limit_price } = payload;
      if (!symbol || !qty || !side) {
        return jsonResponse({ error: "symbol, qty and side are required" }, 400);
      }
      const pair = symbol === "BTC" ? "XBTUSD" : symbol.endsWith("USD") ? symbol : `${symbol}USD`;
      const orderParams: Record<string, string> = {
        pair,
        type: side === "sell" ? "sell" : "buy",
        ordertype: type === "limit" ? "limit" : "market",
        volume: String(qty),
      };
      if (type === "limit" && limit_price) orderParams.price = String(limit_price);

      const result = await krakenPrivate("AddOrder", orderParams);
      return jsonResponse({
        id: result?.txid?.[0] ?? "",
        client_order_id: result?.txid?.[0] ?? "",
        status: "accepted",
        symbol,
        qty: String(qty),
        filled_qty: "0",
        side,
        type: type ?? "market",
        time_in_force: "gtc",
        limit_price: limit_price ? String(limit_price) : null,
        stop_price: null,
        filled_avg_price: null,
        submitted_at: new Date().toISOString(),
        filled_at: null,
        created_at: new Date().toISOString(),
        description: result?.descr?.order ?? "",
      });
    }

    // ── Orders: cancel all ──
    if (path === "orders" && req.method === "DELETE") {
      if (Deno.env.get("KRAKEN_ORDERS_ENABLED") !== "true") {
        return jsonResponse({ error: "Kraken order cancellation disabled. Set KRAKEN_ORDERS_ENABLED to enable." }, 403);
      }
      const result = await krakenPrivate("CancelAll");
      return jsonResponse({ cancelled: result?.count ?? 0 });
    }

    // ── Portfolio history — Kraken has no equity-curve endpoint; the app
    //    renders an honest "no history" state rather than inventing one.
    if (path === "portfolio-history" && req.method === "GET") {
      return jsonResponse({ timestamp: [], equity: [], profit_loss: [], profit_loss_pct: [] });
    }

    // ── Connection probe: are the keys present and valid? ──
    if (path === "status" && req.method === "GET") {
      await krakenPrivate("Balance");
      return jsonResponse({ connected: true, broker: "kraken" });
    }

    return jsonResponse({ error: `Unknown route: ${path}` }, 404);
  } catch (err) {
    console.error("kraken-connector:", err);
    const msg = err instanceof Error && (err.message.startsWith("Missing secret:") || err.message.startsWith("Kraken:"))
      ? err.message
      : "Internal error";
    return jsonResponse({ error: msg }, 500);
  }
});
