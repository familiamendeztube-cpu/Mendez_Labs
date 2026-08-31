// Deterministic calculation utilities for the Mendez Labs Pick Five workflow.
// All functions are pure and testable — no side effects, no I/O.

import type { FrozenPick, PickResult, SettledPick, PickFiveSet } from '@/types/models';

// ── American odds conversions ───────────────────────────────────────────────

export function americanToImpliedProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

export function americanToDecimalOdds(odds: number): number {
  if (odds > 0) return odds / 100 + 1;
  return 100 / -odds + 1;
}

export function payoutMultiplier(odds: number): number {
  if (odds > 0) return odds / 100;
  return 100 / -odds;
}

// ── Edge calculation ─────────────────────────────────────────────────────────

export function calculateEdge(modelProbability: number, impliedProbability: number): number {
  return modelProbability - impliedProbability;
}

export function calculateEdgeFromOdds(modelProbability: number, americanOdds: number): number {
  const implied = americanToImpliedProb(americanOdds);
  return modelProbability - implied;
}

// ── Win percentage (excludes pushes/voids/pending) ───────────────────────────

export interface RecordSummary {
  won: number;
  lost: number;
  push: number;
  pending: number;
  void: number;
  total: number;
  settled: number;
  winPercentage: number;
}

export function computeRecord(picks: { result: PickResult }[]): RecordSummary {
  const won = picks.filter((p) => p.result === 'won').length;
  const lost = picks.filter((p) => p.result === 'lost').length;
  const push = picks.filter((p) => p.result === 'push').length;
  const pending = picks.filter((p) => p.result === 'pending').length;
  const voidCount = picks.filter((p) => p.result === 'void').length;
  const settled = won + lost;
  const total = picks.length;
  const winPercentage = settled > 0 ? won / settled : 0;
  return { won, lost, push, pending, void: voidCount, total, settled, winPercentage };
}

// ── Paper P/L from American odds ────────────────────────────────────────────

export function paperProfitLoss(stake: number, odds: number, result: PickResult): number {
  if (result === 'won') return stake * payoutMultiplier(odds);
  if (result === 'lost') return -stake;
  return 0;
}

// ── Date grouping ────────────────────────────────────────────────────────────

