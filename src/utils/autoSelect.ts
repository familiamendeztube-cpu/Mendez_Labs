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
  maxPerLeague = 2,
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
    if (leagueCount >= maxPerLeague && eligibleAfter.length > 0 && selected.length < 4) continue;

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
  if (rankedPicks.length === 0) {
    return {
      selected: [],
      tier: 'none',
      explanation:
        "Today's board hasn't loaded yet — the odds feed is catching up. Hit Refresh in a moment and try again.",
    };
  }

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

  const marketSelected = marketEligible.length > 0 ? diversify(marketEligible, bankroll, false) : [];

  // Tier 3 — top up to a full card with the highest win-probability plays left
  // on the board, even where there's no market edge. Clearly flagged: these are
  // "best available", not value bets.
  if (marketSelected.length < 5) {
    const winProb = (p: RankedPick) => p.pModel ?? p.pFinal ?? p.consensusProbability ?? 0;
    const chosen = new Set(marketSelected.map((p) => `${p.eventId}|${p.market}|${p.side}`));
    const rest = rankedPicks
      .filter((p) => !chosen.has(`${p.eventId}|${p.market}|${p.side}`) && winProb(p) > 0)
      .sort((a, b) => winProb(b) - winProb(a));
    const merged = [...marketSelected, ...rest];
    // Try for a full five; loosen the per-league cap if the board is thin.
    let topped = diversify(merged, bankroll, false);
    if (topped.length < 5) topped = diversify(merged, bankroll, false, 3);
    if (topped.length < 5) topped = diversify(merged, bankroll, false, 5);
    if (topped.length > marketSelected.length) {
      return {
        selected: topped,
        tier: 'market',
        explanation:
          marketSelected.length > 0
            ? `${marketSelected.length} of these beat the consensus line; the rest are the highest win-probability plays left on the board (no market edge). The Elo model is still building history — treat the whole card as watch-list.`
            : `Nothing on today's board beats the consensus line, so these are simply the highest win-probability plays available. No edge — watch-list only until the Elo model has game history.`,
      };
    }
  }

  if (marketSelected.length > 0) {
    const short = marketSelected.length < 5
      ? ` Only ${marketSelected.length} slot${marketSelected.length === 1 ? '' : 's'} filled — today's board has few independent games to choose from (one pick per game, no shared teams).`
      : '';
    return {
      selected: marketSelected,
      tier: 'market',
      explanation: `The Elo model is still building game history, so nothing clears the full model gates. These are ranked by market value — where the offered price beats the consensus line. Watch-list, not signal.${short}`,
    };
  }

  return {
    selected: [],
    tier: 'none',
    explanation:
      "Today's board hasn't loaded any playable games yet — hit Refresh in a moment and try again.",
  };
}
