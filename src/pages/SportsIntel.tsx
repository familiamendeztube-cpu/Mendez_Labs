import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { RefreshCw, Activity } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { PageHero } from '@/components/PageHero';
import { APP_IMAGES } from '@/data/appImages';
import { tv, accentAlpha, mutedAlpha } from '@/lib/themeVars';
import { useScrollReveal } from '@/lib/useScrollReveal';

const axisStyle = { fontSize: 10, fill: tv.textMuted, fontFamily: 'JetBrains Mono, monospace' } as const;

function Panel({ title, note, badge, children }: { title: string; note?: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="app-card rounded-2xl p-4" data-reveal style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{title}</h3>
          {note && <p className="mt-0.5 text-xs" style={{ color: tv.textMuted }}>{note}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: accentAlpha(0.12), color: tv.accent, border: `1px solid ${accentAlpha(0.2)}` }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function TipBox({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(12,15,13,0.95)', border: `1px solid ${accentAlpha(0.15)}`, backdropFilter: 'blur(12px)' }}>
      {rows.map(([k, v]) => (
        <div key={k} className="mono flex gap-2">
          <span style={{ color: tv.textMuted }}>{k}:</span>
          <span className="font-semibold" style={{ color: tv.textPrimary }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

export function SportsIntel() {
  const { rankedPicks, settledHistory, modelHealth, feedProvider, refreshFeed, feedLoading } = useStore();
  const revealRef = useScrollReveal<HTMLDivElement>();

  const hasData = rankedPicks.length > 0;
  const qualified = rankedPicks.filter((p) => p.qualified);

  // ── EV distribution ──────────────────────────────────────────────────────
  const evBuckets = useMemo(() => {
    const bins = [
      { label: '< -10%', lo: -Infinity, hi: -0.1 },
      { label: '-10..-5', lo: -0.1, hi: -0.05 },
      { label: '-5..0', lo: -0.05, hi: 0 },
      { label: '0..3', lo: 0, hi: 0.03 },
      { label: '3..5', lo: 0.03, hi: 0.05 },
      { label: '5..10', lo: 0.05, hi: 0.1 },
      { label: '> 10%', lo: 0.1, hi: Infinity },
    ];
    return bins.map((b) => ({
      label: b.label,
      count: rankedPicks.filter((p) => p.evPercent !== null && p.evPercent >= b.lo && p.evPercent < b.hi).length,
      qualifying: b.lo >= 0.03,
    }));
  }, [rankedPicks]);

  // ── Model vs market probability ──────────────────────────────────────────
  const probPoints = useMemo(
    () =>
      rankedPicks
        .filter((p) => p.pModel !== null && p.pFinal !== null)
        .slice(0, 400)
        .map((p) => ({
          market: Number((((p.pFinal ?? 0)) * 100).toFixed(1)),
          model: Number((((p.pModel ?? 0)) * 100).toFixed(1)),
          matchup: `${p.homeTeam} vs ${p.awayTeam}`,
          side: p.side,
          qualified: p.qualified,
        })),
    [rankedPicks],
  );

  // ── Qualification funnel ─────────────────────────────────────────────────
  const funnel = useMemo(() => {
    const stages = [
      'Valid odds',
      '3+ bookmakers',
      'Sufficient historical data (≥30)',
      'Features complete',
      'Edge ≥ 2pp',
      'EV ≥ 3.0%',
    ];
    const passedThrough = (p: (typeof rankedPicks)[number], upto: number) =>
      stages.slice(0, upto + 1).every((name) => p.qualificationChecks.find((c) => c.name === name)?.passed);
    return [
      { stage: 'All predictions', count: rankedPicks.length },
      ...stages.map((s, i) => ({ stage: s, count: rankedPicks.filter((p) => passedThrough(p, i)).length })),
      { stage: 'Qualified', count: qualified.length },
    ];
  }, [rankedPicks, qualified.length]);

  // ── Per-league volume ────────────────────────────────────────────────────
  const leagues = useMemo(() => {
    const map = new Map<string, { league: string; qualified: number; excluded: number }>();
    for (const p of rankedPicks) {
      const row = map.get(p.league) ?? { league: p.league, qualified: 0, excluded: 0 };
      if (p.qualified) row.qualified++; else row.excluded++;
      map.set(p.league, row);
    }
    return [...map.values()].sort((a, b) => b.qualified + b.excluded - (a.qualified + a.excluded));
  }, [rankedPicks]);

  // ── Bankroll curve from settled picks ────────────────────────────────────
  const bankroll = useMemo(() => {
    const sorted = [...settledHistory]
      .filter((s) => s.result !== 'pending')
      .sort((a, b) => new Date(a.settledAt ?? 0).getTime() - new Date(b.settledAt ?? 0).getTime());
    let running = 0;
    return sorted.map((s, i) => {
      running += s.profitLoss;
      return { n: i + 1, pnl: Number(running.toFixed(2)) };
    });
  }, [settledHistory]);

  return (
    <div ref={revealRef} className="mx-auto max-w-5xl space-y-5 pb-8">
      <div data-reveal>
        <PageHero
          image={APP_IMAGES.analytics}
          eyebrow="Sports Lab"
          title="Sports Intelligence"
          subtitle={hasData
            ? `Live from the Elo engine — ${rankedPicks.length} predictions across ${leagues.length} leagues, ${qualified.length} qualified.`
            : 'Live model diagnostics. Charts populate from the analysis engine feed.'}
          action={
            <button
              onClick={refreshFeed}
              disabled={feedLoading}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold"
              style={{ background: accentAlpha(0.12), color: tv.accent, minHeight: 44, opacity: feedLoading ? 0.5 : 1, backdropFilter: 'blur(4px)' }}
            >
              <RefreshCw className={`h-4 w-4 ${feedLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          }
        />
      </div>

      {/* Model status strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-reveal>
        <Stat label="Predictions" value={hasData ? String(rankedPicks.length) : '—'} />
        <Stat label="Qualified" value={hasData ? String(qualified.length) : '—'} accent={qualified.length > 0 ? tv.accent : tv.textMuted} />
        <Stat label="Model sample" value={modelHealth ? `${modelHealth.sampleSize}` : '—'} accent={(modelHealth?.sampleSize ?? 0) >= 30 ? tv.accent : tv.statusAmber} />
        <Stat label="Feed" value={feedProvider?.status ?? '—'} accent={feedProvider?.status === 'connected' ? tv.accent : tv.statusAmber} />
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
          <Activity className="h-8 w-8" style={{ color: mutedAlpha(0.3) }} />
          <p className="text-sm" style={{ color: tv.textMuted }}>No engine data yet. Hit Refresh, or check the feed status in Settings.</p>
        </div>
      ) : (
        <>
          <Panel title="Expected value distribution" note="Every prediction bucketed by EV after costs. The shaded band is the ≥3% qualifying zone." badge="live">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={evBuckets} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={tv.chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <RTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? <TipBox rows={[['EV band', String(label)], ['Predictions', String(payload[0].value)]]} /> : null
                  }
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} animationDuration={900}>
                  {evBuckets.map((b, i) => (
                    <Cell key={i} fill={b.qualifying ? tv.chartGreen : mutedAlpha(0.35)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Model vs market probability" note="Each dot is one side of one game. Above the line, the model is more confident than the market — that gap is where edge comes from." badge="live">
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={tv.chartGrid} />
                <XAxis type="number" dataKey="market" name="Market" unit="%" domain={[0, 100]} tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis type="number" dataKey="model" name="Model" unit="%" domain={[0, 100]} tick={axisStyle} tickLine={false} axisLine={false} width={40} />
                <ZAxis range={[36, 36]} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke={mutedAlpha(0.4)} strokeDasharray="4 4" />
                <RTooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    const p = active && payload?.length ? (payload[0].payload as (typeof probPoints)[number]) : null;
                    return p ? <TipBox rows={[['Game', p.matchup], ['Side', p.side], ['Model', `${p.model}%`], ['Market', `${p.market}%`]]} /> : null;
                  }}
                />
                <Scatter data={probPoints} isAnimationActive={false}>
                  {probPoints.map((p, i) => (
                    <Cell key={i} fill={p.qualified ? tv.chartGreen : accentAlpha(0.35)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Qualification funnel" note="How many predictions survive each gate. A big drop tells you exactly what's blocking picks today.">
            <ResponsiveContainer width="100%" height={Math.max(200, funnel.length * 38)}>
              <BarChart data={funnel} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={tv.chartGrid} horizontal={false} />
                <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="stage" tick={{ ...axisStyle, fontSize: 9 }} tickLine={false} axisLine={false} width={135} />
                <RTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? <TipBox rows={[['Gate', String(label)], ['Survive', String(payload[0].value)]]} /> : null
                  }
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} animationDuration={900}>
                  {funnel.map((f, i) => (
                    <Cell key={i} fill={i === funnel.length - 1 ? tv.chartGreen : accentAlpha(0.4)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Coverage by league" note="Predictions the engine produced per league, split qualified vs excluded.">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={leagues} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={tv.chartGrid} vertical={false} />
                <XAxis dataKey="league" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <RTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <TipBox rows={[['League', String(label)], ['Qualified', String(payload.find((x) => x.name === 'qualified')?.value ?? 0)], ['Excluded', String(payload.find((x) => x.name === 'excluded')?.value ?? 0)]]} />
                    ) : null
                  }
                />
                <Bar dataKey="excluded" stackId="a" fill={mutedAlpha(0.3)} radius={[0, 0, 0, 0]} animationDuration={800} />
                <Bar dataKey="qualified" stackId="a" fill={tv.chartGreen} radius={[3, 3, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel
            title="Paper bankroll curve"
            note={bankroll.length > 0 ? `Cumulative P/L across ${bankroll.length} settled picks.` : 'Lock a Top Five and let games settle to build this curve.'}
          >
            {bankroll.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bankroll} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tv.chartGrid} vertical={false} />
                  <XAxis dataKey="n" tick={axisStyle} tickLine={false} axisLine={false} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${v}`} />
                  <ReferenceLine y={0} stroke={mutedAlpha(0.3)} />
                  <RTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? <TipBox rows={[['Settled pick', `#${label}`], ['Running P/L', `$${payload[0].value}`]]} /> : null
                    }
                  />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]} animationDuration={900}>
                    {bankroll.map((b, i) => (
                      <Cell key={i} fill={b.pnl >= 0 ? tv.chartGreen : tv.chartRed} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center py-12 text-sm" style={{ color: tv.textMuted }}>No settled picks yet.</div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent = tv.textPrimary }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
      <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: tv.textMuted }}>{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold capitalize" style={{ color: accent }}>{value}</p>
    </div>
  );
}
