// Auto-select logic for the Pick Five page.
// Pure, deterministic, no side effects.

import { quarterKellyStake, isCorrelatedPick } from './valueEngine';
import type { RankedPick } from '@/services/liveData';

const FRESHNESS_CAP_MS = 900_000;

export function autoSelectScore(pick: RankedPick): number {
  if (!pick.qualified) return -Infinity;
  if (pick.pFinal === null || pick.evPercent === null) return -Infinity;
  const evScore = Math.max(0, pick.evPercent) * 0.4;
  const qualityScore = pick.dataCompleteness * 0.3;
  const freshScore = Math.max(0, 1 - pick.freshnessMs / FRESHNESS_CAP_MS) * 0.3;
  return evScore + qualityScore + freshScore;
}

// Market-value score for the fallback tier: used when the Elo model has no
// history yet and nothing passes the strict gates. Ranks purely on the value
// the market itself is showing — where the offered price beats consensus,
// backed by enough books and a fresh line. Never fabricates an edge.
export function marketValueScore(pick: RankedPick): number {
  const ev = pick.evPercent ?? pick.marketValueEdge ?? 0;
  const evScore = Math.max(0, ev) * 0.5;
  const bookScore = Math.min(1, pick.bookmakerCount / 8) * 0.3;
  const freshScore = Math.max(0, 1 - pick.freshnessMs / FRESHNESS_CAP_MS) * 0.2;
  return evScore + bookScore + freshScore;
}

interface AutoSelectResult {
  selected: RankedPick[];
  explanation: string | null;
  /** 'model' = passed all Elo gates. 'market' = fallback ranking on market value. */
  tier: 'model' | 'market' | 'none';
}

function diversify(
  ranked: RankedPick[],
  bankroll: number,
  requireStake: boolean,
): RankedPick[] {
  const selected: RankedPick[] = [];
  const seenEvents = new Set<string>();
  const seenLeagues = new Map<string, number>();

  for (const pick of ranked) {
    if (selected.length >= 5) break;
    if (seenEvents.has(pick.eventId)) continue;
    if (isCorrelatedPick(pick, selected)) continue;

    const leagueCount = seenLeagues.get(pick.league) ?? 0;
    const eligibleAfter = ranked.filter(
      (p) =>
        p.league !== pick.league &&
        !seenEvents.has(p.eventId) &&
        !isCorrelatedPick(p, [...selected, pick]),
    );
    if (leagueCount >= 2 && eligibleAfter.length > 0 && selected.length < 4) continue;

    if (requireStake && pick.pFinal !== null) {
      const { stake } = quarterKellyStake(pick.pFinal, pick.offeredDecimal, bankroll);
      if (stake <= 0) continue;
    }

    selected.push(pick);
    seenEvents.add(pick.eventId);
    seenLeagues.set(pick.league, leagueCount + 1);
  }
  return selected;
}

export function autoSelectBestFive(rankedPicks: RankedPick[], bankroll: number): AutoSelectResult {
  // Tier 1 — picks that pass every Elo qualification gate.
  const modelEligible = rankedPicks
    .filter((p) => p.qualified && p.pFinal !== null && p.evPercent !== null)
    .sort((a, b) => autoSelectScore(b) - autoSelectScore(a));

  if (modelEligible.length > 0) {
    const selected = diversify(modelEligible, bankroll, true);
    return {
      selected,
      tier: 'model',
      explanation:
        selected.length < 5
          ? `${selected.length} pick${selected.length === 1 ? '' : 's'} passed every qualification gate. The rest of the slate didn't clear the bar today.`
          : null,
    };
  }

  // Tier 2 — model has no history yet. Fall back to market value: positive
  // expected value from the offered odds vs consensus, enough books, fresh line.
  const marketEligible = rankedPicks
    .filter((p) => {
      const ev = p.evPercent ?? p.marketValueEdge;
      return ev !== null && ev > 0 && p.bookmakerCount >= 3;
    })
    .sort((a, b) => marketValueScore(b) - marketValueScore(a));

  if (marketEligible.length > 0) {
    const selected = diversify(marketEligible, bankroll, false);
    return {
      selected,
      tier: 'market',
      explanation: `The Elo model is still building game history, so nothing clears the full model gates yet. These ${selected.length} are ranked by market value — where the offered price beats the consensus line. Treat them as watch-list, not signal.`,
    };
  }

  return {
    selected: [],
    tier: 'none',
    explanation:
      "No value anywhere on today's board — every price is at or worse than consensus. Nothing to play today.",
  };
}
