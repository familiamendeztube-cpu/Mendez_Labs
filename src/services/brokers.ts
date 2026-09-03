import { terminalHeaders } from '@/lib/terminalConfig';

/**
 * Broker registry. Every venue the terminal can trade through is described
 * here once — its connector, what it trades, how you fund it, and how you get
 * money out. The rest of the app reads this instead of hard-coding Alpaca.
 */

export type BrokerId = 'alpaca-paper' | 'alpaca-live' | 'kraken' | 'capital-demo' | 'capital-live';

export interface BrokerDef {
  id: BrokerId;
  /** Name shown in the UI. */
  name: string;
  /** One-line description of what this account is. */
  tagline: string;
  /** Edge function slug this broker's requests go to. */
  fn: 'alpaca-connector' | 'kraken-connector' | 'capital-connector';
  /** Extra query params appended to every call (Alpaca needs env=paper|live). */
  query: Record<string, string>;
  /** What you can trade here. */
  asset: 'US stocks & ETFs' | 'Crypto' | 'CFDs — shares, indices, FX';
  /** Is real money at risk on this venue? */
  realMoney: boolean;
  /** How you put money in. */
  funding: string[];
  /** How you take money out. */
  withdrawal: string[];
  /** Direct link to the venue's deposit screen. */
  depositUrl: string;
  /** Where to create API keys for this venue. */
  apiKeysUrl: string;
  /** Server secrets this broker needs before it will connect. */
  secrets: string[];
  /** Rough time to get funded from a standing start. */
  fundingSpeed: string;
  /** Available to a Costa Rica resident? */
  costaRica: 'yes' | 'limited';
  /**
   * Shown wherever the venue is selected. CFD venues carry a legally-required
   * retail-loss disclosure; surfacing it is the honest thing to do.
   */
  warning?: string;
}

export const BROKERS: BrokerDef[] = [
  {
    id: 'alpaca-paper',
    name: 'Alpaca Paper',
    tagline: 'Simulated US stock trading. No funding, no risk.',
    fn: 'alpaca-connector',
    query: { env: 'paper' },
    asset: 'US stocks & ETFs',
    realMoney: false,
    funding: ['Nothing to fund — starts with simulated cash'],
    withdrawal: ['N/A — simulated'],
    depositUrl: 'https://app.alpaca.markets/paper/dashboard/overview',
    apiKeysUrl: 'https://app.alpaca.markets/paper/dashboard/overview',
    secrets: ['ALPACA_PAPER_KEY_ID', 'ALPACA_PAPER_SECRET'],
    fundingSpeed: 'Instant — no money required',
    costaRica: 'yes',
  },
  {
    id: 'alpaca-live',
    name: 'Alpaca Live',
    tagline: 'Real US stock trading. Funded by bank wire or ACH.',
    fn: 'alpaca-connector',
    query: { env: 'live' },
    asset: 'US stocks & ETFs',
    realMoney: true,
    funding: ['Bank wire', 'ACH transfer (US banks)'],
    withdrawal: ['Bank wire', 'ACH'],
    depositUrl: 'https://app.alpaca.markets/brokerage/banking',
    apiKeysUrl: 'https://app.alpaca.markets/brokerage/dashboard/overview',
    secrets: ['ALPACA_LIVE_KEY_ID', 'ALPACA_LIVE_SECRET', 'ALPACA_LIVE_ORDERS_ENABLED'],
    fundingSpeed: 'Wire: 1–3 business days',
    costaRica: 'limited',
  },
  {
    id: 'kraken',
    name: 'Kraken',
    tagline: 'Real crypto trading. Fund with a debit card in minutes.',
    fn: 'kraken-connector',
    query: {},
    asset: 'Crypto',
    realMoney: true,
    funding: ['Debit / credit card', 'Apple Pay & Google Pay', 'Crypto transfer', 'Bank transfer'],
    withdrawal: ['Crypto (BTC, USDT, …)', 'PayPal (region dependent)', 'Bank transfer'],
    depositUrl: 'https://www.kraken.com/c/funding/deposit',
    apiKeysUrl: 'https://www.kraken.com/u/security/api',
    secrets: ['KRAKEN_API_KEY', 'KRAKEN_API_SECRET', 'KRAKEN_ORDERS_ENABLED'],
    fundingSpeed: 'Card: minutes',
    costaRica: 'yes',
  },
  {
    id: 'capital-demo',
    name: 'Capital.com Demo',
    tagline: 'Simulated CFD trading. No funding, no risk.',
    fn: 'capital-connector',
    query: { env: 'demo' },
    asset: 'CFDs — shares, indices, FX',
    realMoney: false,
    funding: ['Nothing to fund — demo balance is provided'],
    withdrawal: ['N/A — simulated'],
    depositUrl: 'https://capital.com/trading/platform/',
    apiKeysUrl: 'https://capital.com/trading/platform/settings/api',
    secrets: ['CAPITAL_API_KEY', 'CAPITAL_IDENTIFIER', 'CAPITAL_PASSWORD'],
    fundingSpeed: 'Instant — no money required',
    costaRica: 'yes',
  },
  {
    id: 'capital-live',
    name: 'Capital.com Live',
    tagline: 'Real CFD trading. Fund with a debit card in minutes.',
    fn: 'capital-connector',
    query: { env: 'live' },
    asset: 'CFDs — shares, indices, FX',
    realMoney: true,
    funding: ['Debit / credit card', 'PayPal', 'Bank transfer'],
    withdrawal: ['Back to the funding method', 'PayPal', 'Bank transfer'],
    depositUrl: 'https://capital.com/trading/platform/',
    apiKeysUrl: 'https://capital.com/trading/platform/settings/api',
    secrets: ['CAPITAL_API_KEY', 'CAPITAL_IDENTIFIER', 'CAPITAL_PASSWORD', 'CAPITAL_ORDERS_ENABLED'],
    fundingSpeed: 'Card: minutes',
    costaRica: 'yes',
    warning: 'CFDs are leveraged and you never own the underlying asset. Capital.com discloses that 79.58% of retail accounts lose money trading CFDs with them.',
  },
];

