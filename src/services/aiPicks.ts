import { terminalHeaders } from '@/lib/terminalConfig';
import type { RankedPick } from '@/services/liveData';

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-picks`;

export interface AiSelectedPick {
  eventId: string;
  side: string;
  market: string;
  rank: number;
  confidence: number;
  rationale: string;
}

export interface AiSelectResult {
  summary: string;
  picks: AiSelectedPick[];
}

/**
 * Ask Claude to rank the best five plays from the day's full slate — including
 * predictions that don't clear the strict Elo gates. Returns its picks plus a
 * read of the board. The operator still locks the card.
 */
export async function aiSelectFive(
  rankedPicks: RankedPick[],
  bankroll: number,
): Promise<AiSelectResult> {
  const candidates = rankedPicks.slice(0, 60).map((p) => ({
    eventId: p.eventId,
    matchup: `${p.homeTeam} vs ${p.awayTeam}`,
    league: p.league,
    market: p.market,
    side: p.side,
    americanOdds: p.bestOdds,
    evPercent: p.evPercent,
    modelProbability: p.pModel,
    marketProbability: p.pFinal,
    bookmakerCount: p.bookmakerCount,
    startTime: p.startTime,
    qualified: p.qualified,
    exclusionReason: p.exclusionReason,
  }));

  const res = await fetch(FUNC_URL, {
    method: 'POST',
    headers: terminalHeaders(),
    body: JSON.stringify({ candidates, bankroll }),
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `AI Select failed (${res.status})`);
  return { summary: data.summary ?? '', picks: data.picks ?? [] };
}
