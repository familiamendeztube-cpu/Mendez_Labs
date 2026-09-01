import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock, Shield, AlertTriangle, Activity, Radio, XCircle,
  ArrowRight, RefreshCw, Zap, Wifi, WifiOff, CheckCircle2, Minus, Clock, X,
} from 'lucide-react';
import { getTradingEnv, setTradingEnv, type TradingEnv } from '@/services/alpaca';
import { OrderTicket } from '@/components/OrderTicket';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { fmtCurrency } from '@/utils/format';
import {
  connectionStatusLabel,
  TRADING_PLANNED_LIVE,
  TRADING_DEFAULT_RISK_PCT,
  TRADING_ABSOLUTE_RISK_PCT,
  TRADING_DAILY_STOP_PCT,
  TRADING_DRAWDOWN_PAUSE_PCT,
  type ConnectionCard,
} from '@/utils/tradingCalc';
import { EquityCurveChart, DailyPnlChart, MarketPriceChart, ExposurePieChart } from '@/components/Charts';
import { useLiveTrading, type LiveTicker } from '@/services/tradingLive';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { tv, accentAlpha, amberAlpha, redAlpha, mutedAlpha } from '@/lib/themeVars';
import { PageHero } from '@/components/PageHero';
import { APP_IMAGES } from '@/data/appImages';

// Real market-session clocks (view-only data that needs no brokerage auth).
const SESSIONS = [
  { city: 'NEW YORK', tz: 'America/New_York', open: 570, close: 960 },
  { city: 'LONDON', tz: 'Europe/London', open: 480, close: 990 },
  { city: 'TOKYO', tz: 'Asia/Tokyo', open: 540, close: 900 },
];

function sessionNow(s: typeof SESSIONS[number]) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: s.tz, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const mins = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
  const weekend = get('weekday') === 'Sat' || get('weekday') === 'Sun';
  return { time: `${get('hour')}:${get('minute')}`, isOpen: !weekend && mins >= s.open && mins < s.close };
}

