import { useState } from 'react';
import { HelpCircle, BarChart3, Activity } from 'lucide-react';
import { ChartContainer } from '@/components/ChartContainer';
import { EquityCurveChart, DailyPnlChart, DrawdownChart } from '@/components/Charts';
import { useLiveTrading } from '@/services/tradingLive';
import { tv, accentAlpha, amberAlpha, mutedAlpha } from '@/lib/themeVars';
import { PageHero } from '@/components/PageHero';
import { APP_IMAGES } from '@/data/appImages';

type Period = 'today' | '7d' | '30d' | 'all';
const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'All-time' },
];

function liveBadge(hasData: boolean) {
  if (hasData) {
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: accentAlpha(0.12), color: tv.accent, border: `1px solid ${accentAlpha(0.2)}` }}>
        Live
      </span>
    );
  }
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: amberAlpha(0.12), color: tv.statusAmber, border: `1px solid ${amberAlpha(0.2)}` }}>
      No data
    </span>
  );
}

export function Performance() {
  const [period, setPeriod] = useState<Period>('all');
  const live = useLiveTrading(60_000);
  const hasData = live.equityCurve.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8" data-stagger-visible>
      <PageHero
        image={APP_IMAGES.analytics}
        eyebrow="Trading"
        title="Performance"
        subtitle={hasData ? 'Live trading scorecard from your Alpaca paper account.' : 'Trading scorecard from paper fills. Charts populate after your first trading day.'}
      />

      <div className="flex gap-1.5">
        {PERIODS.map(({ key, label }) => (
          <button key={key} onClick={() => setPeriod(key)} className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors" style={{ background: period === key ? accentAlpha(0.12) : mutedAlpha(0.06), color: period === key ? tv.accent : tv.textMuted, border: period === key ? `1px solid ${accentAlpha(0.2)}` : `1px solid ${tv.borderBase}`, minHeight: '44px' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartContainer title="Equity Curve" action={liveBadge(hasData)}>
            {hasData ? <EquityCurveChart data={live.equityCurve} /> : <EmptyChart message="Equity curve will appear after your first trading day" />}
          </ChartContainer>
        </div>
        <ChartContainer title="Win / Loss" empty emptyText="No settled trades" />
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <ChartContainer title="Daily P&L" action={liveBadge(hasData)}>
          {hasData ? <DailyPnlChart data={live.dailyPnl} /> : <EmptyChart message="Daily P&L populates after your first trading day" />}
        </ChartContainer>
        <ChartContainer title="Drawdown" action={liveBadge(hasData)}>
          {hasData ? <DrawdownChart data={live.drawdown} /> : <EmptyChart message="Drawdown chart populates after your first trading day" />}
        </ChartContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <PerfCard label="Wins" value="0" color={tv.accent} />
        <PerfCard label="Losses" value="0" color={tv.statusRed} />
        <PerfCard label="Breakeven" value="0" color={tv.statusAmber} />
        <PerfCard label="Pending" value="0" color={tv.textMuted} />
        <PerfCard label="Win rate" value="N/A" sub="Not enough trades" color={tv.textMuted} tip="Wins / (Wins + Losses)" />
        <PerfCard label="ROI" value="N/A" sub="Not enough trades" color={tv.textMuted} tip="Net P/L / total capital risked" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <PerfCard label="Net P/L" value="N/A" sub="Not enough trades" color={tv.textMuted} tip="Total profit minus total loss" />
        <PerfCard label="Avg win" value="N/A" sub="Not enough trades" color={tv.textMuted} tip="Mean dollar gain on winning trades" />
        <PerfCard label="Avg loss" value="N/A" sub="Not enough trades" color={tv.textMuted} tip="Mean dollar loss on losing trades" />
        <PerfCard label="Payoff ratio" value="N/A" sub="Not enough trades" color={tv.textMuted} tip="Average win / average loss" />
        <PerfCard label="Profit factor" value="N/A" sub="Not enough trades" color={tv.textMuted} tip="Gross profit / gross loss" />
        <PerfCard label="Expectancy" value="N/A" sub="Not enough trades" color={tv.textMuted} tip="Average expected dollar gain per trade" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <PerfCard label="Max drawdown" value="N/A" sub="Not enough trades" color={tv.textMuted} tip="Largest peak-to-trough drop in equity" />
        <PerfCard label="Losing streak" value="N/A" sub="Not enough trades" color={tv.textMuted} tip="Longest run of consecutive losses" />
        <PerfCard label="Sharpe" value="N/A" sub="Need 30+ trades" color={tv.textMuted} tip="Risk-adjusted return" />
        <PerfCard label="Sortino" value="N/A" sub="Need 30+ trades" color={tv.textMuted} tip="Like Sharpe but only penalizes downside volatility" />
        <PerfCard label="Brier score" value="N/A" sub="Need 30+ trades" color={tv.textMuted} tip="Prediction accuracy. Lower is better." />
        <PerfCard label="Avg slippage" value="N/A" sub="Need fills" color={tv.textMuted} tip="Average difference between expected and actual fill price" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <PerfCard label="Log loss" value="N/A" sub="Need 30+ trades" color={tv.textMuted} tip="Cross-entropy loss of predictions" />
        <PerfCard label="Cal. error" value="N/A" sub="Need 30+ trades" color={tv.textMuted} tip="Expected calibration error" />
        <PerfCard label="Sample size" value="0" color={tv.textPrimary} tip="Total settled trades in this period" />
      </div>

      <div className="rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <h2 className="text-base font-semibold mb-3" style={{ color: tv.textPrimary }}>Trade history</h2>
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-xs" style={{ color: tv.textMuted }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tv.borderBase}` }}>
                {['Date', 'Symbol', 'Side', 'Entry', 'Exit', 'P/L', 'R-multiple', 'Strategy', 'Duration'].map((h) => (
                  <th key={h} className="px-2 py-2.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={9} className="px-2 py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <BarChart3 className="h-10 w-10 animate-pulse" style={{ color: mutedAlpha(0.3) }} />
                    <p className="text-sm" style={{ color: tv.textMuted }}>No completed trades yet. Results appear here once paper orders are filled and closed.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="lg:hidden flex flex-col items-center gap-3 py-8 text-center">
          <BarChart3 className="h-10 w-10 animate-pulse" style={{ color: mutedAlpha(0.3) }} />
          <p className="text-sm" style={{ color: tv.textMuted }}>No completed trades yet</p>
        </div>
      </div>

      <p className="text-xs" style={{ color: mutedAlpha(0.5) }}>
        {hasData ? 'All charts from live Alpaca paper account data.' : 'Charts populate after your first trading day.'}
        {' '}Minimum 30 settled trades for statistical metrics.
      </p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Activity className="h-8 w-8 mb-2" style={{ color: mutedAlpha(0.25) }} />
      <p className="text-sm" style={{ color: tv.textMuted }}>{message}</p>
    </div>
  );
}

function PerfCard({ label, value, sub, color, tip }: { label: string; value: string; sub?: string; color: string; tip?: string }) {
  const [showTip, setShowTip] = useState(false);
  const isNA = value === 'N/A';
  const isPositive = !isNA && color === tv.accent;
  const isNegative = !isNA && color === tv.statusRed;
  const accentColor = isPositive ? accentAlpha(0.5) : isNegative ? 'rgba(217,69,80,0.5)' : 'transparent';

  return (
    <div className="relative rounded-lg px-3 py-2.5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}`, borderTop: isNA ? undefined : `2px solid ${accentColor}` }}>
      <div className="flex items-center gap-1">
        <p className="text-xs" style={{ color: tv.textMuted }}>{label}</p>
        {tip && (
          <button onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)} onClick={() => setShowTip(!showTip)} className="flex items-center justify-center" style={{ minHeight: '24px', minWidth: '24px' }}>
            <HelpCircle className="h-3 w-3" style={{ color: mutedAlpha(0.4) }} />
          </button>
        )}
      </div>
      <p className="mt-0.5 text-xl font-bold mono" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: tv.textMuted }}>{sub}</p>}
      {showTip && tip && (
        <div className="absolute left-0 top-full z-20 mt-1 max-w-xs rounded-lg px-3 py-2 text-xs" style={{ background: tv.bgElevated, border: `1px solid ${mutedAlpha(0.12)}`, color: tv.textSecondary }}>
          {tip}
        </div>
      )}
    </div>
  );
}
