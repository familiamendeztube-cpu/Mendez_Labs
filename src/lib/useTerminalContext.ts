import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '@/store/StoreContext';
import { useLiveTrading } from '@/services/tradingLive';
import { getTradingEnv } from '@/services/alpaca';
import type { CopilotContext } from '@/services/copilot';

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Trading Command Center',
  '/signals': 'Trade Signals',
  '/portfolio': 'Paper Portfolio',
  '/performance': 'Performance',
  '/sports/today': "Today's Analysis",
  '/sports/pick-five': 'Top Five',
  '/sports/results': 'Results',
  '/sports/bankroll': 'Bankroll',
  '/sports/intel': 'Sports Intelligence',
  '/settings': 'Settings',
};

function num(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Assembles a plain snapshot of the operator's real state — Alpaca account,
 * open positions, today's sports picks, bankroll — for the Copilot to reason
 * over. Polls Alpaca slowly (60s); the chat only needs a fresh-enough picture.
 */
export function useTerminalContext(): () => CopilotContext {
  const location = useLocation();
  const store = useStore();
  const live = useLiveTrading(60_000);

  return useCallback((): CopilotContext => {
    const acct = live.account;
    const equity = num(acct?.equity ?? null);
    const lastEquity = num(acct?.last_equity ?? null);
    const dayPnl = equity !== null && lastEquity !== null ? equity - lastEquity : null;
    const dayPnlPct =
      dayPnl !== null && lastEquity ? (dayPnl / lastEquity) * 100 : null;

    const qualified = store.rankedPicks.filter((p) => p.qualified);
    const excluded = store.rankedPicks.filter((p) => !p.qualified);

    return {
      page: PAGE_NAMES[location.pathname] ?? location.pathname,
      now: new Date().toISOString(),
      trading: {
        connected: live.connected,
        env: getTradingEnv(),
        account: acct
          ? {
              equity,
              lastEquity,
              cash: num(acct.cash),
              buyingPower: num(acct.buying_power),
              dayPnl,
              dayPnlPct,
            }
          : null,
        positions: live.positions.map((p) => ({
          symbol: p.symbol,
          qty: num(p.qty) ?? 0,
          marketValue: num(p.market_value) ?? 0,
          unrealizedPl: num(p.unrealized_pl) ?? 0,
          unrealizedPlPct: (num(p.unrealized_plpc) ?? 0) * 100,
        })),
        openOrders: live.orders.filter((o) =>
          ['new', 'partially_filled', 'accepted', 'pending_new'].includes(o.status),
        ).length,
      },
      sports: {
        feedStatus: store.feedProvider?.status ?? null,
        modelHealth: store.modelHealth
          ? {
              status: store.modelHealth.status,
              sampleSize: store.modelHealth.sampleSize,
              label: store.modelHealth.label,
            }
          : null,
        qualifiedPicks: qualified.slice(0, 12).map((p) => ({
          matchup: `${p.homeTeam} vs ${p.awayTeam}`,
          league: p.league,
          market: p.market,
          side: p.side,
          odds: p.bestOdds,
          evPercent: p.evPercent,
          modelProbability: p.pFinal,
          reasoning: p.reasoning,
        })),
        excludedSample: excluded.slice(0, 8).map((p) => ({
          matchup: `${p.homeTeam} vs ${p.awayTeam}`,
          side: p.side,
          reason: p.exclusionReason ?? 'not qualified',
        })),
        topFive: {
          count: store.pickFiveToday.picks.length,
          locked: store.pickFiveToday.locked,
        },
        bankroll: {
          balance: store.metrics.currentBalance,
          startingBankroll: store.riskSettings.startingBankroll,
          settledCount: store.settledHistory.length,
        },
      },
    };
  }, [location.pathname, store, live]);
}
