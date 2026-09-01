import { terminalHeaders } from '@/lib/terminalConfig';

/**
 * Live health probe for every edge function the terminal depends on.
 *
 * Detection works by sending a real request with the x-terminal-key header:
 *  · a readable response at all  → the deployed code is CURRENT (its CORS
 *    allow-list includes x-terminal-key, which only the new code does)
 *  · a thrown TypeError          → the browser blocked it. Re-probe without
 *    custom headers to tell "never deployed" (404) from "deployed but running
 *    old code that rejects our header" (anything else).
 *
 * That distinction is the one people actually get stuck on, so it's worth the
 * second request.
 */

const BASE = import.meta.env.VITE_SUPABASE_URL;

export type FnState =
  | 'ok'            // deployed, current, and answering
  | 'needs-secrets' // deployed and current, but a required secret is unset
  | 'unauthorized'  // deployed and current, but rejected the terminal key
  | 'stale'         // deployed, but running code from before this build
  | 'not-deployed'  // no such function on the server
  | 'unreachable';  // network/DNS problem

export interface FnStatus {
  slug: string;
  label: string;
  /** What breaks if this one is down. */
  powers: string;
  /** Secrets this function needs, for the fix hint. */
  secrets: string[];
  state: FnState;
  detail: string;
  /** Is this required for the app to be usable at all? */
  required: boolean;
}

interface Probe {
  slug: string;
  label: string;
  powers: string;
  secrets: string[];
  path: string;
  required: boolean;
  /**
   * Which credential this function expects. The sports functions predate the
   * single-user model and authenticate with the public anon key; only the
   * trading and AI functions read the x-terminal-key header. Probing with the
   * wrong one produces a false "needs redeploy", so it has to be per-function.
   */
  auth: 'terminal' | 'anon';
}

const PROBES: Probe[] = [
  { slug: 'alpaca-connector', label: 'Alpaca connector', powers: 'Stock account, positions, quotes, orders', secrets: ['ALPACA_PAPER_KEY_ID', 'ALPACA_PAPER_SECRET'], path: 'account?env=paper', required: true, auth: 'terminal' },
  { slug: 'kraken-connector', label: 'Kraken connector', powers: 'Crypto account, balances, orders', secrets: ['KRAKEN_API_KEY', 'KRAKEN_API_SECRET'], path: 'account', required: false, auth: 'terminal' },
  { slug: 'analysis-engine', label: 'Analysis engine', powers: "Today's sports predictions", secrets: ['ODDS_API_KEY'], path: '', required: true, auth: 'anon' },
  { slug: 'sports-feed', label: 'Sports feed', powers: 'Odds cache warm-up', secrets: ['ODDS_API_KEY'], path: '', required: true, auth: 'anon' },
  { slug: 'settle-picks', label: 'Settlement', powers: 'Grading locked picks', secrets: ['ODDS_API_KEY'], path: '', required: false, auth: 'anon' },
  { slug: 'ai-copilot', label: 'AI Copilot', powers: 'The assistant', secrets: ['ANTHROPIC_API_KEY'], path: '', required: false, auth: 'terminal' },
  { slug: 'ai-picks', label: 'AI Select', powers: 'AI-chosen Top Five', secrets: ['ANTHROPIC_API_KEY'], path: '', required: false, auth: 'terminal' },
  { slug: 'ai-analysis', label: 'AI Research', powers: 'Per-pick research', secrets: ['ANTHROPIC_API_KEY'], path: '', required: false, auth: 'terminal' },
];

const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const anonHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  Apikey: ANON,
  Authorization: `Bearer ${ANON}`,
});

async function probeOne(p: Probe): Promise<FnStatus> {
  const url = `${BASE}/functions/v1/${p.slug}${p.path ? `/${p.path}` : ''}`;
  const base = { slug: p.slug, label: p.label, powers: p.powers, secrets: p.secrets, required: p.required };

  try {
    const res = await fetch(url, { headers: p.auth === 'terminal' ? terminalHeaders() : anonHeaders() });

    if (res.status === 404) {
      return { ...base, state: 'not-deployed', detail: 'No such function on the server — it has never been deployed.' };
    }
    if (res.ok) {
      return { ...base, state: 'ok', detail: 'Deployed, current, and responding.' };
    }

    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    const msg = String(body.error ?? `HTTP ${res.status}`);

    if (/Missing secret|ANTHROPIC_API_KEY|needs the/i.test(msg)) {
      return { ...base, state: 'needs-secrets', detail: msg };
    }
    if (res.status === 401) {
      return { ...base, state: 'unauthorized', detail: 'Rejected the access code — check TERMINAL_ACCESS_KEY on the server.' };
    }
    if (res.status === 405) {
      // Wrong method for this probe, but the function answered — that's healthy.
      return { ...base, state: 'ok', detail: 'Deployed, current, and responding.' };
    }
    return { ...base, state: 'needs-secrets', detail: msg };
  } catch {
    // Blocked before we could read a response. Distinguish missing from stale.
    try {
      const bare = await fetch(url, { method: 'GET' });
      if (bare.status === 404) {
        return { ...base, state: 'not-deployed', detail: 'No such function on the server — it has never been deployed.' };
      }
      return {
        ...base,
        state: 'stale',
        detail: 'Running an older build that rejects this terminal. Redeploy it from the current code.',
      };
    } catch {
      return { ...base, state: 'unreachable', detail: 'Could not reach the server at all.' };
    }
  }
}

export async function probeSystem(): Promise<FnStatus[]> {
  return Promise.all(PROBES.map(probeOne));
}

export function stateLabel(s: FnState): string {
  switch (s) {
    case 'ok': return 'Live';
    case 'needs-secrets': return 'Needs keys';
    case 'unauthorized': return 'Key mismatch';
    case 'stale': return 'Needs redeploy';
    case 'not-deployed': return 'Not deployed';
    case 'unreachable': return 'Unreachable';
  }
}