export function TradingDashboard() {
  const live = useLiveTrading();
  const [env, setEnvState] = useState<TradingEnv>(getTradingEnv());
  const [confirmLive, setConfirmLive] = useState(false);

  function switchEnv(next: TradingEnv) {
    setTradingEnv(next);
    setEnvState(next);
    setConfirmLive(false);
    live.refresh();
  }

  const acct = live.account;
  const equity = acct ? parseFloat(acct.equity) : null;
  const cash = acct ? parseFloat(acct.cash) : null;
  const buyingPower = acct ? parseFloat(acct.buying_power) : null;
  const lastEquity = acct ? parseFloat(acct.last_equity) : null;
  const dayPL = equity !== null && lastEquity !== null ? equity - lastEquity : null;
  const longMV = acct ? parseFloat(acct.long_market_value) : null;
  const shortMV = acct ? parseFloat(acct.short_market_value) : null;
  const grossExposure = longMV !== null && shortMV !== null ? longMV + Math.abs(shortMV) : null;
  const netExposure = longMV !== null && shortMV !== null ? longMV - Math.abs(shortMV) : null;

  const liveConnections: ConnectionCard[] = [
    {
      id: 'alpaca',
      name: 'Alpaca Paper',
      status: live.connected ? 'connected' : live.error ? 'error' : 'missing_credentials',
      description: live.connected ? `Account ${acct?.account_number ?? ''}` : (live.error ?? 'Not connected'),
      lastSync: null, latencyMs: null, quota: null,
      nextAction: live.connected ? `Synced ${live.lastSync ? new Date(live.lastSync).toLocaleTimeString() : 'never'}` : 'Checking connection...',
    },
    {
      id: 'market-data',
      name: 'Market Data (IEX)',
      status: live.connected && live.tickers.length > 0 ? 'connected' : live.error ? 'error' : 'missing_credentials',
      description: live.connected ? `${live.tickers.length} symbols streaming` : 'Waiting for Alpaca',
      lastSync: null, latencyMs: null, quota: null,
      nextAction: live.connected ? 'Live quotes active' : 'Requires Alpaca connection',
    },
    {
      id: 'signals',
      name: 'Signal Engine',
      status: 'missing_credentials',
      description: 'Analysis engine ready',
      lastSync: null, latencyMs: null, quota: null,
      nextAction: 'Will activate when market data flows',
    },
  ];

  const hasChartData = live.equityCurve.length > 0;
  const hasSpyData = live.spyCandles.length > 0;
  const revealRef = useScrollReveal<HTMLDivElement>();

  return (
    <div ref={revealRef} className="mx-auto max-w-5xl space-y-5 pb-8">
      {/* HEADER */}
      <div data-reveal>
        <PageHero
          image={APP_IMAGES.desk}
          eyebrow="Trading"
          title="Trading Command Center"
          subtitle={live.connected
            ? `Connected to your ${env} Alpaca account. Live market data active.`
            : live.error ? 'Alpaca not reachable — check your server keys below.' : 'Connecting to Alpaca...'}
          action={
            <div className="flex items-center gap-2">
              <button onClick={live.refresh} disabled={live.loading} className="rounded-full p-2 transition-colors" style={{ background: mutedAlpha(0.1), border: `1px solid ${tv.borderBase}`, color: tv.textSecondary, minHeight: 44, minWidth: 44, backdropFilter: 'blur(4px)' }} aria-label="Refresh data">
                <RefreshCw className={`h-4 w-4 ${live.loading ? 'animate-spin' : ''}`} />
              </button>
              <MarketStatusBadge connected={live.connected} />
            </div>
          }
        />
      </div>

      {/* Paper / Live toggle */}
      <div className="flex items-center gap-2" data-reveal>
        <button
          onClick={() => switchEnv('paper')}
          className="rounded-full px-4 py-1.5 text-sm font-semibold"
          style={env === 'paper'
            ? { background: accentAlpha(0.12), color: tv.accent, border: `1px solid ${accentAlpha(0.2)}`, minHeight: '44px' }
            : { background: mutedAlpha(0.06), color: tv.textMuted, border: `1px solid ${tv.borderBase}`, minHeight: '44px' }}
        >
          PAPER
        </button>
        <button
          onClick={() => (env === 'live' ? undefined : setConfirmLive(true))}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold"
          style={env === 'live'
            ? { background: amberAlpha(0.15), color: tv.statusAmber, border: `1px solid ${amberAlpha(0.35)}`, minHeight: '44px' }
            : { background: mutedAlpha(0.06), color: tv.textMuted, border: `1px solid ${tv.borderBase}`, minHeight: '44px' }}
        >
          {env === 'live' ? <Zap className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} LIVE
        </button>
        {env === 'live' && (
          <span className="text-xs font-semibold" style={{ color: tv.statusAmber }}>
            Real money — your live Alpaca account
          </span>
        )}
      </div>

      {/* Live switch confirmation */}
      {confirmLive && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ background: 'rgba(3,6,5,0.75)', backdropFilter: 'blur(6px)' }} onClick={() => setConfirmLive(false)}>
          <div className="panel-img w-full max-w-sm rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${amberAlpha(0.4)}` }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold" style={{ color: tv.statusAmber }}>Switch to LIVE trading?</h4>
              <button onClick={() => setConfirmLive(false)} aria-label="Cancel"><X className="h-4 w-4" style={{ color: tv.textMuted }} /></button>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: tv.textMuted }}>
              The dashboard will read your LIVE Alpaca account and the order
              ticket will place REAL-MONEY orders. Orders additionally require
              the ALPACA_LIVE_ORDERS_ENABLED server secret — without it the
              server refuses live orders even in this mode.
            </p>
            <button
              onClick={() => switchEnv('live')}
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-bold"
              style={{ background: amberAlpha(0.2), color: tv.statusAmber, border: `1px solid ${amberAlpha(0.4)}` }}
            >
              Switch to LIVE
            </button>
            <button onClick={() => setConfirmLive(false)} className="mt-2 w-full rounded-lg py-2 text-xs" style={{ color: tv.textMuted, background: mutedAlpha(0.06) }}>
              Stay on paper
            </button>
          </div>
        </div>
      )}

      {/* Connection banners */}
      {live.error && (
        <div className="rounded-2xl p-5" style={{ background: amberAlpha(0.05), border: `1px solid ${amberAlpha(0.22)}` }}>
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0" style={{ color: tv.statusAmber }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: tv.statusAmber }}>Alpaca not connected</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: tv.textMuted }}>{live.error}</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: tv.textMuted }}>
                {env === 'live'
                  ? 'LIVE mode reads your real account. Set ALPACA_LIVE_KEY_ID and ALPACA_LIVE_SECRET as Supabase edge-function secrets (and ALPACA_LIVE_ORDERS_ENABLED=true to place real orders). Switch to PAPER to trade the paper account.'
                  : 'Set ALPACA_PAPER_KEY_ID and ALPACA_PAPER_SECRET as Supabase edge-function secrets on the alpaca-connector function. The dashboard retries automatically.'}
              </p>
            </div>
          </div>
          {/* Live market sessions — real data, no brokerage needed */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SESSIONS.map((s) => {
              const { time, isOpen } = sessionNow(s);
              return (
                <div key={s.city} className="panel-img flex items-center justify-between rounded-xl px-4 py-3" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
                  <div>
                    <p className="text-[10px] tracking-[0.25em]" style={{ color: tv.textMuted }}>{s.city}</p>
                    <p className="serif text-xl" style={{ color: tv.textPrimary }}>{time}</p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest"
                    style={isOpen
                      ? { background: accentAlpha(0.15), color: tv.accent }
                      : { background: mutedAlpha(0.1), color: tv.textMuted }}
                  >
                    {isOpen ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {live.connected && !live.error && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: accentAlpha(0.06), border: `1px solid ${accentAlpha(0.15)}` }}>
          <Wifi className="h-5 w-5 shrink-0" style={{ color: tv.accent }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: tv.accent }}>
              Alpaca {env} account connected
            </p>
            <p className="text-xs" style={{ color: tv.textMuted }}>
              {env === 'live'
                ? 'Real account data. Orders placed from the ticket use real money.'
                : 'Live data flowing. Paper mode — no real money at risk.'}
            </p>
          </div>
        </div>
      )}

      {/* ORDER TICKET */}
      <div data-reveal>
        <OrderTicket env={env} connected={live.connected} onPlaced={live.refresh} />
      </div>

      {/* TICKER STRIP */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${mutedAlpha(0.2)} transparent` }}>
        {live.tickers.length > 0 ? live.tickers.map((t) => (
          <TickerChip key={t.symbol} ticker={t} isLive />
        )) : (
          <p className="text-sm py-4" style={{ color: tv.textMuted }}>Waiting for market data...</p>
        )}
      </div>

      {/* SPY Intraday */}
      <div className="app-card rounded-2xl p-4" data-reveal style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>SPY -- Intraday</h3>
            <p className="text-xs" style={{ color: tv.textMuted }}>5-minute bars</p>
          </div>
          <StatusBadge connected={hasSpyData} label={hasSpyData ? 'Live' : 'No data'} />
        </div>
        {hasSpyData ? <MarketPriceChart candles={live.spyCandles} /> : <EmptyChart message="SPY intraday data will appear during market hours" />}
      </div>

      {/* TWO-COLUMN CHART ROW */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-stagger-visible style={{ '--stagger': '80ms' } as React.CSSProperties}>
        <div className="app-card rounded-2xl p-4" data-reveal style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>Equity Curve</h3>
            <StatusBadge connected={hasChartData} label={hasChartData ? 'Live' : 'No history'} />
          </div>
          {hasChartData ? <EquityCurveChart data={live.equityCurve} /> : <EmptyChart message="Equity history will appear after your first trading day" />}
        </div>
        <div className="app-card rounded-2xl p-4" data-reveal style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>Daily P&L</h3>
            <StatusBadge connected={hasChartData} label={hasChartData ? 'Live' : 'No history'} />
          </div>
          {hasChartData ? <DailyPnlChart data={live.dailyPnl} /> : <EmptyChart message="Daily P&L will appear after your first trading day" />}
        </div>
      </div>

      {/* EXPOSURE */}
      <div className="app-card rounded-2xl p-4" data-reveal style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>Portfolio Exposure</h3>
          <StatusBadge connected={live.positions.length > 0} label={live.positions.length > 0 ? 'Live' : 'No positions'} />
        </div>
        <ExposurePieChart data={live.exposure} />
      </div>

      {/* CONNECTION STATUS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-stagger-visible style={{ '--stagger': '60ms' } as React.CSSProperties}>
        {liveConnections.map((c) => <ConnectionCardUI key={c.id} card={c} />)}
      </div>

      {/* ACCOUNT METRICS */}
      <div className="app-card rounded-2xl p-5" data-reveal style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: tv.textPrimary }}>Account</h2>
          {live.connected && (
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: tv.accent }}>
              <Wifi className="h-3 w-3" /> Live from Alpaca
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <MetricBox label="Equity" value={equity !== null ? fmtCurrency(equity) : 'N/A'} live={live.connected} />
          <MetricBox label="Cash" value={cash !== null ? fmtCurrency(cash) : 'N/A'} live={live.connected} />
          <MetricBox label="Buying power" value={buyingPower !== null ? fmtCurrency(buyingPower) : 'N/A'} live={live.connected} />
          <MetricBox label="Day P/L" value={dayPL !== null ? fmtCurrency(dayPL) : 'N/A'} live={live.connected} highlight={dayPL !== null ? (dayPL >= 0 ? 'green' : 'red') : undefined} />
          <MetricBox label="Positions" value={live.connected ? `${live.positions.length}` : 'N/A'} live={live.connected} />
          <MetricBox label="Gross exposure" value={grossExposure !== null ? fmtCurrency(grossExposure) : 'N/A'} live={live.connected} />
          <MetricBox label="Net exposure" value={netExposure !== null ? fmtCurrency(netExposure) : 'N/A'} live={live.connected} />
          <MetricBox label="Day trades" value={acct ? `${acct.daytrade_count}` : 'N/A'} live={live.connected} />
          <MetricBox label="PDT flag" value={acct ? (acct.pattern_day_trader ? 'YES' : 'No') : 'N/A'} live={live.connected} highlight={acct?.pattern_day_trader ? 'red' : undefined} />
        </div>
        <p className="mt-2 text-xs" style={{ color: mutedAlpha(0.5) }}>
          {live.connected ? `Last synced ${live.lastSync ? new Date(live.lastSync).toLocaleTimeString() : 'never'}. Auto-refreshes every 30s.` : 'Values update after Alpaca API connection.'}
        </p>
      </div>

      {/* POSITIONS TABLE */}
      {live.positions.length > 0 && (
        <div className="app-card rounded-2xl p-5" data-reveal style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
          <h2 className="text-base font-semibold mb-3" style={{ color: tv.textPrimary }}>Open Positions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ color: tv.textMuted }}>
                  <th className="pb-2 font-semibold">Symbol</th>
                  <th className="pb-2 font-semibold text-right">Qty</th>
                  <th className="pb-2 font-semibold text-right">Entry</th>
                  <th className="pb-2 font-semibold text-right">Current</th>
                  <th className="pb-2 font-semibold text-right">Mkt Value</th>
                  <th className="pb-2 font-semibold text-right">P/L</th>
                  <th className="pb-2 font-semibold text-right">P/L %</th>
                </tr>
              </thead>
              <tbody>
                {live.positions.map((p) => {
                  const pl = parseFloat(p.unrealized_pl);
                  const plPct = parseFloat(p.unrealized_plpc) * 100;
                  const plColor = pl >= 0 ? tv.accent : tv.statusRed;
                  return (
                    <tr key={p.symbol} className="border-t" style={{ borderColor: tv.borderBase }}>
                      <td className="py-2 font-bold" style={{ color: tv.textPrimary }}>{p.symbol}</td>
                      <td className="py-2 text-right mono" style={{ color: tv.textSecondary }}>{p.qty}</td>
                      <td className="py-2 text-right mono" style={{ color: tv.textSecondary }}>${parseFloat(p.avg_entry_price).toFixed(2)}</td>
                      <td className="py-2 text-right mono" style={{ color: tv.textPrimary }}>${parseFloat(p.current_price).toFixed(2)}</td>
                      <td className="py-2 text-right mono" style={{ color: tv.textSecondary }}>{fmtCurrency(parseFloat(p.market_value))}</td>
                      <td className="py-2 text-right mono font-semibold" style={{ color: plColor }}>{fmtCurrency(pl)}</td>
                      <td className="py-2 text-right mono font-semibold" style={{ color: plColor }}>{plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TOP 5 SIGNALS PREVIEW */}
      <div className="app-card rounded-2xl p-5" data-reveal style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: tv.textPrimary }}>Top five trade candidates</h2>
          <Link to="/signals" className="flex items-center gap-1 text-xs font-semibold" style={{ color: tv.accent, minHeight: '44px' }}>
            All signals <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex flex-col items-center gap-3 py-8 text-center rounded-xl" style={{ background: `linear-gradient(180deg, ${accentAlpha(0.04)} 0%, ${accentAlpha(0.02)} 100%)` }}>
          <div className="relative">
            <Activity className="h-10 w-10 animate-pulse" style={{ color: tv.accent, opacity: 0.6 }} />
            <Zap className="h-4 w-4 absolute -top-1 -right-1" style={{ color: tv.statusAmber }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>
            {live.connected ? 'Signal engine analyzing...' : 'No signals yet'}
          </p>
          <p className="max-w-sm text-xs" style={{ color: tv.textMuted }}>
            {live.connected ? 'Market data is flowing. The analysis engine will produce signals as patterns emerge.' : 'Connect your Alpaca paper account and market data to run the analysis engine.'}
          </p>
        </div>
      </div>

      {/* EXECUTION READINESS */}
      <div className="app-card rounded-2xl p-5" data-reveal style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5" style={{ color: live.connected ? tv.accent : tv.statusAmber }} />
          <h2 className="text-base font-semibold" style={{ color: tv.textPrimary }}>Execution readiness</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <ReadinessRow label="Terminal access" verified />
          <ReadinessRow label={`Alpaca ${env} connection`} verified={live.connected} />
          <ReadinessRow label="Market data feed" verified={live.connected && live.tickers.length > 0} />
          <ReadinessRow label="Account funded" verified={equity !== null && equity > 0} />
          <ReadinessRow label="Risk limits configured" verified />
          <ReadinessRow label="Audit trail active" verified />
          <ReadinessRow label="Server-side order validation" verified />
          <ReadinessRow label="Daily stop-loss enforced" verified />
          <ReadinessRow label="Position size limits" verified />
          <ReadinessRow label="Live orders enabled" verified={env === 'live' && live.connected} />
        </div>
        <p className="mt-3 text-xs" style={{ color: mutedAlpha(0.5) }}>
          {live.connected
            ? `Connected. ${env === 'live' ? 'Live orders require the ALPACA_LIVE_ORDERS_ENABLED server secret.' : 'Paper mode — switch to LIVE for real-money trading.'}`
            : 'Set your Alpaca keys as edge-function secrets and redeploy alpaca-connector to connect.'}
        </p>
      </div>

      {/* RISK / PLANNED BANKROLL */}
      <div className="panel-img rounded-xl p-4" style={{ background: tv.bgSurface, border: `1px solid ${amberAlpha(0.12)}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" style={{ color: tv.statusAmber }} />
            <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>
              {live.connected ? 'Paper account equity' : 'Planned live bankroll'}
            </p>
          </div>
          <p className="text-lg font-bold mono" style={{ color: live.connected ? tv.accent : tv.statusAmber }}>
            {equity !== null ? fmtCurrency(equity) : fmtCurrency(TRADING_PLANNED_LIVE)}
          </p>
        </div>
        <p className="mt-1.5 text-xs" style={{ color: tv.textMuted }}>
          {live.connected ? 'Paper trading account -- no real money at risk' : 'Not funded / Not connected'}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <RiskStat label="Default risk" value={fmtCurrency((equity ?? TRADING_PLANNED_LIVE) * TRADING_DEFAULT_RISK_PCT)} sub={`${(TRADING_DEFAULT_RISK_PCT * 100).toFixed(0)}%`} />
          <RiskStat label="Hard cap" value={fmtCurrency((equity ?? TRADING_PLANNED_LIVE) * TRADING_ABSOLUTE_RISK_PCT)} sub={`${(TRADING_ABSOLUTE_RISK_PCT * 100).toFixed(0)}%`} />
          <RiskStat label="Daily stop" value={`-${fmtCurrency((equity ?? TRADING_PLANNED_LIVE) * TRADING_DAILY_STOP_PCT)}`} sub={`${(TRADING_DAILY_STOP_PCT * 100).toFixed(0)}%`} />
          <RiskStat label="DD pause" value={`-${fmtCurrency((equity ?? TRADING_PLANNED_LIVE) * TRADING_DRAWDOWN_PAUSE_PCT)}`} sub={`${(TRADING_DRAWDOWN_PAUSE_PCT * 100).toFixed(0)}%`} />
        </div>
      </div>

      {/* Disclosure */}
      <div className="flex items-start gap-2 rounded-lg px-4 py-3 text-xs" style={{ background: amberAlpha(0.04), border: `1px solid ${amberAlpha(0.12)}`, color: tv.statusAmber }}>
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          {env === 'live'
            ? 'LIVE mode — orders placed from the ticket use real money in your Alpaca brokerage account. Alpaca API keys are stored server-side only.'
            : 'PAPER mode — orders are simulated by Alpaca, no real money at risk. Switch to LIVE on the toggle above for real-money trading.'}
        </span>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Activity className="h-8 w-8 mb-2" style={{ color: mutedAlpha(0.25) }} />
      <p className="text-sm" style={{ color: tv.textMuted }}>{message}</p>
    </div>
  );
}

function StatusBadge({ connected, label }: { connected: boolean; label: string }) {
  const color = connected ? tv.accent : tv.statusAmber;
  const bg = connected ? accentAlpha(0.12) : amberAlpha(0.12);
  const border = connected ? accentAlpha(0.2) : amberAlpha(0.2);
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: bg, color, border: `1px solid ${border}` }}>{label}</span>
  );
}

