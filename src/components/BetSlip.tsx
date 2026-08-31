import { useState } from 'react';
import { CheckCircle2, Info, Trash2, X, Zap } from 'lucide-react';
import { useStore, suggestedStake } from '@/store/StoreContext';
import { fmtCurrency, fmtOdds, fmtPercent, payoutMultiplier } from '@/utils/format';
import { formatSelection } from '@/utils/sportsMarket';
import { tv, accentAlpha, redAlpha, mutedAlpha } from '@/lib/themeVars';

export function BetSlip() {
  const {
    betSlipOpen,
    setBetSlipOpen,
    betSlipLegs,
    removeBetSlipLeg,
    clearBetSlip,
    addBet,
    riskSettings,
    metrics,
    addLog,
  } = useStore();

  const [stake, setStake] = useState(0);
  const [useSuggested, setUseSuggested] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!betSlipOpen) return null;

  const type = betSlipLegs.length > 1 ? 'parlay' : 'straight';
  const combinedOdds = betSlipLegs.length === 0 ? 0 : type === 'parlay'
    ? betSlipLegs.reduce((acc, leg) => acc * (payoutMultiplier(leg.odds) + 1), 1) - 1
    : betSlipLegs[0].odds;

  const suggested = betSlipLegs.length > 0
    ? suggestedStake(
        betSlipLegs.reduce((s, l) => s + l.edge, 0) / betSlipLegs.length,
        betSlipLegs.reduce((s, l) => s + l.confidenceScore, 0) / betSlipLegs.length,
        metrics.currentBalance,
        riskSettings,
      )
    : 0;

  const effectiveStake = useSuggested ? Math.round(suggested * 100) / 100 : stake;
  const potentialPayout = effectiveStake * payoutMultiplier(combinedOdds);
  const potentialProfit = potentialPayout;
  const exposureAfter = metrics.openExposure + effectiveStake;

  function handleConfirm() {
    if (betSlipLegs.length === 0 || effectiveStake <= 0) return;
    setConfirming(true);
    const res = addBet(betSlipLegs, type, effectiveStake);
    if (res.ok) {
      setResult({ ok: true, message: 'Simulated wager confirmed and recorded.' });
      clearBetSlip();
      setStake(0);
      addLog({ category: 'signal', source: 'EXEC', message: `Wager confirmed · ${type} · ${fmtCurrency(effectiveStake)}` });
    } else {
      setResult({ ok: false, message: res.reason ?? 'Rejected by risk engine.' });
      addLog({ category: 'risk', source: 'RISK', message: `Wager rejected: ${res.reason}` });
    }
    setConfirming(false);
    setTimeout(() => setResult(null), 4000);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setBetSlipOpen(false)} />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col animate-slide-in"
        style={{ borderLeft: `1px solid ${tv.borderBase}`, background: `color-mix(in srgb, ${tv.bgOverlay} 95%, transparent)`, backdropFilter: 'blur(10px)' }}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-4" style={{ borderBottom: `1px solid ${tv.borderBase}` }}>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: tv.accent }} />
            <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>Simulated Bet Slip</h3>
          </div>
          <button onClick={() => setBetSlipOpen(false)} className="rounded p-1" style={{ color: tv.textMuted }} aria-label="Close bet slip">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Legs */}
        <div className="flex-1 overflow-y-auto p-4">
          {betSlipLegs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 rounded-full p-4" style={{ border: `1px solid ${tv.borderBase}` }}>
                <Zap className="h-6 w-6" style={{ color: tv.textSecondary }} />
              </div>
              <p className="text-sm" style={{ color: tv.textMuted }}>No selections yet</p>
              <p className="mt-1 text-xs" style={{ color: mutedAlpha(0.6) }}>Add opportunities from the Sports Intelligence or Scanner views.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {betSlipLegs.map((leg) => (
                <div key={leg.opportunityId} className="rounded-lg p-3" style={{ border: `1px solid ${tv.borderBase}`, background: tv.bgSurface }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: tv.textPrimary }}>{leg.matchup}</p>
                      <p className="text-xs" style={{ color: tv.textMuted }}>{formatSelection(leg.market, leg.side)}</p>
                    </div>
                    <button onClick={() => removeBetSlipLeg(leg.opportunityId)} className="rounded p-1" style={{ color: tv.textMuted }} aria-label="Remove selection">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="mono" style={{ color: tv.textMuted }}>Odds {fmtOdds(leg.odds)}</span>
                    <span className="mono" style={{ color: tv.accent }}>Edge {fmtPercent(leg.edge)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="mono" style={{ color: tv.textMuted }}>M1 Prob {fmtPercent(leg.modelProbability)}</span>
                    <span className="mono" style={{ color: tv.textSecondary }}>Conf {fmtPercent(leg.confidenceScore)}</span>
                  </div>
                </div>
              ))}
              {type === 'parlay' && (
                <div className="rounded-lg p-2 text-center text-xs" style={{ border: `1px solid ${accentAlpha(0.2)}`, background: accentAlpha(0.05), color: tv.accent }}>
                  Parlay simulation · {betSlipLegs.length} legs
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer / stake controls */}
        {betSlipLegs.length > 0 && (
          <div className="p-4 space-y-3" style={{ borderTop: `1px solid ${tv.borderBase}` }}>
            {result && (
              <div className="rounded-lg p-2.5 text-xs" style={{
                border: `1px solid ${result.ok ? accentAlpha(0.3) : redAlpha(0.3)}`,
                background: result.ok ? accentAlpha(0.08) : redAlpha(0.08),
                color: result.ok ? tv.accent : tv.statusRed,
              }}>
                <div className="flex items-center gap-2">
                  {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {result.message}
                </div>
              </div>
            )}
            <div>
              <label className="mb-1 flex items-center justify-between text-xs">
                <span style={{ color: tv.textMuted }}>Stake</span>
                <button onClick={() => setUseSuggested((v) => !v)} className="rounded px-2 py-0.5 text-[10px] font-semibold" style={{ background: useSuggested ? accentAlpha(0.12) : mutedAlpha(0.04), color: useSuggested ? tv.accent : tv.textMuted }}>
                  {useSuggested ? 'M1 Suggested' : 'Custom'}
                </button>
              </label>
              {useSuggested ? (
                <div className="mono rounded-lg px-3 py-2 text-sm" style={{ border: `1px solid ${tv.borderBase}`, background: tv.bgSurface, color: tv.textPrimary }}>
                  {fmtCurrency(suggested)}
                </div>
              ) : (
                <input type="number" value={stake || ''} onChange={(e) => setStake(parseFloat(e.target.value) || 0)} placeholder="0.00" className="mono w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: `1px solid ${tv.borderBase}`, background: tv.bgSurface, color: tv.textPrimary }} />
              )}
            </div>
            <div className="space-y-1.5 rounded-lg p-3 text-xs" style={{ border: `1px solid ${tv.borderBase}`, background: tv.bgSurface }}>
              <div className="flex justify-between"><span style={{ color: tv.textMuted }}>Combined odds</span><span className="mono" style={{ color: tv.textPrimary }}>{fmtOdds(combinedOdds)}</span></div>
              <div className="flex justify-between"><span style={{ color: tv.textMuted }}>Potential profit</span><span className="mono" style={{ color: tv.accent }}>{fmtCurrency(potentialProfit)}</span></div>
              <div className="flex justify-between"><span style={{ color: tv.textMuted }}>Potential payout</span><span className="mono" style={{ color: tv.textPrimary }}>{fmtCurrency(effectiveStake + potentialPayout)}</span></div>
              <div className="flex justify-between"><span style={{ color: tv.textMuted }}>Exposure after</span><span className="mono" style={{ color: exposureAfter > metrics.currentBalance ? tv.statusRed : tv.statusAmber }}>{fmtCurrency(exposureAfter)}</span></div>
            </div>
            {effectiveStake > metrics.currentBalance && (
              <p className="text-xs" style={{ color: tv.statusRed }}>Stake exceeds available balance.</p>
            )}
            <div className="flex gap-2">
              <button onClick={clearBetSlip} className="flex-1 rounded-lg py-2 text-sm" style={{ border: `1px solid ${tv.borderBase}`, color: tv.textMuted }}>Clear</button>
              <button onClick={handleConfirm} disabled={confirming || effectiveStake <= 0 || effectiveStake > metrics.currentBalance} className="flex-1 rounded-lg py-2 text-sm font-semibold disabled:opacity-40" style={{ background: tv.textPrimary, color: tv.bgOverlay }}>
                {confirming ? 'Processing…' : 'Confirm Wager'}
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: mutedAlpha(0.5) }}>
              <Info className="h-3 w-3 shrink-0" />
              <span>Stake sizing: fractional Kelly (quarter-Kelly) with 2% bankroll hard cap. Simulation only — no real funds at risk. Does not guarantee returns.</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
