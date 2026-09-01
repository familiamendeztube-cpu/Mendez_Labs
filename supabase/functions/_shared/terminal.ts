// Shared helpers for the single-operator terminal's edge functions.
// One copy of the CORS headers, the auth gate, the JSON responder, and a
// lightweight in-memory rate limiter — so a future auth change touches one file.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, x-terminal-key",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Single shared-code gate. The operator's code is supplied in the
 * `x-terminal-key` header and checked against the TERMINAL_ACCESS_KEY secret.
 * Falls back to the known master code so the function still works before the
 * secret is set — set a strong TERMINAL_ACCESS_KEY as step one of deployment.
 */
export function terminalAuthorized(req: Request): boolean {
  const expected = Deno.env.get("TERMINAL_ACCESS_KEY") ?? "312593";
  const got = req.headers.get("x-terminal-key") ?? "";
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ── Rate limiting ────────────────────────────────────────────────────────────
// Per-isolate, per-IP sliding window. Not bulletproof across isolates, but it
// turns "brute-force the code in an afternoon" into "get 429'd immediately".

interface Bucket {
  hits: number[];
}
const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Returns a 429 Response if this IP has exceeded `limit` requests in the
 * trailing `windowMs`, otherwise null. Call right after the OPTIONS check.
 */
export function rateLimited(req: Request, limit = 30, windowMs = 60_000): Response | null {
  const ip = clientIp(req);
  const now = Date.now();
  const b = buckets.get(ip) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  b.hits.push(now);
  buckets.set(ip, b);

  // Opportunistic cleanup so the map can't grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.hits.every((t) => now - t > windowMs)) buckets.delete(k);
    }
  }

  if (b.hits.length > limit) {
    return new Response(
      JSON.stringify({ error: "Too many requests — slow down." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } },
    );
  }
  return null;
}

/** Parse a JSON body, returning a typed value or a 400 Response. */
export async function readJson<T>(req: Request): Promise<{ body: T } | { error: Response }> {
  try {
    return { body: (await req.json()) as T };
  } catch {
    return { error: jsonResponse({ error: "Invalid JSON body" }, 400) };
  }
}
