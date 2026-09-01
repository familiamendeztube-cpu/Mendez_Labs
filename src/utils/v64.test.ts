import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

let N = 0;
function ok(cond: boolean, msg: string) { assert(cond, msg); N++; }

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: ai-copilot edge function
// ═══════════════════════════════════════════════════════════════════════════════
{
  const p = 'supabase/functions/ai-copilot/index.ts';
  ok(fs.existsSync(path.join(ROOT, p)), 'ai-copilot/index.ts exists');
  const src = read(p);
  const shared = read('supabase/functions/_shared/terminal.ts');

  ok(src.includes('terminalAuthorized') && src.includes('_shared/terminal.ts'), 'copilot uses the shared terminal gate');
  ok(shared.includes('x-terminal-key') && shared.includes('TERMINAL_ACCESS_KEY'), 'shared gate checks x-terminal-key vs TERMINAL_ACCESS_KEY');
  ok(src.includes('rateLimited'), 'copilot is rate-limited');
  ok(src.includes('ANTHROPIC_API_KEY'), 'copilot uses the Anthropic key');
  ok(src.includes('api.anthropic.com/v1/messages'), 'copilot calls the Claude messages API');
  ok(src.includes('claude-sonnet-5') || src.includes('claude-opus-5'), 'copilot targets a current Claude model');
  ok(src.includes('system'), 'copilot sends a system prompt');
  ok(/do NOT place trades|never place|advice only|advice and analysis/i.test(src), 'copilot system prompt forbids taking actions');
  ok(shared.includes('Access-Control-Allow-Headers') && shared.includes('x-terminal-key'), 'shared CORS allows the terminal key header');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: config.toml
// ═══════════════════════════════════════════════════════════════════════════════
{
  const src = read('supabase/config.toml');
  ok(src.includes('[functions.ai-copilot]'), 'config has [functions.ai-copilot]');
  const section = src.slice(src.indexOf('[functions.ai-copilot]'));
  ok(section.slice(section.indexOf('verify_jwt')).startsWith('verify_jwt = false'), 'ai-copilot verify_jwt is false');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Copilot client + component
// ═══════════════════════════════════════════════════════════════════════════════
{
  const svc = read('src/services/copilot.ts');
  ok(svc.includes('/functions/v1/ai-copilot'), 'copilot service targets the ai-copilot function');
  ok(svc.includes('terminalHeaders()'), 'copilot service sends terminal headers');
  ok(svc.includes('CopilotContext') && svc.includes('trading') && svc.includes('sports'), 'copilot context carries trading + sports state');

  const ctx = read('src/lib/useTerminalContext.ts');
  ok(ctx.includes('useLiveTrading') && ctx.includes('useStore'), 'context hook reads live trading + store');
  ok(ctx.includes('qualifiedPicks') && ctx.includes('positions'), 'context hook surfaces picks and positions');

  const cmp = read('src/components/Copilot.tsx');
  ok(cmp.includes('export function Copilot'), 'Copilot component exported');
  ok(cmp.includes('askCopilot'), 'Copilot calls askCopilot');
  ok(cmp.includes('useTerminalContext'), 'Copilot builds live context per message');
  ok(/advice only|advice-only/i.test(cmp), 'Copilot labels itself advice-only');

  const app = read('src/App.tsx');
  ok(app.includes("import { Copilot }") && app.includes('<Copilot />'), 'Copilot mounted in the app shell');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Sports Intelligence page
// ═══════════════════════════════════════════════════════════════════════════════
{
  const pg = read('src/pages/SportsIntel.tsx');
  ok(pg.includes('export function SportsIntel'), 'SportsIntel exported');
  ok(pg.includes('rankedPicks'), 'SportsIntel reads rankedPicks from the store');
  ok(pg.includes("from 'recharts'"), 'SportsIntel renders recharts graphs');
  ok(pg.includes('Expected value distribution'), 'has EV distribution chart');
  ok(pg.includes('Model vs market probability'), 'has model-vs-market chart');
  ok(pg.includes('Qualification funnel'), 'has qualification funnel');
  ok(pg.includes('bankroll') || pg.includes('Bankroll curve'), 'has bankroll curve');

  const app = read('src/App.tsx');
  ok(app.includes('SportsIntel') && app.includes('path="/sports/intel"'), 'SportsIntel route wired');

  const nav = read('src/components/navItems.ts');
  ok(nav.includes("path: '/sports/intel'") && nav.includes("label: 'Intelligence'"), 'Intelligence sub-nav item added');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: AI Select (ai-picks) + smarter auto-select fallback
// ═══════════════════════════════════════════════════════════════════════════════
{
  const fn = 'supabase/functions/ai-picks/index.ts';
  ok(fs.existsSync(path.join(ROOT, fn)), 'ai-picks/index.ts exists');
  const src = read(fn);
  ok(src.includes('terminalAuthorized') && src.includes('rateLimited'), 'ai-picks uses the shared gate + rate limit');
  ok(src.includes('api.anthropic.com/v1/messages'), 'ai-picks calls Claude');
  ok(/never pad the card|empty picks array|Never pad/i.test(src), 'ai-picks is told not to pad the card');

  const cfg = read('supabase/config.toml');
  ok(cfg.includes('[functions.ai-picks]'), 'config has ai-picks');
  const sec = cfg.slice(cfg.indexOf('[functions.ai-picks]'));
  ok(sec.slice(sec.indexOf('verify_jwt')).startsWith('verify_jwt = false'), 'ai-picks verify_jwt false');

  const svc = read('src/services/aiPicks.ts');
  ok(svc.includes('/functions/v1/ai-picks') && svc.includes('terminalHeaders()'), 'aiPicks service wired');

  const auto = read('src/utils/autoSelect.ts');
  ok(auto.includes('marketValueScore') && auto.includes("tier: 'market'"), 'auto-select has a market-value fallback tier');
  ok(auto.includes("tier: 'model'") && auto.includes("tier: 'none'"), 'auto-select reports which tier it used');

  const pf = read('src/pages/PickFive.tsx');
  ok(pf.includes('handleAiSelect') && pf.includes('aiSelectFive'), 'PickFive wires the AI Select button');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Copilot face + uploads, team crests, league imagery
// ═══════════════════════════════════════════════════════════════════════════════
{
  const av = read('src/components/CopilotAvatar.tsx');
  ok(av.includes('export function CopilotAvatar') && av.includes('<svg'), 'Copilot has an SVG face, not a logo');

  const cmp = read('src/components/Copilot.tsx');
  ok(cmp.includes('CopilotAvatar'), 'Copilot renders its face');
  ok(cmp.includes('pickImage') && cmp.includes('FileReader'), 'Copilot supports image upload');
  ok(cmp.includes('SpeechRecognition') || cmp.includes('getSpeechRecognition'), 'Copilot supports voice input');

  const cop = read('supabase/functions/ai-copilot/index.ts');
  ok(cop.includes('"image"') && cop.includes('base64'), 'ai-copilot accepts an image vision block');

  const badge = read('src/components/TeamBadge.tsx');
  ok(badge.includes('export function TeamBadge') && badge.includes('export function MatchupBadges'), 'TeamBadge + MatchupBadges exported');

  const today = read('src/pages/Today.tsx');
  ok(today.includes('MatchupBadges') && today.includes('leagueImage('), 'Today cards show crests + league photos');

  const imgs = read('src/data/sportsImages.ts');
  ok(imgs.includes('export function leagueImage'), 'leagueImage helper added');

  const pf = read('src/pages/PickFive.tsx');
  ok(pf.includes('MatchupBadges') && pf.includes('SPORTS_IMAGES'), 'Top Five shows crests + a hero image');
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Kraken venue + multi-broker abstraction
// ═══════════════════════════════════════════════════════════════════════════════
{
  const fn = 'supabase/functions/kraken-connector/index.ts';
  ok(fs.existsSync(path.join(ROOT, fn)), 'kraken-connector/index.ts exists');
  const src = read(fn);

  ok(src.includes('terminalAuthorized') && src.includes('rateLimited'), 'kraken-connector uses the shared gate + rate limit');
  ok(src.includes('HMAC') && src.includes('SHA-512'), 'kraken-connector signs private calls with HMAC-SHA512');
  ok(src.includes('SHA-256'), 'kraken signature hashes nonce+postdata with SHA-256');
  ok(src.includes('KRAKEN_API_KEY') && src.includes('KRAKEN_API_SECRET'), 'kraken-connector reads its API secrets');
  ok(src.includes('KRAKEN_ORDERS_ENABLED'), 'kraken orders are gated by a server flag');
  // Same route vocabulary as the Alpaca connector, so the app stays venue-agnostic.
  for (const route of ['account', 'positions', 'quotes', 'bars', 'orders', 'portfolio-history']) {
    ok(src.includes(`path === "${route}"`), `kraken-connector serves the ${route} route`);
  }
  ok(!src.match(/API-Key["']?\s*:\s*["'][A-Za-z0-9+/]{20,}/), 'no hardcoded Kraken key in source');

  const cfg = read('supabase/config.toml');
  ok(cfg.includes('[functions.kraken-connector]'), 'config has kraken-connector');
  const sec = cfg.slice(cfg.indexOf('[functions.kraken-connector]'));
  ok(sec.slice(sec.indexOf('verify_jwt')).startsWith('verify_jwt = false'), 'kraken-connector verify_jwt is false');

  const brokers = read('src/services/brokers.ts');
  ok(brokers.includes("'alpaca-paper'") && brokers.includes("'alpaca-live'") && brokers.includes("'kraken'"), 'three venues registered');
  ok(brokers.includes('depositUrl') && brokers.includes('withdrawal') && brokers.includes('funding'), 'each venue documents funding + withdrawal rails');
  ok(brokers.includes('brokerFetch'), 'brokers.ts exposes a unified fetch');
  ok(brokers.includes('getActiveBrokerId') && brokers.includes('setActiveBrokerId'), 'active venue is persisted');

  const picker = read('src/components/BrokerPicker.tsx');
  ok(picker.includes('export function BrokerPicker'), 'BrokerPicker exported');
  ok(picker.includes('Add funds'), 'BrokerPicker has an Add funds action');
  ok(picker.includes('realMoney'), 'BrokerPicker confirms before switching to a real-money venue');
  ok(picker.includes('never handles your card'), 'funding panel states the terminal does not touch card details');

  const alp = read('src/services/alpaca.ts');
  ok(alp.includes('brokerFetch'), 'alpaca.ts routes through the broker abstraction');
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: System status self-diagnosis
// ═══════════════════════════════════════════════════════════════════════════════
{
  const svc = read('src/services/systemStatus.ts');
  ok(svc.includes('export async function probeSystem'), 'probeSystem exported');
  ok(svc.includes("'not-deployed'") && svc.includes("'stale'") && svc.includes("'needs-secrets'"), 'probe distinguishes missing / stale / unkeyed');
  ok(svc.includes("auth: 'terminal' | 'anon'"), 'probe uses the right credential per function');
  // The sports functions authenticate with the anon key, not the terminal key.
  ok(/slug: 'analysis-engine'[^}]*auth: 'anon'/.test(svc), 'analysis-engine probed with the anon key');
  ok(/slug: 'alpaca-connector'[^}]*auth: 'terminal'/.test(svc), 'alpaca-connector probed with the terminal key');
  for (const fn of ['alpaca-connector', 'kraken-connector', 'ai-copilot', 'ai-picks', 'ai-analysis', 'analysis-engine', 'sports-feed', 'settle-picks']) {
    ok(svc.includes(`slug: '${fn}'`), `system status probes ${fn}`);
  }

  const cmp = read('src/components/SystemStatus.tsx');
  ok(cmp.includes('export function SystemStatus'), 'SystemStatus component exported');
  ok(cmp.includes('probeSystem'), 'SystemStatus runs the probe');
  ok(cmp.includes('Adding API keys will not help until the code is on the server'), 'SystemStatus explains why keys alone are not enough');

  const settings = read('src/pages/Settings.tsx');
  ok(settings.includes('<SystemStatus />'), 'SystemStatus rendered on the Settings page');
}

console.log(`✓ v64: ${N} assertions passed`);
