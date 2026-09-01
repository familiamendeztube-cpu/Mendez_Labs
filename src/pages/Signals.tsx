import { useState } from 'react';
import { Activity, RefreshCw, Filter, Zap, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { fmtCurrency } from '@/utils/format';
import { emptySignalMetrics } from '@/utils/tradingCalc';
import { DEFAULT_UNIVERSE } from '@/utils/tradingAnalysis';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useLiveTrading, type LiveTicker } from '@/services/tradingLive';
import { PageHero } from '@/components/PageHero';
import { APP_IMAGES } from '@/data/appImages';
import { tv, accentAlpha, mutedAlpha } from '@/lib/themeVars';

type StatusFilter = 'All' | 'Qualified' | 'Excluded';
type DirectionFilter = 'All' | 'Long' | 'Short';

const STATUS_OPTIONS: StatusFilter[] = ['All', 'Qualified', 'Excluded'];
const DIRECTION_OPTIONS: DirectionFilter[] = ['All', 'Long', 'Short'];

export function Signals() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [dirFilter, setDirFilter] = useState<DirectionFilter>('All');
  const sigMetrics = emptySignalMetrics();
  const live = useLiveTrading(30_000);
  const tickers = live.tickers;
  const hasLiveData = live.connected && tickers.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8" data-stagger-visible>
      <PageHero
        image={APP_IMAGES.candles}
        eyebrow="Trading"
        title="Trade Signals"
        subtitle={hasLiveData
          ? `Live quotes for ${tickers.length} symbols. ${DEFAULT_UNIVERSE.length} in research universe.`
          : `Candidates ranked by expected value after costs. ${DEFAULT_UNIVERSE.length} symbols in research universe.`}
        action={
          <button
            onClick={live.refresh}
            disabled={live.loading}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold"
            style={{ background: accentAlpha(0.12), color: tv.accent, minHeight: '44px', opacity: live.loading ? 0.5 : 1, backdropFilter: 'blur(4px)' }}
          >
            <RefreshCw className={`h-4 w-4 ${live.loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <SigMetric label="Scanned" value={hasLiveData ? tickers.length : sigMetrics.symbolsScanned} accent={tv.accent} />
        <SigMetric label="Qualified" value={sigMetrics.qualified} accent={tv.accent} />
        <SigMetric label="Excluded" value={sigMetrics.excluded} accent={tv.statusRed} />
        <SigMetric label="Win rate" value={sigMetrics.settledWinRate} fmt="pct" accent={tv.accentDeep} />
        <SigMetric label="Expectancy" value={sigMetrics.expectancy} fmt="currency" accent={tv.statusAmber} />
        <SigMetric label="Sharpe" value={sigMetrics.sharpe} fmt="dec" accent={tv.accentDeep} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" style={{ color: tv.textMuted }} />
          <span className="text-xs" style={{ color: tv.textMuted }}>Filter:</span>
        </div>
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((f) => (
            <FilterPill key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} />
          ))}
        </div>
        <div className="flex gap-1.5">
          {DIRECTION_OPTIONS.map((f) => (
            <FilterPill key={f} label={f} active={dirFilter === f} onClick={() => setDirFilter(f)} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: tv.textPrimary }}>Research universe</h2>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: hasLiveData ? accentAlpha(0.12) : 'rgba(224,165,50,0.12)', color: hasLiveData ? tv.accent : tv.statusAmber, border: `1px solid ${hasLiveData ? accentAlpha(0.2) : 'rgba(224,165,50,0.2)'}` }}>
            {hasLiveData ? 'Live' : 'Waiting for data'}
          </span>
        </div>
        {tickers.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tickers.map((t) => <TickerCard key={t.symbol} ticker={t} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Activity className="h-8 w-8" style={{ color: mutedAlpha(0.25) }} />
            <p className="text-sm" style={{ color: tv.textMuted }}>Connecting to market data. Ticker cards will populate with live quotes.</p>
          </div>
        )}
        <p className="mt-3 text-xs" style={{ color: mutedAlpha(0.5) }}>
          {hasLiveData ? 'Live quotes from Alpaca IEX feed. Auto-refreshes every 30 seconds.' : 'Connect market data and run a scan to populate signal details for each symbol.'}
        </p>
      </div>

      <div className="rounded-xl p-5" style={{ background: mutedAlpha(0.03), border: `1px solid ${tv.borderBase}` }}>
        <p className="text-xs font-semibold mb-3" style={{ color: tv.textMuted }}>Strategy families</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StrategyCard icon={<TrendingUp className="h-5 w-5" />} name="Trend continuation" desc="Enters with the established trend when momentum and volume confirm." rules="EMA20 > EMA50, RSI 40-70, positive 20-day momentum, volume confirms" accent={tv.accent} />
          <StrategyCard icon={<Target className="h-5 w-5" />} name="Controlled pullback" desc="Enters during a short-term dip within a longer uptrend." rules="EMA20 > EMA50, RSI 30-50, negative 5-day but positive 20-day momentum" accent={tv.accentDeep} />
          <StrategyCard icon={<Zap className="h-5 w-5" />} name="Volatility breakout" desc="Enters when a large move happens on elevated volume." rules="ATR% > 2%, volume z-score > 1.5, strong 5-day momentum" accent={tv.statusAmber} />
        </div>
      </div>

      <p className="text-xs" style={{ color: mutedAlpha(0.5) }}>
        Probabilities come from calibrated historical outcomes with walk-forward evaluation. Never from a language model.
        Expected value = pWin * avgWin - (1-pWin) * avgLoss - estimated costs.
      </p>
    </div>
  );
}

function TickerCard({ ticker }: { ticker: LiveTicker }) {
  const up = ticker.changePct >= 0;
  const color = up ? '#36D67E' : '#D94550';
  const Arrow = up ? TrendingUp : TrendingDown;
  const sparkData = ticker.sparkline.map((v, i) => ({ i, v }));

  return (
    <div className="relative overflow-hidden rounded-xl p-3 transition-all hover:scale-[1.02]" style={{ background: tv.bgSurface, border: `1px solid ${color}18` }}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold" style={{ color: tv.textPrimary }}>{ticker.symbol}</span>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: tv.accent }} />
        </div>
        <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${color}14`, color }}>
          <Arrow className="h-2.5 w-2.5" />
          {up ? '+' : ''}{ticker.changePct}%
        </span>
      </div>
      <p className="text-lg font-bold mono" style={{ color: tv.textPrimary }}>
        ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="text-xs mono" style={{ color }}>{up ? '+' : ''}{ticker.change.toFixed(2)}</p>
      <div className="mt-2 -mx-1">
        <ResponsiveContainer width="100%" height={48}>
          <AreaChart data={sparkData}>
            <defs>
              <linearGradient id={`spark-sig-${ticker.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-sig-${ticker.symbol})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex justify-center">
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: tv.textMuted }}>No signal</span>
      </div>
    </div>
  );
}

function SigMetric({ label, value, fmt, accent }: { label: string; value: number | null; fmt?: 'pct' | 'currency' | 'dec'; accent: string }) {
  let display = 'N/A';
  if (value !== null) {
    if (fmt === 'pct') display = `${(value * 100).toFixed(1)}%`;
    else if (fmt === 'currency') display = fmtCurrency(value);
    else if (fmt === 'dec') display = value.toFixed(2);
    else display = `${value}`;
  }
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: mutedAlpha(0.04) }}>
      <div className="h-0.5" style={{ background: value !== null ? accent : 'transparent' }} />
      <div className="px-2.5 py-2">
        <p className="text-xs" style={{ color: tv.textMuted }}>{label}</p>
        <p className="text-base font-bold mono mt-0.5" style={{ color: value !== null ? tv.textPrimary : tv.textMuted }}>{display}</p>
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors" style={{ background: active ? accentAlpha(0.12) : mutedAlpha(0.06), color: active ? tv.accent : tv.textMuted, border: active ? `1px solid ${accentAlpha(0.2)}` : `1px solid ${tv.borderBase}`, minHeight: '32px' }}>
      {label}
    </button>
  );
}

function StrategyCard({ icon, name, desc, rules, accent }: { icon: React.ReactNode; name: string; desc: string; rules: string; accent: string }) {
  return (
    <div className="rounded-lg p-4 flex gap-3" style={{ background: tv.bgSurface, borderLeft: `3px solid ${accent}`, border: `1px solid ${tv.borderBase}`, borderLeftColor: accent, borderLeftWidth: '3px' }}>
      <div className="shrink-0 mt-0.5" style={{ color: accent }}>{icon}</div>
      <div>
        <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{name}</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: tv.textSecondary }}>{desc}</p>
        <p className="mt-1.5 text-xs" style={{ color: tv.textMuted }}>{rules}</p>
      </div>
    </div>
  );
}
