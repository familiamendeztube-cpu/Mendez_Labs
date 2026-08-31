// Honest odds mathematics — all functions pure and deterministic.
// No invented probabilities. Edge is labeled "market value edge", not model advantage.

// ── Helpers ─────────────────────────────────────────────────────────────────

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function trimmedMean(values: number[], trimFraction = 0.2): number {
  if (values.length === 0) return NaN;
  if (values.length <= 2) return values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * trimFraction);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  if (trimmed.length === 0) return median(values);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

// ── American odds conversions ──────────────────────────────────────────────

export function americanToImpliedProb(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) return NaN;
  if (odds > 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

export function americanToDecimalOdds(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) return NaN;
  if (odds > 0) return odds / 100 + 1;
  return 100 / -odds + 1;
}

export function decimalToAmerican(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) return NaN;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

export function payoutMultiplier(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) return NaN;
  if (odds > 0) return odds / 100;
  return 100 / -odds;
}

// ── No-vig: 2-way market (single bookmaker) ────────────────────────────────
// Given two sides of a two-way market from the SAME bookmaker,
// remove the vig to get the "true" market probability per side.

export function noVigConsensus(sideAOdds: number, sideBOdds: number): {
  probA: number;
  probB: number;
  vigPercent: number;
} {
  const impliedA = americanToImpliedProb(sideAOdds);
  const impliedB = americanToImpliedProb(sideBOdds);
  if (!Number.isFinite(impliedA) || !Number.isFinite(impliedB)) {
    return { probA: NaN, probB: NaN, vigPercent: NaN };
  }
  const total = impliedA + impliedB;
  if (total === 0) return { probA: NaN, probB: NaN, vigPercent: NaN };
  const probA = impliedA / total;
  const probB = impliedB / total;
  const vigPercent = total - 1;
  return { probA, probB, vigPercent };
}

// ── No-vig: N-way market (single bookmaker) ────────────────────────────────
// For 1X2 (3-way) or any N-outcome market from the SAME bookmaker,
// normalize the implied probabilities so they sum to 1.

export function noVigNWay(outcomePrices: number[]): number[] {
  if (outcomePrices.length === 0) return [];
  const implied = outcomePrices.map(americanToImpliedProb);
  if (implied.some((p) => !Number.isFinite(p) || p <= 0)) return [];
  const total = implied.reduce((s, p) => s + p, 0);
  if (total === 0) return [];
  return implied.map((p) => p / total);
}

// ── Median no-vig consensus across bookmakers (2-way) ───────────────────────
// For each bookmaker, compute the no-vig probability for side A.
// Return the median across bookmakers. Each pair is from the SAME
// bookmaker + event + market. Never mix sides/books/events/markets.

export interface BookmakerPair {
  name: string;
  sideAOdds: number;
  sideBOdds: number;
}

export function medianNoVigConsensus(
  pairs: BookmakerPair[],
  minBookmakers = 3,
): { probA: number; probB: number; bookmakerCount: number; valid: boolean } {
  const validProbs: { probA: number; probB: number }[] = [];

  for (const pair of pairs) {
    if (isMalformedOdds(pair.sideAOdds) || isMalformedOdds(pair.sideBOdds)) continue;
    const nv = noVigConsensus(pair.sideAOdds, pair.sideBOdds);
    if (!Number.isFinite(nv.probA) || !Number.isFinite(nv.probB)) continue;
    if (nv.probA <= 0 || nv.probA >= 1 || nv.probB <= 0 || nv.probB >= 1) continue;
    validProbs.push({ probA: nv.probA, probB: nv.probB });
  }

  if (validProbs.length < minBookmakers) {
    return { probA: NaN, probB: NaN, bookmakerCount: validProbs.length, valid: false };
  }

  const medA = median(validProbs.map((p) => p.probA));
  const medB = median(validProbs.map((p) => p.probB));
  // Re-normalize after taking medians to ensure sum = 1
  const total = medA + medB;
  return {
    probA: medA / total,
    probB: medB / total,
    bookmakerCount: validProbs.length,
    valid: true,
  };
}

// ── Median no-vig consensus across bookmakers (N-way) ───────────────────────

export interface BookmakerNWay {
  name: string;
  outcomePrices: number[]; // one price per outcome, in consistent order
}

export function medianNoVigNWay(
  books: BookmakerNWay[],
  minBookmakers = 3,
): { probs: number[]; bookmakerCount: number; valid: boolean } {
  if (books.length === 0) return { probs: [], bookmakerCount: 0, valid: false };
  const outcomeCount = books[0].outcomePrices.length;
  if (outcomeCount < 2) return { probs: [], bookmakerCount: 0, valid: false };

  const validRows: number[][] = [];
  for (const book of books) {
    if (book.outcomePrices.length !== outcomeCount) continue;
    if (book.outcomePrices.some((p) => isMalformedOdds(p))) continue;
    const nv = noVigNWay(book.outcomePrices);
    if (nv.length !== outcomeCount) continue;
    if (nv.some((p) => !Number.isFinite(p) || p <= 0 || p >= 1)) continue;
    validRows.push(nv);
  }

  if (validRows.length < minBookmakers) {
    return { probs: [], bookmakerCount: validRows.length, valid: false };
  }

  const medians: number[] = [];
  for (let i = 0; i < outcomeCount; i++) {
    medians.push(median(validRows.map((row) => row[i])));
  }
  // Re-normalize
  const total = medians.reduce((s, p) => s + p, 0);
  const probs = medians.map((p) => p / total);

  return { probs, bookmakerCount: validRows.length, valid: true };
}

// ── Best price selection ─────────────────────────────────────────────────────

