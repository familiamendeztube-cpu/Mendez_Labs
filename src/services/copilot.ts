import { terminalHeaders } from '@/lib/terminalConfig';

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`;

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CopilotContext {
  page: string;
  now: string;
  trading: {
    connected: boolean;
    env: string;
    account: {
      equity: number | null;
      lastEquity: number | null;
      cash: number | null;
      buyingPower: number | null;
      dayPnl: number | null;
      dayPnlPct: number | null;
    } | null;
    positions: Array<{
      symbol: string;
      qty: number;
      marketValue: number;
      unrealizedPl: number;
      unrealizedPlPct: number;
    }>;
    openOrders: number;
  };
  sports: {
    feedStatus: string | null;
    modelHealth: { status: string; sampleSize: number; label: string } | null;
    qualifiedPicks: Array<{
      matchup: string;
      league: string;
      market: string;
      side: string;
      odds: number;
      evPercent: number | null;
      modelProbability: number | null;
      reasoning: string;
    }>;
    excludedSample: Array<{ matchup: string; side: string; reason: string }>;
    topFive: { count: number; locked: boolean };
    bankroll: { balance: number; startingBankroll: number; settledCount: number };
  };
}

/**
 * Send the running conversation plus a snapshot of the operator's real state to
 * the ai-copilot edge function and return the assistant's reply.
 */
export async function askCopilot(
  messages: CopilotMessage[],
  context: CopilotContext,
): Promise<string> {
  const res = await fetch(FUNC_URL, {
    method: 'POST',
    headers: terminalHeaders(),
    body: JSON.stringify({ messages, context }),
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    throw new Error(data.error || `Assistant request failed (${res.status})`);
  }
  return data.reply as string;
}