function MarketStatusBadge({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: mutedAlpha(0.06), border: `1px solid ${tv.borderBase}` }}>
      {connected ? <Wifi className="h-3.5 w-3.5" style={{ color: tv.accent }} /> : <Clock className="h-3.5 w-3.5" style={{ color: tv.textMuted }} />}
      <span className="text-xs font-semibold" style={{ color: connected ? tv.accent : tv.textMuted }}>{connected ? 'Connected' : 'Connecting...'}</span>
    </div>
  );
}

function TickerChip({ ticker, isLive }: { ticker: LiveTicker; isLive: boolean }) {
  const positive = ticker.change >= 0;
  const color = positive ? tv.accent : tv.statusRed;
  const sparkData = ticker.sparkline.map((v, i) => ({ i, v }));
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 shrink-0" style={{ background: mutedAlpha(0.04), border: `1px solid ${tv.borderBase}`, minWidth: 172 }}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold" style={{ color: tv.textPrimary }}>{ticker.symbol}</span>
          {isLive && <span className="h-1.5 w-1.5 rounded-full" style={{ background: tv.accent }} />}
        </div>
        <span className="mono text-sm font-bold" style={{ color: tv.textPrimary }}>${ticker.price.toFixed(2)}</span>
        <span className="mono text-[11px] font-semibold" style={{ color }}>
          {positive ? '+' : ''}{ticker.change.toFixed(2)} ({positive ? '+' : ''}{ticker.changePct.toFixed(2)}%)
        </span>
      </div>
      <div style={{ width: 56, height: 32, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height={32}>
          <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
            <defs>
              <linearGradient id={`spark-${ticker.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.2} fill={`url(#spark-${ticker.symbol})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ConnectionCardUI({ card }: { card: ConnectionCard }) {
  const color = card.status === 'connected' ? tv.accent : card.status === 'error' ? tv.statusRed : tv.statusAmber;
  const alphaFn = card.status === 'connected' ? accentAlpha : card.status === 'error' ? redAlpha : amberAlpha;
  const Icon = card.status === 'connected' ? Radio : card.status === 'error' ? XCircle : Lock;
  return (
    <div className="panel-img rounded-xl p-4 relative overflow-hidden" style={{ background: tv.bgSurface, border: `1px solid ${alphaFn(0.13)}`, boxShadow: `inset 0 1px 0 0 ${alphaFn(0.07)}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: color, animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }} />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        </span>
        <Icon className="h-4 w-4" style={{ color }} />
        <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{card.name}</p>
      </div>
      <p className="text-xs font-semibold" style={{ color }}>{connectionStatusLabel(card.status)}</p>
      <p className="mt-1 text-xs" style={{ color: tv.textMuted }}>{card.description}</p>
      <p className="mt-1.5 text-xs" style={{ color: mutedAlpha(0.5) }}>{card.nextAction}</p>
    </div>
  );
}

function MetricBox({ label, value, live, highlight }: { label: string; value: string; live?: boolean; highlight?: 'green' | 'red' }) {
  const isNA = value === 'N/A';
  const borderColor = highlight === 'green' ? accentAlpha(0.35) : highlight === 'red' ? redAlpha(0.35) : live ? accentAlpha(0.35) : mutedAlpha(0.15);
  const valueColor = highlight === 'green' ? tv.accent : highlight === 'red' ? tv.statusRed : isNA ? tv.textMuted : tv.textPrimary;
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ background: mutedAlpha(0.04), borderLeft: `2px solid ${borderColor}` }}>
      <p className="text-xs" style={{ color: tv.textMuted }}>{label}</p>
      <p className="text-sm font-bold mono" style={{ color: valueColor }}>{value}</p>
    </div>
  );
}

function ReadinessRow({ label, verified, blocksLive }: { label: string; verified: boolean; blocksLive?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-3 py-1.5" style={{ background: mutedAlpha(0.03) }}>
      {verified ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: tv.accent }} /> : <Minus className="h-4 w-4 shrink-0" style={{ color: tv.statusRed }} />}
      <p className="text-sm" style={{ color: verified ? tv.textSecondary : tv.textMuted }}>{label}</p>
      {blocksLive && !verified && <span className="ml-auto text-[10px] font-semibold" style={{ color: tv.statusRed }}>Blocks live</span>}
    </div>
  );
}

function RiskStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center rounded-lg p-1.5" style={{ background: mutedAlpha(0.04) }}>
      <p className="text-xs" style={{ color: tv.textMuted }}>{label}</p>
      <p className="text-sm font-bold mono" style={{ color: tv.statusAmber }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: mutedAlpha(0.4) }}>{sub}</p>}
    </div>
  );
}
