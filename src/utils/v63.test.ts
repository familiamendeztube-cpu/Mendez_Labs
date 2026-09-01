import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

let N = 0;
function ok(cond: boolean, msg: string) { assert(cond, msg); N++; }

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Route structure (src/App.tsx)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const src = read('src/App.tsx');

  // Trading-first routes
  ok(src.includes('path="/dashboard"'), 'route /dashboard exists');
  ok(src.includes('path="/signals"'), 'route /signals exists');
  ok(src.includes('path="/portfolio"'), 'route /portfolio exists');
  ok(src.includes('path="/performance"'), 'route /performance exists');

  // Sports Lab routes under /sports prefix
  ok(src.includes('path="/sports/today"'), 'route /sports/today exists');
  ok(src.includes('path="/sports/pick-five"'), 'route /sports/pick-five exists');
  ok(src.includes('path="/sports/results"'), 'route /sports/results exists');
  ok(src.includes('path="/sports/bankroll"'), 'route /sports/bankroll exists');

  // Settings route
  ok(src.includes('path="/settings"'), 'route /settings exists');

  // Backward-compat redirects
  ok(src.includes('path="/trading"') && src.includes('Navigate to="/dashboard"'), 'redirect /trading → /dashboard');
  ok(src.includes('path="/pick-five"') && src.includes('Navigate to="/sports/pick-five"'), 'redirect /pick-five → /sports/pick-five');
  ok(src.includes('path="/results"') && src.includes('Navigate to="/sports/results"'), 'redirect /results → /sports/results');
  ok(src.includes('path="/bankroll"') && src.includes('Navigate to="/sports/bankroll"'), 'redirect /bankroll → /sports/bankroll');

  // Default route → /dashboard
  ok(src.includes('path="/"') && src.includes('Navigate to="/dashboard"'), 'default route → /dashboard');
  ok(src.includes('path="*"') && src.includes('Navigate to="/dashboard"'), 'catch-all → /dashboard');

  // Auth gate preserved (unauthenticated → landing page)
  ok(src.includes('if (!authenticated) return <Landing />'), 'auth gate: unauthenticated → <Landing />');

  // SportsSubNav conditional on /sports prefix
  ok(src.includes("isSportsRoute") && src.includes('location.pathname.startsWith(\'/sports\')'), 'isSportsRoute checks /sports prefix');
  ok(src.includes('{isSportsRoute && <SportsSubNav />}'), 'SportsSubNav rendered conditionally');

  // Page components wired in (route-split via React.lazy)
  for (const page of ['TradingDashboard', 'Signals', 'PaperPortfolio', 'Performance', 'Today', 'PickFive', 'Results', 'Bankroll', 'Settings']) {
    ok(src.includes(`import('@/pages/${page}')`), `lazy-loads ${page}`);
  }
  ok(src.includes("import { SportsSubNav }"), 'imports SportsSubNav');
  ok(src.includes("import { Landing }"), 'imports Landing');
  ok(src.includes('lazy(') && src.includes('Suspense'), 'routes are code-split with Suspense');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Navigation config (src/components/navItems.ts)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const src = read('src/components/navItems.ts');

  // Exports
  ok(src.includes('export const NAV_ITEMS'), 'exports NAV_ITEMS');
  ok(src.includes('export const MOBILE_NAV_ITEMS'), 'exports MOBILE_NAV_ITEMS');
  ok(src.includes('export const SPORTS_SUB_ITEMS'), 'exports SPORTS_SUB_ITEMS');

  // Dashboard is first nav item with path /dashboard
  const navItemsStart = src.indexOf('export const NAV_ITEMS');
  const firstPath = src.indexOf("path: '/dashboard'", navItemsStart);
  ok(firstPath !== -1, 'Dashboard path /dashboard in NAV_ITEMS');
  ok(src.indexOf("label: 'Trading'", navItemsStart) !== -1, 'Dashboard label is Trading');

  // Sports Lab has children array
  ok(src.includes("label: 'Sports Lab'"), 'Sports Lab nav item exists');
  ok(src.includes('children: ['), 'Sports Lab has children array');

  // Sports sub-items: Today, Top Five, Results, Bankroll
  ok(src.includes("label: 'Today'"), 'sub-item Today exists');
  ok(src.includes("label: 'Top Five'"), 'sub-item Top Five exists');
  ok(src.includes("label: 'Results'"), 'sub-item Results exists');
  ok(src.includes("label: 'Bankroll'"), 'sub-item Bankroll exists');

  // Settings is last item
  const settingsIdx = src.indexOf("label: 'Settings'");
  const closingBracket = src.indexOf('];', navItemsStart);
  ok(settingsIdx !== -1 && settingsIdx < closingBracket, 'Settings is in NAV_ITEMS');
  // It should be the last non-children item before the closing bracket
  ok(src.indexOf("label: '", settingsIdx + 1) === -1 || src.indexOf("label: '", settingsIdx + 1) > closingBracket, 'Settings is last nav item');

  // MOBILE_NAV_ITEMS is an array definition
  ok(src.includes('MOBILE_NAV_ITEMS = NAV_ITEMS.filter'), 'MOBILE_NAV_ITEMS is array derived from filter');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Trading pages exist and have key content
