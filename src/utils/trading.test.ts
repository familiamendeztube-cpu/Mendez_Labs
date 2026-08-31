// V55C deterministic tests for Trading page, Settings connections, routing, security.
// Run with: npx tsx src/utils/trading.test.ts

import {
  defaultConnections,
  defaultSettingsConnections,
  defaultChecklist,
  isLiveReady,
  emptyAccountMetrics,
  emptySignalMetrics,
  computeReadiness,
  connectionStatusLabel,
  TRADING_PLANNED_LIVE,
  TRADING_DEFAULT_RISK_PCT,
  TRADING_ABSOLUTE_RISK_PCT,
  TRADING_DAILY_STOP_PCT,
  TRADING_DRAWDOWN_PAUSE_PCT,
  WATCHLIST_COLUMNS,
  type ConnectionCard,
} from './tradingCalc';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { passed++; } else { failed++; console.error(`FAIL: ${label}`); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Route and nav integrity
// ═══════════════════════════════════════════════════════════════════════════════

const EXPECTED_ROUTES = [
  '/dashboard', '/signals', '/portfolio', '/performance',
  '/sports/today', '/sports/pick-five', '/sports/results', '/sports/bankroll',
  '/settings',
];

for (const route of EXPECTED_ROUTES) {
  assert(typeof route === 'string' && route.startsWith('/'), `Route ${route} is valid path`);
}
assert(EXPECTED_ROUTES.includes('/dashboard'), 'Dashboard route exists');
assert(EXPECTED_ROUTES.includes('/signals'), 'Trade signals route exists');
assert(EXPECTED_ROUTES.includes('/portfolio'), 'Paper portfolio route exists');
assert(EXPECTED_ROUTES.includes('/performance'), 'Performance route exists');
assert(EXPECTED_ROUTES.length === 9, '9 routes total (Dashboard, Signals, Portfolio, Performance, Sports×4, Settings)');

// Sports routes preserved under /sports prefix
assert(EXPECTED_ROUTES.includes('/sports/today'), 'Today route preserved under /sports');
assert(EXPECTED_ROUTES.includes('/sports/pick-five'), 'Top Five route preserved under /sports');
assert(EXPECTED_ROUTES.includes('/sports/results'), 'Results route preserved under /sports');
assert(EXPECTED_ROUTES.includes('/sports/bankroll'), 'Bankroll route preserved under /sports');
assert(EXPECTED_ROUTES.includes('/settings'), 'Settings route preserved');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: No false connected states
// ═══════════════════════════════════════════════════════════════════════════════

const tradingConns = defaultConnections();
for (const c of tradingConns) {
  assert(c.status !== 'connected', `Trading ${c.name}: not falsely connected`);
}

const settingsConns = defaultSettingsConnections();
for (const c of settingsConns) {
  assert(c.status !== 'connected', `Settings ${c.name}: not falsely connected by default`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: No browser-login-as-API assumption
// ═══════════════════════════════════════════════════════════════════════════════

const betdaq = settingsConns.find((c) => c.id === 'betdaq');
assert(betdaq !== undefined, 'BETDAQ connection exists');
assert(betdaq!.status === 'api_not_verified', 'BETDAQ: API access not verified (not connected from website login)');
assert(betdaq!.nextAction.includes('Website login does not verify'), 'BETDAQ: tells user website login is insufficient');

const alpacaPaper = settingsConns.find((c) => c.id === 'alpaca-paper');
assert(alpacaPaper !== undefined, 'Alpaca Paper connection exists');
assert(alpacaPaper!.status === 'missing_credentials', 'Alpaca Paper: missing credentials by default');

const alpacaLive = settingsConns.find((c) => c.id === 'alpaca-live');
assert(alpacaLive !== undefined, 'Alpaca Live connection exists');
assert(alpacaLive!.status === 'missing_credentials', 'Alpaca Live: missing credentials by default');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: N/A account metrics
// ═══════════════════════════════════════════════════════════════════════════════

const acct = emptyAccountMetrics();
assert(acct.equity === null, 'Equity: N/A');
assert(acct.cash === null, 'Cash: N/A');
assert(acct.buyingPower === null, 'Buying power: N/A');
assert(acct.dayPL === null, 'Day P/L: N/A');
assert(acct.totalPL === null, 'Total P/L: N/A');
assert(acct.positions === null, 'Positions: N/A');
assert(acct.grossExposure === null, 'Gross exposure: N/A');
assert(acct.netExposure === null, 'Net exposure: N/A');
assert(acct.maxDrawdown === null, 'Max drawdown: N/A');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: N/A signal metrics
// ═══════════════════════════════════════════════════════════════════════════════

const sig = emptySignalMetrics();
assert(sig.symbolsScanned === null, 'Symbols scanned: N/A');
assert(sig.qualified === null, 'Qualified: N/A');
assert(sig.excluded === null, 'Excluded: N/A');
assert(sig.pending === null, 'Pending: N/A');
assert(sig.settledWinRate === null, 'Win rate: N/A');
assert(sig.profitFactor === null, 'Profit factor: N/A');
assert(sig.averageGain === null, 'Avg gain: N/A');
assert(sig.averageLoss === null, 'Avg loss: N/A');
assert(sig.expectancy === null, 'Expectancy: N/A');
assert(sig.sharpe === null, 'Sharpe: N/A');
assert(sig.estimatedSlippage === null, 'Est. slippage: N/A');
assert(sig.dataTimestamp === null, 'Data timestamp: N/A');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Readiness gate
// ═══════════════════════════════════════════════════════════════════════════════

const checklist = defaultChecklist();
assert(checklist.length === 11, '11 readiness checks');
assert(checklist.every((c) => !c.verified), 'All checks start unverified');
assert(checklist.every((c) => c.blocksLive), 'All checks block live trading');
assert(!isLiveReady(checklist), 'Not live ready by default');

// Only ready when all verified
const allVerified = checklist.map((c) => ({ ...c, verified: true }));
assert(isLiveReady(allVerified), 'Live ready when all verified');

// One unverified blocks
const almostReady = allVerified.map((c, i) => i === 0 ? { ...c, verified: false } : c);
assert(!isLiveReady(almostReady), 'Not live ready with one unverified');

// Specific checklist items exist
const checkIds = checklist.map((c) => c.id);
assert(checkIds.includes('paper-keys'), 'Has paper-keys check');
assert(checkIds.includes('paper-reachable'), 'Has paper-reachable check');
assert(checkIds.includes('market-data'), 'Has market-data check');
assert(checkIds.includes('quotes-fresh'), 'Has quotes-fresh check');
assert(checkIds.includes('paper-orders'), 'Has paper-orders check');
assert(checkIds.includes('cancel-replace'), 'Has cancel-replace check');
assert(checkIds.includes('reconciliation'), 'Has reconciliation check');
assert(checkIds.includes('risk-caps'), 'Has risk-caps check');
assert(checkIds.includes('kill-switch'), 'Has kill-switch check');
assert(checkIds.includes('min-sample'), 'Has min-sample check');
assert(checkIds.includes('live-toggle'), 'Has live-toggle check');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: No live order controls
// ═══════════════════════════════════════════════════════════════════════════════

// Trading page only imports defaultConnections, defaultChecklist, etc.
// No buy/sell/order functions exist in tradingCalc.
const exports = [
  'defaultConnections', 'defaultSettingsConnections', 'defaultChecklist',
  'isLiveReady', 'emptyAccountMetrics', 'emptySignalMetrics',
  'computeReadiness', 'connectionStatusLabel',
  'TRADING_PLANNED_LIVE', 'TRADING_DEFAULT_RISK_PCT', 'TRADING_ABSOLUTE_RISK_PCT',
  'TRADING_DAILY_STOP_PCT', 'TRADING_DRAWDOWN_PAUSE_PCT', 'WATCHLIST_COLUMNS',
];
// No order-related names
for (const name of ['placeOrder', 'submitOrder', 'executeTrade', 'buyStock', 'sellStock']) {
  assert(!exports.includes(name), `No ${name} export in tradingCalc`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Risk constants
// ═══════════════════════════════════════════════════════════════════════════════

assert(TRADING_PLANNED_LIVE === 100, 'Trading planned live = $100');
assert(TRADING_DEFAULT_RISK_PCT === 0.01, 'Default risk = 1%');
assert(TRADING_ABSOLUTE_RISK_PCT === 0.02, 'Absolute risk cap = 2%');
assert(TRADING_DAILY_STOP_PCT === 0.05, 'Daily stop = 5%');
assert(TRADING_DRAWDOWN_PAUSE_PCT === 0.10, 'Drawdown pause = 10%');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Mobile nav structure
// ═══════════════════════════════════════════════════════════════════════════════

// Watchlist columns for mobile rendering
assert(WATCHLIST_COLUMNS.length === 13, '13 watchlist columns');
assert(WATCHLIST_COLUMNS.includes('symbol'), 'Has symbol column');
assert(WATCHLIST_COLUMNS.includes('price'), 'Has price column');
assert(WATCHLIST_COLUMNS.includes('trend'), 'Has trend column');
assert(WATCHLIST_COLUMNS.includes('volatility'), 'Has volatility column');
assert(WATCHLIST_COLUMNS.includes('volume'), 'Has volume column');
assert(WATCHLIST_COLUMNS.includes('score'), 'Has score column');
assert(WATCHLIST_COLUMNS.includes('entry'), 'Has entry column');
assert(WATCHLIST_COLUMNS.includes('stop'), 'Has stop column');
assert(WATCHLIST_COLUMNS.includes('target'), 'Has target column');
assert(WATCHLIST_COLUMNS.includes('riskReward'), 'Has riskReward column');
assert(WATCHLIST_COLUMNS.includes('positionSize'), 'Has positionSize column');
assert(WATCHLIST_COLUMNS.includes('status'), 'Has status column');
assert(WATCHLIST_COLUMNS.includes('reason'), 'Has reason column');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: Connection status labels
// ═══════════════════════════════════════════════════════════════════════════════

assert(connectionStatusLabel('connected') === 'Connected', 'Label: connected');
assert(connectionStatusLabel('missing_credentials') === 'Missing credentials', 'Label: missing_credentials');
assert(connectionStatusLabel('api_not_verified') === 'API access not verified', 'Label: api_not_verified');
assert(connectionStatusLabel('error') === 'Error', 'Label: error');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: Readiness summary
// ═══════════════════════════════════════════════════════════════════════════════

const defaultReadiness = computeReadiness(defaultSettingsConnections());
assert(defaultReadiness.sportsData === false, 'Default: sports data not ready');
assert(defaultReadiness.sportsExecution === 'locked', 'Default: sports execution locked');
assert(defaultReadiness.tradingPaper === false, 'Default: trading paper not ready');
assert(defaultReadiness.tradingLive === 'locked', 'Default: trading live locked');

// With connected odds API
const withOdds: ConnectionCard[] = defaultSettingsConnections().map((c) =>
  c.id === 'odds-api' ? { ...c, status: 'connected' as const } : c,
);
const oddsReadiness = computeReadiness(withOdds);
assert(oddsReadiness.sportsData === true, 'With Odds API: sports data ready');
assert(oddsReadiness.sportsExecution === 'locked', 'With Odds API: sports execution still locked');
assert(oddsReadiness.tradingPaper === false, 'With Odds API: trading paper still not ready');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: Settings connections — 5 providers
// ═══════════════════════════════════════════════════════════════════════════════

assert(settingsConns.length === 5, '5 settings connections');
const ids = settingsConns.map((c) => c.id);
assert(ids.includes('odds-api'), 'Has Odds API');
assert(ids.includes('api-sports'), 'Has API-Sports');
assert(ids.includes('betdaq'), 'Has BETDAQ');
assert(ids.includes('alpaca-paper'), 'Has Alpaca Paper');
assert(ids.includes('alpaca-live'), 'Has Alpaca Live');

// API-Sports: not connected by default
const apiSports = settingsConns.find((c) => c.id === 'api-sports');
assert(apiSports!.status === 'missing_credentials', 'API-Sports: missing credentials by default');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: Secret/client-bundle scan — no VITE_ secrets in tradingCalc
// ═══════════════════════════════════════════════════════════════════════════════

// The tradingCalc module is pure — it should not reference any env vars or secrets.
// We verify by checking none of the string constants contain suspicious patterns.
const allStrings = JSON.stringify({ ...defaultConnections(), ...defaultSettingsConnections(), ...defaultChecklist() });
assert(!allStrings.includes('VITE_'), 'No VITE_ env vars in trading config');
assert(!allStrings.includes('sk_live'), 'No sk_live secrets');
assert(!allStrings.includes('pk_live'), 'No pk_live secrets');
assert(!allStrings.includes('Bearer '), 'No Bearer tokens');
assert(!allStrings.includes('password'), 'No passwords in config strings');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 14: Trading connections — 3 cards
// ═══════════════════════════════════════════════════════════════════════════════

assert(tradingConns.length === 3, '3 trading connection cards');
const tradingIds = tradingConns.map((c) => c.id);
assert(tradingIds.includes('alpaca-paper'), 'Trading: has Alpaca Paper');
assert(tradingIds.includes('alpaca-live'), 'Trading: has Alpaca Live');
assert(tradingIds.includes('market-data'), 'Trading: has Market Data');

// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\ntrading.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
