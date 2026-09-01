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

console.log(`✓ v64: ${N} assertions passed`);