// ═══════════════════════════════════════════════════════════════════════════════
{
  // TradingDashboard
  const td = read('src/pages/TradingDashboard.tsx');
  ok(td.includes('export function TradingDashboard'), 'TradingDashboard exported');
  ok(td.includes('Trading Command Center'), 'TradingDashboard has "Trading Command Center" heading');
  ok(td.includes('BrokerPicker'), 'TradingDashboard uses the multi-venue BrokerPicker');
  ok(td.includes('Execution readiness'), 'TradingDashboard has readiness checklist');
  ok(td.includes('Live orders enabled'), 'TradingDashboard readiness row for live orders');
  ok(td.includes('REAL MONEY') || td.includes('orders are simulated'), 'TradingDashboard shows a venue-aware money disclosure');

  // Signals
  const sig = read('src/pages/Signals.tsx');
  ok(sig.includes('export function Signals'), 'Signals exported');
  ok(sig.includes('FilterPill'), 'Signals has filter pills');
  ok(sig.includes('Trend continuation'), 'Signals has trend_continuation strategy');
  ok(sig.includes('Controlled pullback'), 'Signals has controlled_pullback strategy');
  ok(sig.includes('Volatility breakout'), 'Signals has volatility_breakout strategy');
  ok(sig.includes('No signal'), 'Signals has empty signal state per ticker');
  ok(sig.includes("DEFAULT_UNIVERSE"), 'Signals imports DEFAULT_UNIVERSE');

  // PaperPortfolio
  const pp = read('src/pages/PaperPortfolio.tsx');
  ok(pp.includes('export function PaperPortfolio'), 'PaperPortfolio exported');
  ok(pp.includes('Kill switch'), 'PaperPortfolio has kill switch');
  ok(pp.includes('Cancels all open paper orders'), 'PaperPortfolio kill switch description');
  ok(pp.includes('Positions'), 'PaperPortfolio has positions table');
  ok(pp.includes('No open positions'), 'PaperPortfolio has empty positions state');

  // Performance
  const perf = read('src/pages/Performance.tsx');
  ok(perf.includes('export function Performance'), 'Performance exported');
  ok(perf.includes("label: 'Today'"), 'Performance has Today tab');
  ok(perf.includes("label: '7D'"), 'Performance has 7D tab');
  ok(perf.includes("label: '30D'"), 'Performance has 30D tab');
  ok(perf.includes("label: 'All-time'"), 'Performance has All-time tab');
  ok(perf.includes('Win rate'), 'Performance has Win rate metric');
  ok(perf.includes('Sharpe'), 'Performance has Sharpe metric');
  ok(perf.includes('Sortino'), 'Performance has Sortino metric');
  ok(perf.includes('Minimum 30 settled trades for statistical metrics'), 'Performance min-trades note');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Sports sub-nav (src/components/SportsSubNav.tsx)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const src = read('src/components/SportsSubNav.tsx');
  ok(src.includes('export function SportsSubNav'), 'SportsSubNav exported');
  ok(src.includes('SPORTS_SUB_ITEMS'), 'SportsSubNav uses SPORTS_SUB_ITEMS');
  ok(src.includes("to={path}"), 'SportsSubNav renders Link with path');
  // The links come from SPORTS_SUB_ITEMS which we already verified contain the 4 paths
  ok(src.includes("import { SPORTS_SUB_ITEMS } from"), 'SportsSubNav imports SPORTS_SUB_ITEMS');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Sidebar (src/components/Sidebar.tsx)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const src = read('src/components/Sidebar.tsx');
  ok(src.includes("import { NAV_ITEMS } from"), 'Sidebar imports from navItems');
  ok(src.includes('sportsOpen'), 'Sidebar has Sports Lab collapsible section state');
  ok(src.includes('setSportsOpen'), 'Sidebar toggles sports section');
  ok(src.includes('ChevronDown'), 'Sidebar uses ChevronDown for expand');
  ok(src.includes('ChevronRight'), 'Sidebar uses ChevronRight for collapse');
  ok(src.includes('children'), 'Sidebar handles children (Sports Lab sub-items)');
  ok(src.includes('MENDEZ LABS'), 'Sidebar shows brand name');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Settings reorder (src/pages/Settings.tsx)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const src = read('src/pages/Settings.tsx');

  // Trading connections before sports connections
  const tradingIdx = src.indexOf('Trading connections');
  const sportsIdx = src.indexOf('Sports Lab connections');
  ok(tradingIdx !== -1, 'Settings has Trading connections section');
  ok(sportsIdx !== -1, 'Settings has Sports Lab connections section');
  ok(tradingIdx < sportsIdx, 'Trading connections appear before Sports connections');

  // Sports connections in a collapsible <details> element
  ok(src.includes('<details'), 'Settings uses <details> for sports connections');
  ok(src.includes('<summary'), 'Settings uses <summary> in details');
  const detailsIdx = src.indexOf('<details');
  ok(detailsIdx < sportsIdx, '<details wraps Sports Lab connections');

  // Mentions Alpaca paper and live secrets
  ok(src.includes('ALPACA_PAPER_KEY_ID'), 'Settings shows ALPACA_PAPER_KEY_ID');
  ok(src.includes('ALPACA_PAPER_SECRET'), 'Settings shows ALPACA_PAPER_SECRET');
  ok(src.includes('ALPACA_LIVE_KEY_ID'), 'Settings shows ALPACA_LIVE_KEY_ID');
  ok(src.includes('ALPACA_LIVE_SECRET'), 'Settings shows ALPACA_LIVE_SECRET');

  // Readiness chips: trading before sports
  const tradingPaperIdx = src.indexOf('Trading paper');
  const sportsDataIdx = src.indexOf('Sports data');
  ok(tradingPaperIdx !== -1, 'Settings has Trading paper readiness chip');
  ok(sportsDataIdx !== -1, 'Settings has Sports data readiness chip');
  ok(tradingPaperIdx < sportsDataIdx, 'Trading readiness chips appear before Sports chips');

  // Description mentions "trading and sports research terminal"
  ok(src.includes('trading and sports research terminal'), 'Settings about mentions trading and sports research terminal');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Landing page (src/pages/landing/)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const src = read('src/pages/landing/Landing.tsx');

  // Trading-first narrative and the cinematic chapter structure
  ok(src.includes('Hero') && src.includes('Manifesto') && src.includes('JetPass'), 'Landing assembles the cinematic chapters');
  ok(src.includes('useLenis') || src.includes('Lenis'), 'Landing uses Lenis smooth scroll');
  ok(src.includes('data-lp-theme'), 'chapters carry theme markers for the animated background');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Edge function (supabase/functions/alpaca-connector/index.ts)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const filePath = path.join(ROOT, 'supabase/functions/alpaca-connector/index.ts');
  ok(fs.existsSync(filePath), 'alpaca-connector/index.ts exists');

  const src = read('supabase/functions/alpaca-connector/index.ts');
  const shared = read('supabase/functions/_shared/terminal.ts');

  // CORS headers (now in the shared module)
  ok(src.includes('_shared/terminal.ts') && src.includes('corsHeaders'), 'edge fn imports shared corsHeaders');
  ok(shared.includes('Access-Control-Allow-Origin'), 'shared module has CORS origin header');
  ok(shared.includes('Access-Control-Allow-Methods'), 'shared module has CORS methods header');
  ok(shared.includes('Access-Control-Allow-Headers') && shared.includes('x-terminal-key'), 'shared CORS allows x-terminal-key');

  // Routes
  ok(src.includes('path === "account"'), 'edge fn has account route');
  ok(src.includes('path === "positions"'), 'edge fn has positions route');
  ok(src.includes('path === "quotes"'), 'edge fn has quotes route');
  ok(src.includes('path === "bars"'), 'edge fn has bars route');
  ok(src.includes('path === "orders"') && src.includes('POST'), 'edge fn has POST orders route');
  ok(src.includes('path === "orders"') && src.includes('GET'), 'edge fn has GET orders route');

  // Paper-only guard on POST orders
  ok(src.includes('env !== "paper"'), 'edge fn has paper-only guard');
  ok(src.includes('Live orders disabled'), 'edge fn returns 403 for live orders');

  // Auth check — single-user shared-code model (no accounts / JWTs)
  ok(src.includes('terminalAuthorized'), 'edge fn calls terminalAuthorized');
  ok(src.includes('Unauthorized'), 'edge fn returns 401 for a bad code');
  ok(shared.includes('x-terminal-key') && shared.includes('TERMINAL_ACCESS_KEY'), 'shared gate checks x-terminal-key vs TERMINAL_ACCESS_KEY');
  ok(shared.includes('diff |=') || shared.includes('timingSafe'), 'shared gate uses a constant-time compare');
  ok(src.includes('rateLimited'), 'edge fn is rate-limited');

  // No hardcoded API keys — uses envOrThrow
  ok(src.includes('envOrThrow("ALPACA_PAPER_KEY_ID")'), 'uses envOrThrow for paper key');
  ok(src.includes('envOrThrow("ALPACA_PAPER_SECRET")'), 'uses envOrThrow for paper secret');
  ok(!src.match(/APCA-API-KEY-ID["']?\s*:\s*["'][A-Z0-9]{10,}/), 'no hardcoded API key values');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Trading analysis engine (src/utils/tradingAnalysis.ts)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const filePath = path.join(ROOT, 'src/utils/tradingAnalysis.ts');
  ok(fs.existsSync(filePath), 'tradingAnalysis.ts exists');

  const src = read('src/utils/tradingAnalysis.ts');

  // DEFAULT_UNIVERSE with 11 symbols
  ok(src.includes('export const DEFAULT_UNIVERSE'), 'exports DEFAULT_UNIVERSE');
  ok(src.includes("'SPY'"), 'universe has SPY');
  ok(src.includes("'QQQ'"), 'universe has QQQ');
  ok(src.includes("'TSLA'"), 'universe has TSLA');
  const universeMatch = src.match(/DEFAULT_UNIVERSE\s*=\s*\[([\s\S]*?)\]/);
  ok(universeMatch !== null, 'DEFAULT_UNIVERSE array found');
  const symbolCount = universeMatch![1].split(',').filter(s => s.trim().length > 0).length;
  ok(symbolCount === 11, `DEFAULT_UNIVERSE has 11 symbols (got ${symbolCount})`);

  // Constants
  ok(src.includes('COMMISSION_PER_TRADE = 0'), 'COMMISSION_PER_TRADE = 0');
  ok(src.includes('SLIPPAGE_BPS = 10'), 'SLIPPAGE_BPS = 10');

  // Strategy families
  ok(src.includes("'trend_continuation'"), 'has trend_continuation strategy family');
  ok(src.includes("'controlled_pullback'"), 'has controlled_pullback strategy family');
  ok(src.includes("'volatility_breakout'"), 'has volatility_breakout strategy family');

  // 14 qualification gates
  const gateNames = [
    'enough_history', 'eligible_observations', 'oos_observations',
    'model_calibrated', 'fresh_quote', 'liquid_spread',
    'positive_ev', 'risk_reward', 'not_stale_data',
    'market_hours', 'buying_power', 'daily_loss_stop',
    'drawdown_pause', 'position_limit',
  ];
  for (const g of gateNames) {
    ok(src.includes(`'${g}'`), `checkCandidateGates has gate: ${g}`);
  }

  // Key function exports
  ok(src.includes('export function checkCandidateGates'), 'exports checkCandidateGates');
  ok(src.includes('export function computeTradingPerformance'), 'exports computeTradingPerformance');
  ok(src.includes('export function quarterKelly'), 'exports quarterKelly');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: Config (supabase/config.toml)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const src = read('supabase/config.toml');
  ok(src.includes('[functions.alpaca-connector]'), 'config has [functions.alpaca-connector]');

  // Single-user terminal: the function does its own x-terminal-key check, so
  // Supabase JWT verification is off for both trading functions.
  const section = src.slice(src.indexOf('[functions.alpaca-connector]'));
  const firstVerify = section.indexOf('verify_jwt');
  ok(section.slice(firstVerify).startsWith('verify_jwt = false'), 'alpaca-connector verify_jwt is false');

  const aiSection = src.slice(src.indexOf('[functions.ai-analysis]'));
  ok(aiSection.slice(aiSection.indexOf('verify_jwt')).startsWith('verify_jwt = false'), 'ai-analysis verify_jwt is false');
}

console.log(`✓ v63: ${N} assertions passed`);
