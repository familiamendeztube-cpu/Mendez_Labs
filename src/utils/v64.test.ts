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

  ok(src.includes('x-terminal-key') && src.includes('TERMINAL_ACCESS_KEY'), 'copilot checks the shared terminal key');
  ok(src.includes('ANTHROPIC_API_KEY'), 'copilot uses the Anthropic key');
  ok(src.includes('api.anthropic.com/v1/messages'), 'copilot calls the Claude messages API');
  ok(src.includes('claude-sonnet-5') || src.includes('claude-opus-5'), 'copilot targets a current Claude model');
  ok(src.includes('system'), 'copilot sends a system prompt');
  ok(/do NOT place trades|never place|advice only|advice and analysis/i.test(src), 'copilot system prompt forbids taking actions');
  ok(src.includes('Access-Control-Allow-Headers') && src.includes('x-terminal-key'), 'copilot CORS allows the terminal key header');
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
  ok(src.includes('x-terminal-key') && src.includes('TERMINAL_ACCESS_KEY'), 'ai-picks checks the terminal key');
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

console.log(`✓ v64: ${N} assertions passed`);
