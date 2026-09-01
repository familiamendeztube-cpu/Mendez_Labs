import { useState } from 'react';
import { Briefcase, AlertTriangle, XCircle, RefreshCw, Info, Activity, Loader2 } from 'lucide-react';
import { fmtCurrency, fmtSignedCurrency } from '@/utils/format';
import { ChartContainer } from '@/components/ChartContainer';
import { ExposurePieChart, EquityCurveChart } from '@/components/Charts';
import { useLiveTrading } from '@/services/tradingLive';
import { tv, accentAlpha, amberAlpha, redAlpha, mutedAlpha } from '@/lib/themeVars';
import { PageHero } from '@/components/PageHero';
import { APP_IMAGES } from '@/data/appImages';

export function PaperPortfolio() {
  const live = useLiveTrading(30_000);
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const [killLoading, setKillLoading] = useState(false);
  const [killResult, setKillResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const acct = live.account;
  const equity = acct ? parseFloat(acct.equity) : null;
  const cash = acct ? parseFloat(acct.cash) : null;
  const buyingPower = acct ? parseFloat(acct.buying_power) : null;
  const lastEquity = acct ? parseFloat(acct.last_equity) : null;
  const dayPL = equity !== null && lastEquity !== null ? equity - lastEquity : null;
  const totalPL = equity !== null && cash !== null ? equity - 100000 : null;

  const hasEquityHistory = live.equityCurve.length > 0;

  const openOrders = live.orders.filter((o) => ['new', 'partially_filled', 'accepted', 'pending_new'].includes(o.status));

  const handleKill = async () => {
    setKillLoading(true);
    try {
      const result = await live.cancelAllOrders();
      setKillResult({ ok: true, msg: `Cancelled ${result.cancelled} open order(s)` });
      setShowKillConfirm(false);
      live.refresh();
    } catch (err) {
      setKillResult({ ok: false, msg: err instanceof Error ? err.message : 'Cancel failed' });
    } finally {
      setKillLoading(false);
      setTimeout(() => setKillResult(null), 5000);
    }
  };

  return (
    <div data-stagger-visible style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHero
        image={APP_IMAGES.ledger}
        eyebrow="Trading"
        title="Paper Portfolio"
        subtitle={live.connected ? 'Live Alpaca paper positions, orders, and fills.' : 'Connecting to Alpaca paper account...'}
        action={
          <button
            onClick={live.refresh}
            disabled={live.loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, background: accentAlpha(0.14), color: tv.accent, border: 'none', cursor: 'pointer', minHeight: 44, opacity: live.loading ? 0.5 : 1, backdropFilter: 'blur(4px)' }}
          >
            <RefreshCw size={14} className={live.loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {/* Kill result banner */}
      {killResult && (
        <div style={{ borderRadius: 8, padding: '10px 16px', fontSize: 13, background: killResult.ok ? accentAlpha(0.08) : redAlpha(0.08), border: `1px solid ${killResult.ok ? accentAlpha(0.2) : redAlpha(0.2)}`, color: killResult.ok ? tv.accent : tv.statusRed }}>
          {killResult.msg}
        </div>
      )}

      {/* Account summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        <AcctCard label="Equity" value={equity} />
        <AcctCard label="Cash" value={cash} />
        <AcctCard label="Buying power" value={buyingPower} />
        <AcctCard label="Day P/L" value={dayPL} signed />
        <AcctCard label="Total P/L" value={totalPL} signed />
      </div>

      {/* Chart row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 8 }}>
        <ChartContainer title="Account Equity" action={
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: hasEquityHistory ? accentAlpha(0.12) : amberAlpha(0.12), color: hasEquityHistory ? tv.accent : tv.statusAmber, border: `1px solid ${hasEquityHistory ? accentAlpha(0.2) : amberAlpha(0.2)}` }}>
            {hasEquityHistory ? 'Live' : 'No history'}
          </span>
        }>
          {hasEquityHistory ? <EquityCurveChart data={live.equityCurve} /> : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-8 w-8 mb-2" style={{ color: mutedAlpha(0.25) }} />
              <p className="text-sm" style={{ color: tv.textMuted }}>Equity history will appear after your first trading day</p>
            </div>
          )}
        </ChartContainer>
        <ChartContainer title="Exposure Breakdown" action={
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: live.positions.length > 0 ? accentAlpha(0.12) : amberAlpha(0.12), color: live.positions.length > 0 ? tv.accent : tv.statusAmber, border: `1px solid ${live.positions.length > 0 ? accentAlpha(0.2) : amberAlpha(0.2)}` }}>
            {live.positions.length > 0 ? 'Live' : 'No positions'}
          </span>
        }>
          <ExposurePieChart data={live.exposure} />
        </ChartContainer>
      </div>

      {/* Positions */}
      <Section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: tv.textPrimary, margin: 0 }}>Positions ({live.positions.length})</h2>
        </div>
        {live.positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: tv.textMuted }}>
                  {['Symbol', 'Qty', 'Avg entry', 'Current', 'Mkt Value', 'Unrealized P/L', 'P/L %'].map(h => (
                    <th key={h} style={{ padding: '8px 8px', textAlign: h === 'Symbol' ? 'left' : 'right', fontWeight: 600, background: mutedAlpha(0.03), borderBottom: `1px solid ${tv.borderBase}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {live.positions.map((p) => {
                  const pl = parseFloat(p.unrealized_pl);
                  const plPct = parseFloat(p.unrealized_plpc) * 100;
                  const plColor = pl >= 0 ? tv.accent : tv.statusRed;
                  return (
                    <tr key={p.symbol} style={{ borderBottom: `1px solid ${tv.borderBase}` }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700, color: tv.textPrimary }}>{p.symbol}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: tv.textSecondary }}>{p.qty}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: tv.textSecondary }}>${parseFloat(p.avg_entry_price).toFixed(2)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: tv.textPrimary }}>${parseFloat(p.current_price).toFixed(2)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: tv.textSecondary }}>{fmtCurrency(parseFloat(p.market_value))}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: plColor }}>{fmtCurrency(pl)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: plColor }}>{plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: `linear-gradient(135deg, ${accentAlpha(0.1)}, ${mutedAlpha(0.06)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={22} style={{ color: tv.textMuted }} />
            </div>
            <p style={{ fontSize: 13, color: tv.textMuted, margin: 0 }}>
              {live.connected ? 'No open positions. Submit paper orders to see positions here.' : 'Connect your Alpaca paper account to see positions.'}
            </p>
          </div>
        )}
      </Section>

      {/* Orders */}
      <Section>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: tv.textPrimary, margin: '0 0 16px' }}>Orders and fills ({live.orders.length})</h2>
        {live.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: tv.textMuted }}>
                  {['Time', 'Symbol', 'Side', 'Qty', 'Type', 'Price', 'Status', 'Fill price'].map(h => (
                    <th key={h} style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 600, background: mutedAlpha(0.03), borderBottom: `1px solid ${tv.borderBase}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {live.orders.map((o) => {
                  const statusColor = o.status === 'filled' ? tv.accent : o.status === 'canceled' ? tv.statusRed : tv.statusAmber;
                  return (
                    <tr key={o.id} style={{ borderBottom: `1px solid ${tv.borderBase}` }}>
                      <td style={{ padding: '10px 8px', fontSize: 11, color: tv.textMuted }}>{new Date(o.created_at).toLocaleString()}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 700, color: tv.textPrimary }}>{o.symbol}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: o.side === 'buy' ? tv.accent : tv.statusRed, textTransform: 'uppercase' }}>{o.side}</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono, monospace', color: tv.textSecondary }}>{o.qty}</td>
                      <td style={{ padding: '10px 8px', color: tv.textMuted, textTransform: 'uppercase' }}>{o.type}</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono, monospace', color: tv.textSecondary }}>{o.limit_price ? `$${parseFloat(o.limit_price).toFixed(2)}` : 'MKT'}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: statusColor, textTransform: 'uppercase', fontSize: 11 }}>{o.status}</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono, monospace', color: tv.textPrimary }}>{o.filled_avg_price ? `$${parseFloat(o.filled_avg_price).toFixed(2)}` : '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: `linear-gradient(135deg, ${accentAlpha(0.1)}, ${mutedAlpha(0.06)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info size={22} style={{ color: tv.textMuted }} />
            </div>
            <p style={{ fontSize: 13, color: tv.textMuted, margin: 0 }}>
              {live.connected ? 'No orders yet. Submit paper orders from the Signals page.' : 'Connect your Alpaca paper account to see orders.'}
            </p>
          </div>
        )}
      </Section>

      {/* Kill switch */}
      <div style={{ borderRadius: 12, padding: 20, background: `linear-gradient(135deg, ${redAlpha(0.04)}, ${redAlpha(0.01)})`, border: `1px solid ${redAlpha(0.15)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: tv.statusRed, margin: 0 }}>Kill switch</p>
            <p style={{ fontSize: 12, color: tv.textMuted, marginTop: 4 }}>
              Cancels all open paper orders ({openOrders.length} open). Does not close positions.
            </p>
          </div>
          {!showKillConfirm ? (
            <button
              onClick={() => setShowKillConfirm(true)}
              disabled={openOrders.length === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 600, background: redAlpha(0.1), color: tv.statusRed, border: `1px solid ${redAlpha(0.2)}`, cursor: openOrders.length > 0 ? 'pointer' : 'not-allowed', opacity: openOrders.length > 0 ? 1 : 0.5, minHeight: 44, whiteSpace: 'nowrap' }}
            >
              <XCircle size={16} /> Cancel all orders
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setShowKillConfirm(false)} style={{ borderRadius: 8, padding: '10px 12px', fontSize: 12, fontWeight: 600, color: tv.textMuted, background: 'none', border: 'none', cursor: 'pointer', minHeight: 44 }}>Back</button>
              <button
                onClick={handleKill}
                disabled={killLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 700, background: tv.statusRed, color: '#fff', border: 'none', cursor: killLoading ? 'wait' : 'pointer', minHeight: 44, whiteSpace: 'nowrap' }}
              >
                {killLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm cancel all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reconciliation */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, borderRadius: 8, padding: '12px 16px', fontSize: 12, background: amberAlpha(0.04), border: `1px solid ${amberAlpha(0.12)}`, color: tv.statusAmber }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Paper mode only. Positions and orders are from Alpaca paper account. Any mismatch between local and provider state will show a warning here.</span>
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 16, padding: 20, background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
      {children}
    </div>
  );
}

function AcctCard({ label, value, signed }: { label: string; value: number | null; signed?: boolean }) {
  const display = value !== null ? (signed ? fmtSignedCurrency(value) : fmtCurrency(value)) : 'N/A';
  const isPositive = signed && value !== null && value >= 0;
  const isNegative = signed && value !== null && value < 0;
  const valueColor = value === null ? tv.textMuted : isPositive ? tv.accent : isNegative ? tv.statusRed : tv.textPrimary;
  const accent = isPositive ? tv.accent : isNegative ? tv.statusRed : tv.textMuted;
  const gradFrom = isPositive ? accentAlpha(0.5) : isNegative ? redAlpha(0.5) : mutedAlpha(0.3);

  return (
    <div style={{ borderRadius: 8, background: tv.bgSurface, border: `1px solid ${tv.borderBase}`, borderLeft: `2px solid ${accent}`, overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${gradFrom}, transparent)` }} />
      <div style={{ padding: '10px 12px 12px' }}>
        <p style={{ fontSize: 11, color: tv.textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        <p style={{ marginTop: 4, fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: valueColor, lineHeight: 1.1 }}>{display}</p>
      </div>
    </div>
  );
}
