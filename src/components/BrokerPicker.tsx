import { useState } from 'react';
import { Wallet, ExternalLink, ShieldCheck, Zap, CreditCard, X, Check, AlertTriangle } from 'lucide-react';
import { BROKERS, getBroker, type BrokerId } from '@/services/brokers';
import { tv, accentAlpha, amberAlpha, redAlpha, mutedAlpha } from '@/lib/themeVars';

/**
 * Venue selector. One click switches which account the whole terminal reads and
 * trades through; a second panel explains how to fund each one and links
 * straight to that venue's deposit screen.
 */
export function BrokerPicker({
  active,
  connected,
  onSelect,
}: {
  active: BrokerId;
  connected: boolean;
  onSelect: (id: BrokerId) => void;
}) {
  const [funding, setFunding] = useState(false);
  const [confirm, setConfirm] = useState<BrokerId | null>(null);
  const current = getBroker(active);

  function choose(id: BrokerId) {
    const target = getBroker(id);
    if (target.realMoney && id !== active) { setConfirm(id); return; }
    onSelect(id);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {BROKERS.map((b) => {
          const isActive = b.id === active;
          return (
            <button
              key={b.id}
              onClick={() => choose(b.id)}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all"
              style={
                isActive
                  ? b.realMoney
                    ? { background: amberAlpha(0.15), color: tv.statusAmber, border: `1px solid ${amberAlpha(0.4)}`, minHeight: 44 }
                    : { background: accentAlpha(0.14), color: tv.accent, border: `1px solid ${accentAlpha(0.3)}`, minHeight: 44 }
                  : { background: mutedAlpha(0.06), color: tv.textMuted, border: `1px solid ${tv.borderBase}`, minHeight: 44 }
              }
            >
              {isActive && connected && <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />}
              {b.realMoney ? <Zap className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {b.name}
            </button>
          );
        })}

        <button
          onClick={() => setFunding(true)}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all"
          style={{ background: accentAlpha(0.1), color: tv.accent, border: `1px solid ${accentAlpha(0.25)}`, minHeight: 44 }}
        >
          <Wallet className="h-4 w-4" /> Add funds
        </button>
      </div>

      <p className="mt-2 text-xs" style={{ color: tv.textMuted }}>
        {current.tagline}
        {current.realMoney && ' · Real money at risk.'}
      </p>
      {current.warning && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed" style={{ color: tv.statusAmber }}>
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {current.warning}
        </p>
      )}

      {/* ── Real-money switch confirmation ─────────────────────────────── */}
      {confirm && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center p-4"
          style={{ background: 'rgba(3,6,5,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setConfirm(null)}
        >
          <div
            className="panel-img w-full max-w-sm rounded-2xl p-5"
            style={{ background: tv.bgSurface, border: `1px solid ${amberAlpha(0.4)}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold" style={{ color: tv.statusAmber }}>
                Switch to {getBroker(confirm).name}?
              </h4>
              <button onClick={() => setConfirm(null)} aria-label="Cancel">
                <X className="h-4 w-4" style={{ color: tv.textMuted }} />
              </button>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: tv.textMuted }}>
              This reads your real {getBroker(confirm).name} account and the order ticket will place
              <strong style={{ color: tv.statusAmber }}> real-money orders</strong>. Orders also require the
              server-side enable flag — without it the server refuses them even in this mode.
            </p>
            {getBroker(confirm).warning && (
              <p className="mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed"
                style={{ background: redAlpha(0.08), border: `1px solid ${redAlpha(0.25)}`, color: tv.statusRed }}>
                {getBroker(confirm).warning}
              </p>
            )}
            <button
              onClick={() => { onSelect(confirm); setConfirm(null); }}
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-bold"
              style={{ background: amberAlpha(0.2), color: tv.statusAmber, border: `1px solid ${amberAlpha(0.4)}` }}
            >
              Switch to {getBroker(confirm).name}
            </button>
            <button
              onClick={() => setConfirm(null)}
              className="mt-2 w-full rounded-lg py-2 text-xs"
              style={{ color: tv.textMuted, background: mutedAlpha(0.06) }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Funding panel ──────────────────────────────────────────────── */}
      {funding && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center p-4"
          style={{ background: 'rgba(3,6,5,0.78)', backdropFilter: 'blur(8px)' }}
          onClick={() => setFunding(false)}
        >
          <div
            className="panel-img max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5"
            style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="serif text-xl font-semibold" style={{ color: tv.textPrimary }}>Add funds</h3>
              <button onClick={() => setFunding(false)} aria-label="Close">
                <X className="h-4 w-4" style={{ color: tv.textMuted }} />
              </button>
            </div>
            <p className="mb-4 text-xs" style={{ color: tv.textMuted }}>
              Deposits happen on the venue's own site — this terminal never handles your card or
              banking details. Pick an account below to open its deposit page.
            </p>

            <div className="space-y-3">
              {BROKERS.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl p-4"
                  style={{
                    background: mutedAlpha(0.04),
                    border: `1px solid ${b.id === active ? accentAlpha(0.3) : tv.borderBase}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold" style={{ color: tv.textPrimary }}>{b.name}</p>
                        {b.id === active && (
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ background: accentAlpha(0.15), color: tv.accent }}>Active</span>
                        )}
                        {b.costaRica === 'yes' && (
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ background: mutedAlpha(0.1), color: tv.textMuted }}>Costa Rica ✓</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: tv.textMuted }}>{b.asset} · {b.fundingSpeed}</p>
                    </div>
                    <a
                      href={b.depositUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
                      style={{ background: accentAlpha(0.14), color: tv.accent, border: `1px solid ${accentAlpha(0.25)}` }}
                    >
                      {b.realMoney ? <CreditCard className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      {b.realMoney ? 'Deposit' : 'Open'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tv.textMuted }}>Money in</p>
                      <ul className="mt-1 space-y-0.5">
                        {b.funding.map((f) => (
                          <li key={f} className="text-xs" style={{ color: tv.textSecondary }}>· {f}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tv.textMuted }}>Money out</p>
                      <ul className="mt-1 space-y-0.5">
                        {b.withdrawal.map((w) => (
                          <li key={w} className="text-xs" style={{ color: tv.textSecondary }}>· {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {b.warning && (
                    <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: tv.statusAmber }}>{b.warning}</p>
                  )}

                  <details className="mt-3">
                    <summary className="cursor-pointer text-[11px]" style={{ color: tv.textMuted }}>
                      Server keys this account needs
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {b.secrets.map((s) => (
                        <code key={s} className="rounded px-1.5 py-0.5 text-[10px]"
                          style={{ background: mutedAlpha(0.08), color: tv.textSecondary }}>{s}</code>
                      ))}
                    </div>
                    <a href={b.apiKeysUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px]" style={{ color: tv.accent }}>
                      Create API keys <ExternalLink className="h-3 w-3" />
                    </a>
                  </details>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
              style={{ background: amberAlpha(0.05), border: `1px solid ${amberAlpha(0.15)}`, color: tv.statusAmber }}>
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Card and PayPal deposits on crypto venues can carry a withdrawal hold of up to 7 days on
                first funding. Money goes in fast; the first cash-out may not.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