export function bestPrice(odds: number[]): number | null {
  if (!odds || odds.length === 0) return null;
  const valid = odds.filter((o) => !isMalformedOdds(o));
  if (valid.length === 0) return null;
  return valid.reduce((best, o) => {
    return americanToDecimalOdds(o) > americanToDecimalOdds(best) ? o : best;
  });
}

// ── Market value edge ────────────────────────────────────────────────────────

export function marketValueEdge(bestOdds: number, consensusProb: number): number {
  if (!Number.isFinite(consensusProb) || !Number.isFinite(bestOdds)) return NaN;
  const impliedAtBest = americanToImpliedProb(bestOdds);
  if (!Number.isFinite(impliedAtBest)) return NaN;
  return consensusProb - impliedAtBest;
}

// ── Event matching confidence ───────────────────────────────────────────────

export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\./g, '')
    .replace(/\bcity of\b/g, '')
    .replace(/\bthe\b/g, '')
    .replace(/\bfc\b/g, '')
    .replace(/\bsc\b/g, '')
    .replace(/\bclub\b/g, '')
    .replace(/\bteam\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function teamMatchConfidence(nameA: string, nameB: string): number {
  const a = normalizeTeamName(nameA);
  const b = normalizeTeamName(nameB);
  if (a === b) return 1.0;

  if (a.includes(b) || b.includes(a)) {
    const shorter = Math.min(a.length, b.length);
    if (shorter >= 3) return 0.85;
    return 0.3;
  }

  const tokensA = new Set(a.split(' '));
  const tokensB = new Set(b.split(' '));
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  if (union === 0) return 0;
  const jaccard = intersection / union;

  if (jaccard >= 0.5) return 0.7 + jaccard * 0.3;
  if (jaccard >= 0.25) return 0.4 + jaccard * 0.6;
  return jaccard * 0.5;
}

// ── Exclusion filters ────────────────────────────────────────────────────────

export function isStaleOrStarted(startTime: string, now: Date = new Date()): boolean {
  const start = new Date(startTime).getTime();
  return start <= now.getTime();
}

export function isMalformedOdds(odds: number): boolean {
  if (!Number.isFinite(odds)) return true;
  if (odds === 0) return true;
  if (Math.abs(odds) > 100000) return true;
  return false;
}

// ── Probability / price sanity ──────────────────────────────────────────────

export function isProbabilityConsistentWithOdds(
  probability: number,
  americanOdds: number,
  tolerancePp = 0.30,
): boolean {
  if (!Number.isFinite(probability) || !Number.isFinite(americanOdds)) return false;
  const implied = americanToImpliedProb(americanOdds);
  if (!Number.isFinite(implied)) return false;
  return Math.abs(probability - implied) <= tolerancePp;
}

// ── Fair price & EV ──────────────────────────────────────────────────────────

export function fairDecimalPrice(p: number): number | null {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
  return 1 / p;
}

export function expectedValue(p: number, decimalOdds: number): number | null {
  if (!Number.isFinite(p) || !Number.isFinite(decimalOdds)) return null;
  if (p <= 0 || p >= 1 || decimalOdds <= 1) return null;
  return p * decimalOdds - 1;
}

// ── Ranking ──────────────────────────────────────────────────────────────────

export interface RankableEvent {
  eventId: string;
  edge: number;
  bookmakerCount: number;
  dataCompleteness: number;
  freshnessMs: number;
  matchConfidence: number;
  marketValueEdge: number;
}

export function rankEvents(events: RankableEvent[]): RankableEvent[] {
  return [...events].sort((a, b) => {
    if (b.bookmakerCount !== a.bookmakerCount) return b.bookmakerCount - a.bookmakerCount;
    if (Math.abs(b.marketValueEdge - a.marketValueEdge) > 0.001) {
      return b.marketValueEdge - a.marketValueEdge;
    }
    return a.freshnessMs - b.freshnessMs;
  });
}

// ── Settlement ───────────────────────────────────────────────────────────────

export type SettlementResult = 'won' | 'lost' | 'push' | 'void';

export function settleMoneyline(pickSide: string, homeScore: number, awayScore: number, isHomePick: boolean): SettlementResult {
  void pickSide;
  if (homeScore === awayScore) return 'push';
  const homeWon = homeScore > awayScore;
  if (isHomePick) return homeWon ? 'won' : 'lost';
  return homeWon ? 'lost' : 'won';
}

export function settleSpread(pickSide: string, homeScore: number, awayScore: number, isHomePick: boolean, line: number): SettlementResult {
  const pickScore = isHomePick ? homeScore : awayScore;
  const oppScore = isHomePick ? awayScore : homeScore;
  const margin = pickScore - oppScore + line;
  if (margin > 0) return 'won';
  if (margin < 0) return 'lost';
  return 'push';
}

export function settleTotal(pickSide: string, homeScore: number, awayScore: number, totalLine: number): SettlementResult {
  const combined = homeScore + awayScore;
  const isOver = pickSide.toLowerCase().startsWith('over');
  if (combined === totalLine) return 'push';
  if (isOver) return combined > totalLine ? 'won' : 'lost';
  return combined < totalLine ? 'won' : 'lost';
}

export function settleSoccer1x2(pickSide: string, homeScore: number, awayScore: number): SettlementResult {
  const side = pickSide.toLowerCase().trim();
  if (homeScore === awayScore) {
    return side === 'draw' || side === 'x' ? 'won' : 'lost';
  }
  if (homeScore > awayScore) {
    return side === 'home' || side === '1' ? 'won' : 'lost';
  }
  return side === 'away' || side === '2' ? 'won' : 'lost';
}
