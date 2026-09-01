import { useState } from 'react';
import { Info, Wallet, RotateCcw, Lock, Shield, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { fmtCurrency, fmtPercent } from '@/utils/format';
import {
  RISK_RULES,
  PLANNED_SPORTS_LIVE,
  PLANNED_TRADING_LIVE,
  dailyDrawdownPct,
  totalDrawdownPct,
} from '@/utils/bankrollCalc';
import { tv, accentAlpha, redAlpha, mutedAlpha, amberAlpha } from '@/lib/themeVars';
import { PageHero } from '@/components/PageHero';
import { APP_IMAGES } from '@/data/appImages';

// ── Component ───────────────────────────────────────────────────────────────

export function Bankroll() {
  const { metrics, riskSettings, resetSimulation, bets } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);

  const openBets = bets.filter((b) => b.result === 'pending');
  const trackedToday = openBets.reduce((s, b) => s + b.stake, 0);

  const settled = metrics.betsWon + metrics.betsLost;
  const dailyDD = dailyDrawdownPct(metrics.todayPnl, riskSettings.startingBankroll);
  const totalDD = totalDrawdownPct(metrics.currentBalance, riskSettings.startingBankroll);

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    resetSimulation();
    setConfirmReset(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <PageHero
        image={APP_IMAGES.vault}
        eyebrow="Sports Lab"
        title="Bankroll"
        subtitle="Paper bankroll, risk controls, and planned live accounts."
      />

      {/* Disclosure */}
      <div
        className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
        style={{ background: amberAlpha(0.04), border: `1px solid ${amberAlpha(0.12)}`, color: tv.statusAmber }}
      >
        <Info className="h-4 w-4 shrink-0" />
        <span>This does not place real bets. All amounts are simulated for paper tracking.</span>
      </div>

      {/* ── Paper balance card (preserved exactly) ───────────────────────── */}
      <div className="panel-img rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6" style={{ color: tv.accent }} />
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: tv.textMuted }}>Paper balance</p>
            <p className="text-4xl font-bold mono" style={{ color: tv.textPrimary }}>{fmtCurrency(metrics.currentBalance)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs" style={{ color: tv.textMuted }}>Starting</p>
            <p className="text-lg mono" style={{ color: tv.textSecondary }}>{fmtCurrency(riskSettings.startingBankroll)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: tv.textMuted }}>Tracked today</p>
            <p className="text-lg mono" style={{ color: tv.statusAmber }}>{fmtCurrency(trackedToday)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: tv.textMuted }}>Total return</p>
            <p className="text-lg mono" style={{ color: metrics.totalReturnPct >= 0 ? tv.accent : tv.statusRed }}>
              {metrics.totalReturnPct >= 0 ? '+' : ''}{fmtPercent(metrics.totalReturnPct)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Settled record (preserved exactly) ───────────────────────────── */}
      <div className="panel-img rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <h2 className="text-base font-semibold mb-3" style={{ color: tv.textPrimary }}>Settled record</h2>
        <div className="flex gap-6">
          <div>
            <p className="text-3xl font-bold mono" style={{ color: tv.accent }}>{metrics.betsWon}</p>
            <p className="text-xs" style={{ color: tv.textMuted }}>Won</p>
          </div>
          <div>
            <p className="text-3xl font-bold mono" style={{ color: tv.statusRed }}>{metrics.betsLost}</p>
            <p className="text-xs" style={{ color: tv.textMuted }}>Lost</p>
          </div>
          <div>
            <p className="text-3xl font-bold mono" style={{ color: tv.statusAmber }}>{openBets.length}</p>
            <p className="text-xs" style={{ color: tv.textMuted }}>Pending</p>
          </div>
        </div>
      </div>

      {/* ── Risk status indicators ───────────────────────────────────────── */}
      <div className="panel-img rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <h2 className="text-base font-semibold mb-3" style={{ color: tv.textPrimary }}>Risk status</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatusIndicator
            label="Daily drawdown"
            value={dailyDD !== null && settled > 0 ? `${(dailyDD * 100).toFixed(1)}%` : 'N/A'}
            limit="5% limit"
            status={dailyDD === null || settled === 0 ? 'na' : dailyDD >= 0.05 ? 'triggered' : dailyDD >= 0.03 ? 'warning' : 'ok'}
          />
          <StatusIndicator
            label="Total drawdown"
            value={totalDD !== null && settled > 0 ? `${(totalDD * 100).toFixed(1)}%` : 'N/A'}
            limit="10% pause"
            status={totalDD === null || settled === 0 ? 'na' : totalDD >= 0.10 ? 'triggered' : totalDD >= 0.06 ? 'warning' : 'ok'}
          />
          <StatusIndicator
            label="Max per pick"
            value={fmtCurrency(riskSettings.startingBankroll * 0.01)}
            limit="1% of bankroll"
            status="ok"
          />
          <StatusIndicator
            label="Absolute cap"
            value={fmtCurrency(riskSettings.startingBankroll * 0.02)}
            limit="2% hard limit"
            status="ok"
          />
        </div>
      </div>

      {/* ── Planned live bankrolls ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PlannedCard label="Sports live" amount={PLANNED_SPORTS_LIVE} />
        <PlannedCard label="Trading live" amount={PLANNED_TRADING_LIVE} />
      </div>

      {/* ── Risk Rules ───────────────────────────────────────────────────── */}
      <div className="panel-img rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <h2 className="text-base font-semibold mb-3" style={{ color: tv.textPrimary }}>Risk rules</h2>
        <div className="space-y-3">
          {RISK_RULES.map((rule) => (
            <div key={rule.id} className="flex items-start gap-3">
              <Shield className="h-4 w-4 shrink-0 mt-0.5" style={{ color: tv.accent }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{rule.name}</p>
                <p className="text-xs" style={{ color: tv.textMuted }}>{rule.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Reset (preserved, scoped to paper only, now with confirmation) ── */}
      <div className="panel-img rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" style={{ color: tv.statusAmber }} />
            <span className="text-sm" style={{ color: tv.textSecondary }}>Reset paper bankroll</span>
          </div>
          <button
            onClick={handleReset}
            className="rounded-lg px-4 py-2.5 text-sm font-medium"
            style={{
              color: confirmReset ? tv.statusRed : tv.statusAmber,
              border: `1px solid ${confirmReset ? redAlpha(0.3) : amberAlpha(0.2)}`,
              background: confirmReset ? redAlpha(0.06) : amberAlpha(0.04),
              minHeight: '44px',
            }}
          >
            {confirmReset ? 'Confirm reset' : 'Reset'}
          </button>
        </div>
        <p className="mt-1 text-xs" style={{ color: mutedAlpha(0.6) }}>
          Clears all paper bets and resets balance to starting bankroll. This does not affect planned live bankroll labels or provider settings.
        </p>
        {confirmReset && (
          <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: tv.statusRed }}>
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Click again to confirm. This clears all paper tracking data.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PlannedCard({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="panel-img rounded-xl p-4" style={{ background: tv.bgSurface, border: `1px solid ${amberAlpha(0.12)}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4" style={{ color: tv.statusAmber }} />
          <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{label}</p>
        </div>
        <p className="text-lg font-bold mono" style={{ color: tv.statusAmber }}>{fmtCurrency(amount)}</p>
      </div>
      <p className="mt-1.5 text-xs" style={{ color: tv.textMuted }}>Not funded / Not connected</p>
      <p className="mt-0.5 text-xs" style={{ color: mutedAlpha(0.4) }}>Coming soon — connect in Settings</p>
    </div>
  );
}

function StatusIndicator({ label, value, limit, status }: { label: string; value: string; limit: string; status: 'ok' | 'warning' | 'triggered' | 'na' }) {
  const color = status === 'ok' ? tv.accent : status === 'warning' ? tv.statusAmber : status === 'triggered' ? tv.statusRed : tv.textMuted;
  const bg = status === 'ok' ? accentAlpha(0.06) : status === 'warning' ? amberAlpha(0.06) : status === 'triggered' ? redAlpha(0.06) : mutedAlpha(0.04);
  const borderColor = status === 'ok' ? accentAlpha(0.13) : status === 'warning' ? amberAlpha(0.13) : status === 'triggered' ? redAlpha(0.13) : mutedAlpha(0.13);

  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: bg, border: `1px solid ${borderColor}` }}>
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: tv.textMuted }}>{label}</p>
        <p className="text-xs" style={{ color: tv.textMuted }}>{limit}</p>
      </div>
      <p className="mt-0.5 text-base font-bold mono" style={{ color }}>{value}</p>
    </div>
  );
}