export function groupByDate<T extends { date?: string; startTime?: string; frozenAt?: string; settledAt?: string }>(
  items: T[],
  dateKey: (item: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = dateKey(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export function formatDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function formatDateDisplay(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function isWithinDays(dateKey: string, days: number): boolean {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  cutoff.setUTCHours(0, 0, 0, 0);
  return new Date(dateKey + 'T12:00:00Z') >= cutoff;
}

// ── Pick Five validation ────────────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function canAddPick(
  pickFiveSet: PickFiveSet,
  newPick: { opportunityId: string; matchup: string; startTime: string },
): ValidationResult {
  if (pickFiveSet.locked) {
    return { ok: false, reason: 'Pick Five is locked. Use Replace to make changes.' };
  }
  if (pickFiveSet.picks.length >= 5) {
    return { ok: false, reason: 'All five slots are filled. Remove a pick first.' };
  }
  // No duplicate games
  if (pickFiveSet.picks.some((p) => p.matchup === newPick.matchup)) {
    return { ok: false, reason: 'This game is already in your Pick Five.' };
  }
  // No picks after game started
  if (new Date(newPick.startTime).getTime() < Date.now()) {
    return { ok: false, reason: 'This game has already started.' };
  }
  return { ok: true };
}

export function canReplacePick(
  pickFiveSet: PickFiveSet,
  slot: number,
  newPick: { opportunityId: string; matchup: string; startTime: string },
): ValidationResult {
  if (!pickFiveSet.locked) {
    return { ok: false, reason: 'Pick Five is not locked yet.' };
  }
  // No duplicate games (excluding the slot being replaced)
  const otherPicks = pickFiveSet.picks.filter((p) => p.slot !== slot);
  if (otherPicks.some((p) => p.matchup === newPick.matchup)) {
    return { ok: false, reason: 'This game is already in your Pick Five.' };
  }
  // No picks after game started
  if (new Date(newPick.startTime).getTime() < Date.now()) {
    return { ok: false, reason: 'This game has already started.' };
  }
  return { ok: true };
}

export function isContradictory(
  existingPicks: FrozenPick[],
  newPick: { matchup: string; market: string; side: string },
): boolean {
  // Same game, opposite side of same market
  const sameGame = existingPicks.filter((p) => p.matchup === newPick.matchup);
  for (const p of sameGame) {
    if (p.market === newPick.market) {
      // If sides are opposite (e.g. Over vs Under, or different teams)
      if (p.side !== newPick.side) return true;
    }
  }
  return false;
}

export function canLockPickFive(pickFiveSet: PickFiveSet): ValidationResult {
  if (pickFiveSet.picks.length !== 5) {
    return { ok: false, reason: `Need 5 picks to lock. You have ${pickFiveSet.picks.length}.` };
  }
  if (pickFiveSet.locked) {
    return { ok: false, reason: 'Pick Five is already locked.' };
  }
  return { ok: true };
}

// ── Settlement ──────────────────────────────────────────────────────────────

export function settlePick(
  pick: FrozenPick,
  result: PickResult,
  finalScore: string,
  closingOdds?: number,
): SettledPick {
  const profitLoss = paperProfitLoss(pick.suggestedStake, pick.odds, result);
  const beatClosingLine = closingOdds !== undefined
    ? (result === 'won' && closingOdds < pick.odds) || (result === 'lost' && closingOdds > pick.odds)
    : undefined;
  return {
    ...pick,
    result,
    finalScore,
    profitLoss,
    closingOdds,
    beatClosingLine,
    settledAt: new Date().toISOString(),
  };
}

// ── Aggregate record summaries ──────────────────────────────────────────────

export function aggregateRecords(dayRecords: { record: RecordSummary }[]): RecordSummary {
  const won = dayRecords.reduce((s, r) => s + r.record.won, 0);
  const lost = dayRecords.reduce((s, r) => s + r.record.lost, 0);
  const push = dayRecords.reduce((s, r) => s + r.record.push, 0);
  const pending = dayRecords.reduce((s, r) => s + r.record.pending, 0);
  const voidCount = dayRecords.reduce((s, r) => s + r.record.void, 0);
  const settled = won + lost;
  const total = won + lost + push + pending + voidCount;
  const winPercentage = settled > 0 ? won / settled : 0;
  return { won, lost, push, pending, void: voidCount, total, settled, winPercentage };
}

export function totalProfitLoss(dayRecords: { dailyProfit: number }[]): number {
  return dayRecords.reduce((s, r) => s + r.dailyProfit, 0);
}

// ── Plain-English bet label ──────────────────────────────────────────────────

export function plainEnglishBet(market: string, side: string, _matchup?: string): string {
  void _matchup;
  if (market === 'Moneyline') {
    return `Bet on ${side} to win outright`;
  }
  if (market === 'Spread' || market === 'Handicap') {
    const tokens = side.split(/\s+/);
    const teamAbbr = tokens[0];
    const line = tokens.slice(1).join(' ');
    if (line === 'PK') return `Bet on ${teamAbbr} at pick'em (no points)`;
    return `Bet on ${teamAbbr} ${line} points`;
  }
  if (market === 'Total') {
    const direction = side.startsWith('Over') ? 'Over' : 'Under';
    const total = side.replace(/^(Over|Under)\s+/, '');
    return `Bet ${direction} ${total} total points`;
  }
  if (market === 'Run Line') {
    return `Bet on ${side} (baseball run line)`;
  }
  if (market === 'Puck Line') {
    return `Bet on ${side} (hockey puck line)`;
  }
  if (market === '1X2') {
    return `Bet on ${side} (soccer 3-way)`;
  }
  return `${market} · ${side}`;
}
