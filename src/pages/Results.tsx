import { useState, useMemo } from 'react';
import { Info, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, HelpCircle, BarChart3 } from 'lucide-react';
import { useStore, type SettledPickRecord } from '@/store/StoreContext';
import { fmtOdds, fmtCurrency, fmtSignedCurrency } from '@/utils/format';
import { fmtCostaRicaDateTime } from '@/services/liveData';
import { plainEnglishBet } from '@/utils/pickFive';
import { tv, accentAlpha, redAlpha, mutedAlpha, amberAlpha } from '@/lib/themeVars';
import {
  countByResult,
  winPercent,
  roi,
  netUnits,
  totalStaked,
  totalPL,
  averageOdds,
  maxDrawdown,
  longestLosingStreak,
  averageCLV,
  brierScore,
  logLoss,
  calibrationError,
} from '@/utils/resultsCalc';

type ResultFilter = 'All' | 'Won' | 'Lost' | 'Push' | 'Pending';
const FILTERS: ResultFilter[] = ['All', 'Won', 'Lost', 'Push', 'Pending'];

type Tab = 'all-time' | 'daily';

export function Results() {
  const { settledHistory, modelHealth } = useStore();
  const [tab, setTab] = useState<Tab>('all-time');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('All');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const records = useMemo(() => settledHistory as unknown as import('@/utils/resultsCalc').SettledRecord[], [settledHistory]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const activeRecords = tab === 'daily' ? records.filter((r) => (r.settledAt ?? r.frozenAt).slice(0, 10) === todayKey) : records;

  const filtered = useMemo(() => {
    if (resultFilter === 'All') return activeRecords;
    const key = resultFilter.toLowerCase() as SettledPickRecord['result'];
    return activeRecords.filter((r) => r.result === key);
  }, [activeRecords, resultFilter]);

  const counts = countByResult(activeRecords);
  const wp = winPercent(activeRecords);
  const roiVal = roi(activeRecords);
  const units = netUnits(activeRecords);
  const staked = totalStaked(activeRecords);
  const pl = totalPL(activeRecords);
  const avgOdds = averageOdds(activeRecords);
  const clv = averageCLV(activeRecords);
  const dd = maxDrawdown(activeRecords);
  const streak = longestLosingStreak(activeRecords);
  const brier = brierScore(activeRecords);
  const ll = logLoss(activeRecords);
  const calErr = calibrationError(activeRecords);

  const hasRecords = settledHistory.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="serif text-3xl font-normal" style={{ color: tv.textPrimary, letterSpacing: '-0.03em' }}>
          Results
        </h1>
        <p className="mt-1 text-base" style={{ color: tv.textMuted }}>
          Did the picks win? Paper-tracked scorecard from verified final scores.
        </p>
      </div>

      {/* Tabs — always visible */}
      <div className="flex gap-1.5">
        <TabButton label="All-time" active={tab === 'all-time'} onClick={() => setTab('all-time')} />
        <TabButton label="Today" active={tab === 'daily'} onClick={() => setTab('daily')} />
      </div>

      {/* Scorecard row 1 — core record */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Wins" value={`${counts.won}`} color={tv.accent} />
        <MetricCard label="Losses" value={`${counts.lost}`} color={tv.statusRed} />
        <MetricCard label="Pushes" value={`${counts.push}`} color={tv.statusAmber} />
        <MetricCard label="Pending" value={`${counts.pending}`} color={tv.textMuted} />
        <MetricCard
          label="Win %"
          value={wp !== null ? `${(wp * 100).toFixed(1)}%` : 'N/A'}
          sub={wp !== null ? `${counts.won}W-${counts.lost}L` : 'Not enough settled picks'}
          color={wp !== null && wp >= 0.5 ? tv.accent : wp !== null ? tv.statusRed : tv.textMuted}
          tip="Wins divided by settled picks (W+L). Pushes excluded."
        />
        <MetricCard
          label="ROI"
          value={roiVal !== null ? `${(roiVal * 100).toFixed(1)}%` : 'N/A'}
          sub={roiVal !== null ? undefined : 'Not enough settled picks'}
          color={roiVal !== null && roiVal >= 0 ? tv.accent : roiVal !== null ? tv.statusRed : tv.textMuted}
          tip="Net profit or loss divided by total amount staked on settled picks."
        />
      </div>

      {/* Scorecard row 2 — financials */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="Net units"
          value={units !== null ? units.toFixed(2) : 'N/A'}
          sub={units !== null ? undefined : 'Not enough settled picks'}
          color={units !== null && units >= 0 ? tv.accent : units !== null ? tv.statusRed : tv.textMuted}
          tip="Total P/L divided by average stake. Measures profit in bet-size units."
        />
        <MetricCard label="Staked" value={fmtCurrency(staked)} color={tv.textPrimary} tip="Sum of stakes on all settled picks." />
        <MetricCard label="P/L" value={fmtSignedCurrency(pl)} color={pl >= 0 ? tv.accent : tv.statusRed} tip="Net profit or loss from settled picks only." />
        <MetricCard
          label="Avg odds"
          value={avgOdds !== null ? fmtOdds(Math.round(avgOdds)) : 'N/A'}
          sub={avgOdds !== null ? undefined : 'Not enough settled picks'}
          color={tv.textPrimary}
          tip="Mean American odds across all settled picks."
        />
        <MetricCard
          label="Avg CLV"
          value={clv !== null ? `${(clv * 100).toFixed(1)}%` : 'N/A'}
          sub="Closing odds not yet tracked"
          color={tv.textMuted}
          tip="Closing line value: how much better your locked odds were vs the closing line. Requires closing prices."
        />
        <MetricCard
          label="Max drawdown"
          value={dd !== null ? fmtCurrency(dd) : 'N/A'}
          sub={dd !== null ? undefined : 'Not enough settled picks'}
          color={dd !== null && dd > 0 ? tv.statusRed : tv.textMuted}
          tip="Largest peak-to-trough drop in cumulative P/L."
        />
      </div>

      {/* Scorecard row 3 — statistical */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="Losing streak"
          value={streak !== null ? `${streak}` : 'N/A'}
          sub={streak !== null ? 'consecutive' : 'Not enough settled picks'}
          color={streak !== null && streak >= 5 ? tv.statusRed : streak !== null ? tv.statusAmber : tv.textMuted}
          tip="Longest run of consecutive losses."
        />
        <MetricCard label="Total picks" value={`${counts.total}`} color={tv.textPrimary} tip="All picks tracked, including pending." />
        <MetricCard
          label="Brier score"
          value={brier !== null ? brier.toFixed(4) : 'N/A'}
          sub={brier !== null ? (brier < 0.2 ? 'Good calibration' : 'Needs improvement') : 'Need 30+ settled with model p'}
          color={brier !== null && brier < 0.2 ? tv.accent : tv.textMuted}
          tip="Mean squared error of predicted probability vs outcome. Lower is better. Needs 30+ settled picks with valid model probability."
        />
        <MetricCard
          label="Log loss"
          value={ll !== null ? ll.toFixed(4) : 'N/A'}
          sub={ll !== null ? undefined : 'Need 30+ settled with model p'}
          color={tv.textMuted}
          tip="Cross-entropy loss of predictions. Penalizes confident wrong predictions harshly. Needs 30+ settled picks."
        />
        <MetricCard
          label="Cal. error"
          value={calErr !== null ? `${(calErr * 100).toFixed(2)}%` : 'N/A'}
          sub={calErr !== null ? undefined : 'Need 30+ settled with model p'}
          color={tv.textMuted}
          tip="Expected calibration error (10-bin ECE). Measures whether predicted probabilities match observed win rates."
        />
        <MetricCard label="Settled" value={`${counts.settled}`} sub={`of ${counts.total}`} color={tv.textPrimary} />
      </div>

      {/* Prediction coverage from live model */}
      {modelHealth && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: mutedAlpha(0.02), border: `1px solid ${tv.borderBase}` }}>
          <BarChart3 className="h-4 w-4 shrink-0" style={{ color: tv.textMuted }} />
          <span className="text-xs" style={{ color: tv.textMuted }}>
            Model coverage: <span className="mono" style={{ color: tv.textPrimary }}>{modelHealth.qualifiedCount}</span> qualified
            {' / '}<span className="mono" style={{ color: tv.statusAmber }}>{modelHealth.excludedCount}</span> excluded
            {' / '}<span className="mono" style={{ color: tv.textSecondary }}>{modelHealth.totalPredictions}</span> total predictions
            {modelHealth.label && <> · {modelHealth.label}</>}
          </span>
        </div>
      )}

      <p className="text-xs" style={{ color: mutedAlpha(0.5) }}>
        Win % excludes pushes and pending. Pending picks are never counted as losses. Push returns stake (P/L = $0).
        Results settled from verified final scores via The Odds API.
      </p>

      {/* Result filter */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setResultFilter(f)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: resultFilter === f ? accentAlpha(0.12) : mutedAlpha(0.04),
              color: resultFilter === f ? tv.accent : tv.textMuted,
              border: resultFilter === f ? `1px solid ${accentAlpha(0.2)}` : `1px solid ${tv.borderBase}`,
              minHeight: '32px',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* History section — table + cards, or empty message */}
      {hasRecords ? (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto rounded-xl" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
            <table className="w-full text-xs" style={{ color: tv.textSecondary }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tv.borderBase}` }}>
                  {['Date', 'Event', 'Pick', 'Odds', 'Result', 'Stake', 'P/L', 'Model p', 'Mkt p', 'Quality'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: tv.textMuted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((pick, i) => {
                  const p = pick as unknown as SettledPickRecord;
                  const rc = resultColor(p.result);
                  return (
                    <tr key={`${p.slot}-${p.opportunityId}-${i}`} style={{ borderBottom: `1px solid ${mutedAlpha(0.04)}` }}>
                      <td className="px-3 py-2 mono">{fmtCostaRicaDateTime(p.startTime)}</td>
                      <td className="px-3 py-2" style={{ color: tv.textPrimary }}>{p.matchup}</td>
                      <td className="px-3 py-2">{plainEnglishBet(p.market, p.side, p.matchup)}</td>
                      <td className="px-3 py-2 mono">{fmtOdds(p.odds)}</td>
                      <td className="px-3 py-2"><span className="font-bold uppercase" style={{ color: rc }}>{p.result}</span></td>
                      <td className="px-3 py-2 mono">{fmtCurrency(p.suggestedStake)}</td>
                      <td className="px-3 py-2 mono" style={{ color: p.profitLoss >= 0 ? tv.accent : tv.statusRed }}>{fmtSignedCurrency(p.profitLoss)}</td>
                      <td className="px-3 py-2 mono">{p.modelProbability > 0 ? `${(p.modelProbability * 100).toFixed(1)}%` : 'N/A'}</td>
                      <td className="px-3 py-2 mono">{p.impliedProbability > 0 ? `${(p.impliedProbability * 100).toFixed(1)}%` : 'N/A'}</td>
                      <td className="px-3 py-2 mono">{p.confidenceScore > 0 ? `${(p.confidenceScore * 100).toFixed(0)}%` : 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="space-y-2 lg:hidden">
            {filtered.map((pick, i) => {
              const p = pick as unknown as SettledPickRecord;
              const rc = resultColor(p.result);
              const ResultIcon = p.result === 'won' ? TrendingUp : p.result === 'lost' ? TrendingDown : Minus;
              const isExpanded = expandedIdx === i;

              return (
                <div key={`${p.slot}-${p.opportunityId}-${i}`} className="rounded-lg p-3" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: tv.textPrimary }}>{p.league} {p.matchup}</p>
                      <p className="text-xs" style={{ color: tv.textSecondary }}>{plainEnglishBet(p.market, p.side, p.matchup)}</p>
                      <p className="text-xs" style={{ color: tv.textMuted }}>{fmtOdds(p.odds)} · {fmtCostaRicaDateTime(p.startTime)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ResultIcon className="h-4 w-4" style={{ color: rc }} />
                      <span className="text-xs font-bold uppercase" style={{ color: rc }}>{p.result}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-4 text-xs">
                      <span style={{ color: tv.textMuted }}>Stake: <span className="mono" style={{ color: tv.textSecondary }}>{fmtCurrency(p.suggestedStake)}</span></span>
                      <span style={{ color: tv.textMuted }}>P/L: <span className="mono" style={{ color: p.profitLoss >= 0 ? tv.accent : tv.statusRed }}>{fmtSignedCurrency(p.profitLoss)}</span></span>
                    </div>
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                      className="flex items-center gap-1 text-xs"
                      style={{ color: tv.textMuted, minHeight: '44px', minWidth: '44px', justifyContent: 'flex-end' }}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: tv.textMuted }}>
                      <div>Model p: <span className="mono" style={{ color: tv.textSecondary }}>{p.modelProbability > 0 ? `${(p.modelProbability * 100).toFixed(1)}%` : 'N/A'}</span></div>
                      <div>Mkt p: <span className="mono" style={{ color: tv.textSecondary }}>{p.impliedProbability > 0 ? `${(p.impliedProbability * 100).toFixed(1)}%` : 'N/A'}</span></div>
                      <div>Edge: <span className="mono" style={{ color: tv.textSecondary }}>{p.edge > 0 ? `+${(p.edge * 100).toFixed(1)}pp` : 'N/A'}</span></div>
                      <div>Quality: <span className="mono" style={{ color: tv.textSecondary }}>{p.confidenceScore > 0 ? `${(p.confidenceScore * 100).toFixed(0)}%` : 'N/A'}</span></div>
                      {p.finalScore && <div>Final: <span className="mono" style={{ color: tv.textSecondary }}>{p.finalScore}</span></div>}
                      {p.settlementSource && <div>Source: <span className="mono" style={{ color: mutedAlpha(0.6) }}>{p.settlementSource}</span></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="rounded-xl p-6 text-center" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
              <p className="text-sm" style={{ color: tv.textMuted }}>
                {tab === 'daily' ? 'No results settled today.' : 'No results match the selected filter.'}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl p-10 text-center" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
          <Info className="h-10 w-10" style={{ color: tv.textMuted }} />
          <p className="text-base font-semibold" style={{ color: tv.textPrimary }}>No tracked results yet</p>
          <p className="max-w-md text-sm" style={{ color: tv.textMuted }}>
            Lock your Top Five picks and wait for the games to finish. Results will appear here once settled from verified final scores.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function resultColor(result: string): string {
  if (result === 'won') return tv.accent;
  if (result === 'lost') return tv.statusRed;
  if (result === 'push') return tv.statusAmber;
  return tv.textMuted;
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
      style={{
        background: active ? accentAlpha(0.12) : mutedAlpha(0.04),
        color: active ? tv.accent : tv.textMuted,
        border: active ? `1px solid ${accentAlpha(0.2)}` : `1px solid ${tv.borderBase}`,
        minHeight: '44px',
      }}
    >
      {label}
    </button>
  );
}

function MetricCard({ label, value, sub, color, tip }: { label: string; value: string; sub?: string; color: string; tip?: string }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div className="relative rounded-lg px-3 py-2.5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
      <div className="flex items-center gap-1">
        <p className="text-xs" style={{ color: tv.textMuted }}>{label}</p>
        {tip && (
          <button
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            onClick={() => setShowTip(!showTip)}
            className="flex items-center justify-center"
            style={{ minHeight: '24px', minWidth: '24px' }}
          >
            <HelpCircle className="h-3 w-3" style={{ color: mutedAlpha(0.4) }} />
          </button>
        )}
      </div>
      <p className="mt-0.5 text-lg font-bold mono" style={{ color }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: tv.textMuted }}>{sub}</p>}
      {showTip && tip && (
        <div className="absolute left-0 top-full z-20 mt-1 max-w-xs rounded-lg px-3 py-2 text-xs" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}`, color: tv.textSecondary }}>
          {tip}
        </div>
      )}
    </div>
  );
}