export function getBroker(id: BrokerId): BrokerDef {
  return BROKERS.find((b) => b.id === id) ?? BROKERS[0];
}

// ── Active broker selection (persisted per browser) ─────────────────────────

const BROKER_KEY = 'mlabs-broker';

export function getActiveBrokerId(): BrokerId {
  try {
    const saved = localStorage.getItem(BROKER_KEY);
    if (saved && BROKERS.some((b) => b.id === saved)) return saved as BrokerId;
    // Migrate the old paper/live-only setting.
    const legacy = localStorage.getItem('mlabs-trading-env');
    return legacy === 'live' ? 'alpaca-live' : 'alpaca-paper';
  } catch {
    return 'alpaca-paper';
  }
}

export function setActiveBrokerId(id: BrokerId) {
  try {
    localStorage.setItem(BROKER_KEY, id);
    // Keep the legacy key in sync so anything still reading it stays correct.
    localStorage.setItem('mlabs-trading-env', getBroker(id).realMoney ? 'live' : 'paper');
  } catch { /* ignore */ }
}

// ── Unified request helper ──────────────────────────────────────────────────

const BASE = import.meta.env.VITE_SUPABASE_URL;

/**
 * Call the active broker's connector. Both connectors speak the same route
 * vocabulary (account, positions, quotes, bars, orders, portfolio-history), so
 * the app never has to branch on which venue is selected.
 */
export async function brokerFetch<T>(
  brokerId: BrokerId,
  path: string,
  params: Record<string, string> = {},
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const broker = getBroker(brokerId);
  const qs = new URLSearchParams({ ...broker.query, ...params });
  const url = `${BASE}/functions/v1/${broker.fn}/${path}${qs.toString() ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method,
    headers: terminalHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `${broker.name} request failed (${res.status})`);
  }
  return res.json();
}
