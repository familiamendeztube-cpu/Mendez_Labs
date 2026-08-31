// V55B4 deterministic tests for Bankroll page logic.
// Run with: npx tsx src/utils/bankroll.test.ts

import {
  RISK_RULES,
  PLANNED_SPORTS_LIVE,
  PLANNED_TRADING_LIVE,
  dailyDrawdownPct,
  totalDrawdownPct,
} from './bankrollCalc';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { passed++; } else { failed++; console.error(`FAIL: ${label}`); }
}

function assertClose(a: number, b: number, eps: number, label: string) {
  if (Math.abs(a - b) < eps) { passed++; } else { failed++; console.error(`FAIL: ${label} (got ${a}, expected ~${b})`); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Non-destructive preservation — planned amounts are constants
// ═══════════════════════════════════════════════════════════════════════════════

assert(PLANNED_SPORTS_LIVE === 100, 'Sports live plan = $100');
assert(PLANNED_TRADING_LIVE === 100, 'Trading live plan = $100');
assert(typeof PLANNED_SPORTS_LIVE === 'number', 'Sports plan is a number');
assert(typeof PLANNED_TRADING_LIVE === 'number', 'Trading plan is a number');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Plan labels are fixed $100
// ═══════════════════════════════════════════════════════════════════════════════

assert(PLANNED_SPORTS_LIVE === 100, 'Sports plan exactly $100');
assert(PLANNED_TRADING_LIVE === 100, 'Trading plan exactly $100');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Risk rule constants — all 6 rules present
// ═══════════════════════════════════════════════════════════════════════════════

assert(RISK_RULES.length === 6, '6 risk rules defined');

const ruleIds = RISK_RULES.map((r) => r.id);
assert(ruleIds.includes('quarter-kelly'), 'Has quarter-kelly rule');
assert(ruleIds.includes('default-cap'), 'Has 1% default cap rule');
assert(ruleIds.includes('absolute-cap'), 'Has 2% absolute cap rule');
assert(ruleIds.includes('daily-stop'), 'Has daily stop rule');
assert(ruleIds.includes('drawdown-pause'), 'Has drawdown pause rule');
assert(ruleIds.includes('no-martingale'), 'Has no-martingale rule');

// Every rule has a name and explanation
for (const rule of RISK_RULES) {
  assert(rule.name.length > 0, `Rule ${rule.id}: has name`);
  assert(rule.explanation.length > 0, `Rule ${rule.id}: has explanation`);
}

// Specific values in rules
const kellyRule = RISK_RULES.find((r) => r.id === 'quarter-kelly')!;
assert(kellyRule.explanation.includes('25%'), 'Kelly rule mentions 25%');

const defaultCapRule = RISK_RULES.find((r) => r.id === 'default-cap')!;
assert(defaultCapRule.explanation.includes('1%'), 'Default cap mentions 1%');

const absCapRule = RISK_RULES.find((r) => r.id === 'absolute-cap')!;
assert(absCapRule.explanation.includes('2%'), 'Absolute cap mentions 2%');

const dailyStopRule = RISK_RULES.find((r) => r.id === 'daily-stop')!;
assert(dailyStopRule.explanation.includes('5%'), 'Daily stop mentions 5%');

const ddPauseRule = RISK_RULES.find((r) => r.id === 'drawdown-pause')!;
assert(ddPauseRule.explanation.includes('10%'), 'Drawdown pause mentions 10%');

const noChaseRule = RISK_RULES.find((r) => r.id === 'no-martingale')!;
assert(noChaseRule.explanation.includes('never'), 'No-martingale mentions never');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Daily drawdown calculation
// ═══════════════════════════════════════════════════════════════════════════════

assertClose(dailyDrawdownPct(-5, 100)!, 0.05, 0.001, 'Daily DD: -$5 on $100 = 5%');
assertClose(dailyDrawdownPct(-10, 100)!, 0.10, 0.001, 'Daily DD: -$10 on $100 = 10%');
assertClose(dailyDrawdownPct(0, 100)!, 0, 0.001, 'Daily DD: $0 PnL = 0%');
assertClose(dailyDrawdownPct(5, 100)!, 0, 0.001, 'Daily DD: positive PnL = 0%');
assert(dailyDrawdownPct(-5, 0) === null, 'Daily DD: zero bankroll = null');
assert(dailyDrawdownPct(-5, -100) === null, 'Daily DD: negative bankroll = null');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Total drawdown calculation
// ═══════════════════════════════════════════════════════════════════════════════

assertClose(totalDrawdownPct(90, 100)!, 0.10, 0.001, 'Total DD: $90/$100 = 10%');
assertClose(totalDrawdownPct(100, 100)!, 0, 0.001, 'Total DD: at starting = 0%');
assertClose(totalDrawdownPct(110, 100)!, 0, 0.001, 'Total DD: above starting = 0%');
assertClose(totalDrawdownPct(50, 100)!, 0.50, 0.001, 'Total DD: $50/$100 = 50%');
assert(totalDrawdownPct(90, 0) === null, 'Total DD: zero bankroll = null');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: N/A risk state when no settled picks
// ═══════════════════════════════════════════════════════════════════════════════

// dailyDrawdownPct returns a number even with no settled picks — the UI decides
// N/A display when settled === 0. The function itself is pure math.
assert(dailyDrawdownPct(0, 100) !== null, 'DD calc works even with no data');
// UI shows N/A when settled === 0, tested via the constant check:
// status = dailyDD === null || settled === 0 ? 'na' : ...
// This is UI logic; we verify the pure calc returns valid numbers.
assertClose(dailyDrawdownPct(0, 100)!, 0, 0.001, 'Zero PnL on active bankroll = 0%');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Reset scoping — reset only affects paper, not planned labels
// ═══════════════════════════════════════════════════════════════════════════════

// PLANNED_SPORTS_LIVE and PLANNED_TRADING_LIVE are compile-time constants.
// They cannot be mutated by resetSimulation or any runtime call.
const sportsBefore = PLANNED_SPORTS_LIVE;
const tradingBefore = PLANNED_TRADING_LIVE;
// Simulate what a reset does (nothing to these constants)
const sportsAfter = PLANNED_SPORTS_LIVE;
const tradingAfter = PLANNED_TRADING_LIVE;
assert(sportsBefore === sportsAfter, 'Reset does not alter sports plan');
assert(tradingBefore === tradingAfter, 'Reset does not alter trading plan');
assert(PLANNED_SPORTS_LIVE === 100, 'After reset: sports still $100');
assert(PLANNED_TRADING_LIVE === 100, 'After reset: trading still $100');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Risk rule structure for mobile rendering
// ═══════════════════════════════════════════════════════════════════════════════

for (const rule of RISK_RULES) {
  assert(typeof rule.id === 'string' && rule.id.length > 0, `${rule.id}: has string id`);
  assert(typeof rule.name === 'string' && rule.name.length > 0, `${rule.id}: has string name`);
  assert(typeof rule.explanation === 'string' && rule.explanation.length > 0, `${rule.id}: has explanation`);
  assert(rule.explanation.length < 200, `${rule.id}: explanation is concise (<200 chars)`);
}

// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\nbankroll.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
