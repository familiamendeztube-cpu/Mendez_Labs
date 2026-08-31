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

export function autoSelectBestFive(
  rankedPicks: RankedPick[],
  bankroll: number,
): { selected: RankedPick[]; explanation: string | null } {
  const eligible = rankedPicks
    .filter((p) => p.qualified && p.pFinal !== null && p.evPercent !== null)
    .sort((a, b) => autoSelectScore(b) - autoSelectScore(a));

  if (eligible.length === 0) {
    return { selected: [], explanation: 'No qualified predictions with complete probability data are available right now.' };
  }

  const selected: RankedPick[] = [];
  const seenEvents = new Set<string>();
  const seenLeagues = new Map<string, number>();

  for (const pick of eligible) {
    if (selected.length >= 5) break;

    if (seenEvents.has(pick.eventId)) continue;

    if (isCorrelatedPick(pick, selected)) continue;

    const leagueCount = seenLeagues.get(pick.league) ?? 0;
    const eligibleAfter = eligible.filter(
      (p) =>
        p.league !== pick.league &&
        !seenEvents.has(p.eventId) &&
        !isCorrelatedPick(p, [...selected, pick]),
    );
    if (leagueCount >= 2 && eligibleAfter.length > 0 && selected.length < 4) continue;

    const { stake } = quarterKellyStake(pick.pFinal, pick.offeredDecimal, bankroll);
    if (stake <= 0) continue;

    selected.push(pick);
    seenEvents.add(pick.eventId);
    seenLeagues.set(pick.league, leagueCount + 1);
  }

  const explanation = selected.length < 5
    ? `Only ${selected.length} prediction${selected.length === 1 ? '' : 's'} passed all qualification gates and diversification checks. Remaining slots stay empty until more data is available.`
    : null;

  return { selected, explanation };
}
