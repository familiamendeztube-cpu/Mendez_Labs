import { Lock, AlertTriangle, Shield, Activity, Radio, CheckCircle2, XCircle, Minus } from 'lucide-react';
import { fmtCurrency } from '@/utils/format';
import {
  defaultConnections,
  defaultChecklist,
  isLiveReady,
  emptyAccountMetrics,
  emptySignalMetrics,
  connectionStatusLabel,
  TRADING_PLANNED_LIVE,
  TRADING_DEFAULT_RISK_PCT,
  TRADING_ABSOLUTE_RISK_PCT,
  TRADING_DAILY_STOP_PCT,
  TRADING_DRAWDOWN_PAUSE_PCT,
  WATCHLIST_COLUMNS,
  type ConnectionCard,
  type ChecklistItem,
} from '@/utils/tradingCalc';

export function Trading() {
  const connections = defaultConnections();
  const checklist = defaultChecklist();
  const liveReady = isLiveReady(checklist);
  const acctMetrics = emptyAccountMetrics();
  const sigMetrics = emptySignalMetrics();

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="serif text-3xl font-normal" style={{ color: '#F1F0EC', letterSpacing: '-0.03em' }}>
          Trading
        </h1>
        <p className="mt-1 text-base" style={{ color: '#737A76' }}>
          Paper trading signals and execution readiness. No live orders.
        </p>
      </div>

      {/* Lock banner */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ background: 'rgba(224,165,50,0.06)', border: '1px solid rgba(224,165,50,0.15)' }}
      >
        <Lock className="h-5 w-5 shrink-0" style={{ color: '#E0A532' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#E0A532' }}>Live trading locked</p>
          <p className="text-xs" style={{ color: '#737A76' }}>Paper mode only. All execution readiness checks must pass before live trading can be enabled.</p>
        </div>
      </div>

      {/* Connection cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {connections.map((c) => (
          <ConnectionCardUI key={c.id} card={c} />
        ))}
      </div>

      {/* Account metrics */}
      <div className="rounded-2xl p-5" style={{ background: '#0C0F0D', border: '1px solid rgba(220,225,222,0.08)' }}>
        <h2 className="text-base font-semibold mb-3" style={{ color: '#F1F0EC' }}>Account metrics</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <MetricBox label="Equity" value={acctMetrics.equity !== null ? fmtCurrency(acctMetrics.equity) : 'N/A'} />
          <MetricBox label="Cash" value={acctMetrics.cash !== null ? fmtCurrency(acctMetrics.cash) : 'N/A'} />
          <MetricBox label="Buying power" value={acctMetrics.buyingPower !== null ? fmtCurrency(acctMetrics.buyingPower) : 'N/A'} />
          <MetricBox label="Day P/L" value={acctMetrics.dayPL !== null ? fmtCurrency(acctMetrics.dayPL) : 'N/A'} />
          <MetricBox label="Total P/L" value={acctMetrics.totalPL !== null ? fmtCurrency(acctMetrics.totalPL) : 'N/A'} />
          <MetricBox label="Positions" value={acctMetrics.positions !== null ? `${acctMetrics.positions}` : 'N/A'} />
          <MetricBox label="Gross exposure" value={acctMetrics.grossExposure !== null ? fmtCurrency(acctMetrics.grossExposure) : 'N/A'} />
          <MetricBox label="Net exposure" value={acctMetrics.netExposure !== null ? fmtCurrency(acctMetrics.netExposure) : 'N/A'} />
          <MetricBox label="Max drawdown" value={acctMetrics.maxDrawdown !== null ? fmtCurrency(acctMetrics.maxDrawdown) : 'N/A'} />
        </div>
        <p className="mt-2 text-xs" style={{ color: 'rgba(115,122,118,0.5)' }}>
          Metrics update only after server-side API verification succeeds. N/A until connected.
        </p>
      </div>

      {/* Signal metrics */}
      <div className="rounded-2xl p-5" style={{ background: '#0C0F0D', border: '1px solid rgba(220,225,222,0.08)' }}>
        <h2 className="text-base font-semibold mb-3" style={{ color: '#F1F0EC' }}>Signal metrics</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricBox label="Scanned" value={sigMetrics.symbolsScanned !== null ? `${sigMetrics.symbolsScanned}` : 'N/A'} />
          <MetricBox label="Qualified" value={sigMetrics.qualified !== null ? `${sigMetrics.qualified}` : 'N/A'} />
          <MetricBox label="Excluded" value={sigMetrics.excluded !== null ? `${sigMetrics.excluded}` : 'N/A'} />
          <MetricBox label="Pending" value={sigMetrics.pending !== null ? `${sigMetrics.pending}` : 'N/A'} />
          <MetricBox label="Win rate" value={sigMetrics.settledWinRate !== null ? `${(sigMetrics.settledWinRate * 100).toFixed(1)}%` : 'N/A'} />
          <MetricBox label="Profit factor" value={sigMetrics.profitFactor !== null ? sigMetrics.profitFactor.toFixed(2) : 'N/A'} />
          <MetricBox label="Avg gain" value={sigMetrics.averageGain !== null ? fmtCurrency(sigMetrics.averageGain) : 'N/A'} />
          <MetricBox label="Avg loss" value={sigMetrics.averageLoss !== null ? fmtCurrency(sigMetrics.averageLoss) : 'N/A'} />
          <MetricBox label="Expectancy" value={sigMetrics.expectancy !== null ? fmtCurrency(sigMetrics.expectancy) : 'N/A'} />
          <MetricBox label="Sharpe" value={sigMetrics.sharpe !== null ? sigMetrics.sharpe.toFixed(2) : 'N/A'} sub="Need 30+ observations" />
          <MetricBox label="Est. slippage" value={sigMetrics.estimatedSlippage !== null ? fmtCurrency(sigMetrics.estimatedSlippage) : 'N/A'} />
          <MetricBox label="Data freshness" value={sigMetrics.dataTimestamp ?? 'N/A'} />
        </div>
      </div>

      {/* Watchlist / Signal table — empty state */}
      <div className="rounded-2xl p-5" style={{ background: '#0C0F0D', border: '1px solid rgba(220,225,222,0.08)' }}>
        <h2 className="text-base font-semibold mb-3" style={{ color: '#F1F0EC' }}>Watchlist / Signals</h2>

        {/* Desktop table header */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-xs" style={{ color: '#737A76' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(220,225,222,0.08)' }}>
                {WATCHLIST_COLUMNS.map((col) => (
                  <th key={col} className="px-2 py-2 text-left font-semibold capitalize">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={WATCHLIST_COLUMNS.length} className="px-2 py-6 text-center text-sm" style={{ color: '#737A76' }}>
                  No signals available. Connect market data to start scanning.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile empty state */}
        <div className="lg:hidden text-center py-6">
          <Activity className="mx-auto h-8 w-8 mb-2" style={{ color: '#737A76' }} />
          <p className="text-sm" style={{ color: '#737A76' }}>No signals available. Connect market data to start scanning.</p>
        </div>
      </div>

      {/* Execution readiness checklist */}
      <div className="rounded-2xl p-5" style={{ background: '#0C0F0D', border: '1px solid rgba(220,225,222,0.08)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5" style={{ color: '#E0A532' }} />
          <h2 className="text-base font-semibold" style={{ color: '#F1F0EC' }}>Execution readiness</h2>
        </div>
        <div className="space-y-2">
          {checklist.map((item) => (
            <ChecklistRow key={item.id} item={item} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {liveReady ? (
            <span className="text-xs font-semibold" style={{ color: '#36D67E' }}>All checks passed</span>
          ) : (
            <span className="text-xs" style={{ color: '#D94550' }}>
              {checklist.filter((c) => !c.verified).length} of {checklist.length} checks pending
            </span>
          )}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'rgba(115,122,118,0.5)' }}>
          Every check must pass via server-side verification before live trading can be enabled. Website logins do not count.
        </p>
      </div>

      {/* Planned live bankroll */}
      <div className="rounded-xl p-4" style={{ background: '#0C0F0D', border: '1px solid rgba(224,165,50,0.12)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" style={{ color: '#E0A532' }} />
            <p className="text-sm font-semibold" style={{ color: '#F1F0EC' }}>Trading live bankroll</p>
          </div>
          <p className="text-lg font-bold mono" style={{ color: '#E0A532' }}>{fmtCurrency(TRADING_PLANNED_LIVE)}</p>
        </div>
        <p className="mt-1.5 text-xs" style={{ color: '#737A76' }}>Not funded / Not connected</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <RiskStat label="Default risk" value={`${(TRADING_DEFAULT_RISK_PCT * 100).toFixed(0)}%`} />
          <RiskStat label="Hard cap" value={`${(TRADING_ABSOLUTE_RISK_PCT * 100).toFixed(0)}%`} />
          <RiskStat label="Daily stop" value={`-${(TRADING_DAILY_STOP_PCT * 100).toFixed(0)}%`} />
          <RiskStat label="DD pause" value={`-${(TRADING_DRAWDOWN_PAUSE_PCT * 100).toFixed(0)}%`} />
        </div>
      </div>

      {/* Disclosure */}
      <div
        className="flex items-start gap-2 rounded-lg px-4 py-3 text-xs"
        style={{ background: 'rgba(224,165,50,0.04)', border: '1px solid rgba(224,165,50,0.12)', color: '#E0A532' }}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Paper mode only. No real orders are placed. All amounts are simulated. Credentials are stored server-side only.</span>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ConnectionCardUI({ card }: { card: ConnectionCard }) {
  const color = card.status === 'connected' ? '#36D67E' : card.status === 'error' ? '#D94550' : '#E0A532';
  const Icon = card.status === 'connected' ? Radio : card.status === 'error' ? XCircle : Lock;

  return (
    <div className="rounded-xl p-4" style={{ background: '#0C0F0D', border: `1px solid ${color}22` }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <p className="text-sm font-semibold" style={{ color: '#F1F0EC' }}>{card.name}</p>
      </div>
      <p className="text-xs font-semibold" style={{ color }}>{connectionStatusLabel(card.status)}</p>
      <p className="mt-1 text-xs" style={{ color: '#737A76' }}>{card.description}</p>
      <p className="mt-1.5 text-xs" style={{ color: 'rgba(115,122,118,0.5)' }}>{card.nextAction}</p>
    </div>
  );
}

function MetricBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const isNA = value === 'N/A';
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(220,225,222,0.03)' }}>
      <p className="text-xs" style={{ color: '#737A76' }}>{label}</p>
      <p className="text-sm font-bold mono" style={{ color: isNA ? '#737A76' : '#F1F0EC' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'rgba(115,122,118,0.4)' }}>{sub}</p>}
    </div>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: 'rgba(220,225,222,0.02)' }}>
      {item.verified ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#36D67E' }} />
      ) : (
        <Minus className="h-4 w-4 shrink-0" style={{ color: '#D94550' }} />
      )}
      <p className="text-sm" style={{ color: item.verified ? '#B8BBB8' : '#737A76' }}>{item.label}</p>
      {item.blocksLive && !item.verified && (
        <span className="ml-auto text-xs" style={{ color: '#D94550' }}>Blocks live</span>
      )}
    </div>
  );
}

function RiskStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center rounded-lg p-1.5" style={{ background: 'rgba(220,225,222,0.03)' }}>
      <p className="text-xs" style={{ color: '#737A76' }}>{label}</p>
      <p className="text-sm font-bold mono" style={{ color: '#E0A532' }}>{value}</p>
    </div>
  );
}
