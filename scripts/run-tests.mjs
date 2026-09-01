#!/usr/bin/env node
// Test runner for the standalone *.test.ts scripts. Each file is a script
// that runs its own assert() calls and exits non-zero on failure. This
// runner executes every one through tsx, aggregates the results, and exits
// non-zero if any file failed — so `npm test` and CI have a single gate.

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;

function findTests(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      out.push(...findTests(full));
    } else if (entry.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

const files = findTests(join(ROOT, 'src')).sort();
if (files.length === 0) {
  console.log('No *.test.ts files found.');
  process.exit(0);
}

let failed = 0;
const started = Date.now();

for (const file of files) {
  const rel = relative(ROOT, file);
  const res = spawnSync('npx', ['tsx', file], { cwd: ROOT, encoding: 'utf8' });
  const output = (res.stdout || '') + (res.stderr || '');
  const ok = res.status === 0;
  if (!ok) failed++;
  // Surface the summary line each file prints, plus any failures.
  const summary = output.trim().split('\n').filter((l) => /passed|failed|FAIL|Error/i.test(l)).slice(-3).join(' | ');
  console.log(`${ok ? '✓' : '✗'}  ${rel}${summary ? '  —  ' + summary : ''}`);
  if (!ok) console.log(output.trim().split('\n').slice(-15).map((l) => '     ' + l).join('\n'));
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${files.length - failed}/${files.length} test files passed  (${secs}s)`);
process.exit(failed > 0 ? 1 : 0);
