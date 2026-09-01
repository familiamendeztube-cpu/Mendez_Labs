import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Info,
  AlertCircle,
  RefreshCw,
  Calendar,
  Activity,
  Shield,
  Clock,
  Database,
  Zap,
} from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { fmtOdds, fmtPercent, fmtSignedPp, americanToDecimal } from '@/utils/format';
import { fmtCostaRicaDateTime } from '@/services/liveData';
import { SPORTS_IMAGES, SPORT_STRIP, leagueImage } from '@/data/sportsImages';
import { MatchupBadges } from '@/components/TeamBadge';
import type { RankedPick } from '@/services/liveData';
import { tv, accentAlpha, redAlpha, mutedAlpha, amberAlpha } from '@/lib/themeVars';

// ── Filter types ────────────────────────────────────────────────────────────

type SportFilter = 'All' | 'Soccer' | 'NFL' | 'NBA' | 'MLB' | 'NHL';
type StatusFilter = 'All' | 'Qualified' | 'Excluded';

const SPORT_OPTIONS: SportFilter[] = ['All', 'Soccer', 'NFL', 'NBA', 'MLB', 'NHL'];
const STATUS_OPTIONS: StatusFilter[] = ['All', 'Qualified', 'Excluded'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function freshnessLabel(ms: number): string {
  if (ms < 60_000) return 'Just now';
  if (ms < 300_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 900_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 60_000)}m (stale)`;
}

function quoteAgeLabel(ms: number): string {
  if (ms < 60_000) return '<1 min';
  return `${Math.floor(ms / 60_000)} min`;
}

function pickKey(p: RankedPick): string {
  return `${p.eventId}-${p.market}-${p.side}`;
}

function matchesLeague(pick: RankedPick, filter: SportFilter): boolean {
  if (filter === 'All') return true;
  const l = pick.league.toLowerCase();
  const f = filter.toLowerCase();
  if (f === 'soccer') return l.includes('soccer') || l.includes('football') || l.includes('mls') || l.includes('epl') || l.includes('liga') || l.includes('serie') || l.includes('bundesliga') || l.includes('ligue');
  return l.includes(f);
}

// ── Main component ──────────────────────────────────────────────────────────

export function Today() {
  const {
    rankedPicks,
    feedLoading,
    feedError,
    feedProvider,
    refreshFeed,
    pickFiveToday,
    addToPickFive,
    lastFeedFetch,
    modelHealth,
  } = useStore();

  const [expandedPick, setExpandedPick] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<SportFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [excludedVisible, setExcludedVisible] = useState(25);

  // ── Summary stats ───────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const total = rankedPicks.length;
    const qualified = rankedPicks.filter((p) => p.qualified).length;
    const excluded = total - qualified;
    const freshest = rankedPicks.length > 0 ? Math.min(...rankedPicks.map((p) => p.freshnessMs)) : null;
    return { total, qualified, excluded, freshest };
  }, [rankedPicks]);

  // ── Filtered & separated lists ──────────────────────────────────────────

  const { qualifiedPicks, excludedPicks } = useMemo(() => {
    const sportFiltered = rankedPicks.filter((p) => matchesLeague(p, sportFilter));
    const q = sportFiltered.filter((p) => p.qualified);
    const e = sportFiltered.filter((p) => !p.qualified);
    if (statusFilter === 'Qualified') return { qualifiedPicks: q, excludedPicks: [] };
    if (statusFilter === 'Excluded') return { qualifiedPicks: [], excludedPicks: e };
    return { qualifiedPicks: q, excludedPicks: e };
  }, [rankedPicks, sportFilter, statusFilter]);

  const pickFiveCount = pickFiveToday.picks.length;
  const isInFive = (eventId: string) => pickFiveToday.picks.some((p) => p.opportunityId === eventId);

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8" data-stagger-visible>
      {/* ── Hero banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl" style={{ height: '180px' }}>
        <img
          src={SPORTS_IMAGES.todayHero}
          alt="Aerial view of a night football match in a packed stadium"
          className="h-full w-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(3,4,3,0.8) 0%, rgba(3,4,3,0.5) 50%, rgba(3,4,3,0.85) 100%)' }} />
        <div className="absolute inset-0 flex flex-col justify-center px-5 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: tv.accent, color: tv.bgOverlay }}>
              TODAY
            </span>
            {feedProvider && (
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: tv.textSecondary }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: feedProvider.status === 'connected' ? tv.accent : feedProvider.status === 'degraded' ? tv.statusAmber : tv.statusRed }} />
                {feedProvider.name}
              </span>
            )}
          </div>
          <h1 className="serif mt-2 text-2xl font-normal lg:text-3xl" style={{ color: tv.textPrimary, letterSpacing: '-0.03em' }}>
            Today's Analysis
          </h1>
          <p className="mt-1 text-sm" style={{ color: tv.textSecondary }}>
            Real odds, honest probabilities. You choose which picks to track.
          </p>
        </div>
      </div>

      {/* ── Sport strip ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2 overflow-hidden rounded-xl" data-stagger-visible style={{ '--stagger': '80ms' } as React.CSSProperties}>
        {SPORT_STRIP.map((s: { league: string; label: string; img: string; alt: string }) => (
          <div key={s.league} className="relative h-16 overflow-hidden rounded-lg lg:h-20 card-lift">
            <img src={s.img} alt={s.alt} loading="lazy" className="h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(3,4,3,0.85) 100%)' }} />
            <span className="absolute bottom-1.5 left-2 text-xs font-bold" style={{ color: tv.textPrimary }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      {rankedPicks.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" data-stagger-visible style={{ '--stagger': '60ms' } as React.CSSProperties}>
          <SummaryCard icon={<Database className="h-4 w-4" />} label="Games scanned" value={`${summary.total}`} />
          <SummaryCard icon={<Shield className="h-4 w-4" />} label="Qualified" value={`${summary.qualified}`} accent={tv.accent} />
          <SummaryCard icon={<AlertCircle className="h-4 w-4" />} label="Excluded" value={`${summary.excluded}`} accent={summary.excluded > 0 ? tv.statusAmber : tv.textMuted} />
          <SummaryCard icon={<Clock className="h-4 w-4" />} label="Data freshness" value={summary.freshest !== null ? freshnessLabel(summary.freshest) : 'No data'} />
          <SummaryCard icon={<Activity className="h-4 w-4" />} label="Model status" value={modelHealth?.status === 'ready' ? 'Online' : modelHealth?.status ?? 'Unavailable'} accent={modelHealth?.status === 'ready' ? tv.accent : tv.statusAmber} />
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      {rankedPicks.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {SPORT_OPTIONS.map((s) => (
              <FilterPill key={s} label={s} active={sportFilter === s} onClick={() => setSportFilter(s)} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <FilterPill key={s} label={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {feedLoading && rankedPicks.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="panel-img rounded-xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
              <div className="flex items-center gap-3">
                <div className="skeleton-shimmer h-10 w-10 rounded-full" style={{ background: `linear-gradient(90deg, ${tv.bgSurface} 25%, ${tv.bgElevated} 50%, ${tv.bgSurface} 75%)`, backgroundSize: '200% 100%' }} />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-shimmer h-4 w-1/3 rounded" style={{ background: `linear-gradient(90deg, ${tv.bgSurface} 25%, ${tv.bgElevated} 50%, ${tv.bgSurface} 75%)`, backgroundSize: '200% 100%' }} />
                  <div className="skeleton-shimmer h-3 w-1/4 rounded" style={{ background: `linear-gradient(90deg, ${tv.bgSurface} 25%, ${tv.bgElevated} 50%, ${tv.bgSurface} 75%)`, backgroundSize: '200% 100%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {feedError && rankedPicks.length === 0 && !feedLoading && (
        <div className="panel-img flex flex-col items-center gap-4 rounded-xl p-8 text-center" style={{ background: tv.bgSurface, border: `1px solid ${redAlpha(0.12)}` }}>
          <AlertCircle className="h-10 w-10" style={{ color: tv.statusRed }} />
          <div>
            <p className="text-base font-semibold" style={{ color: tv.textPrimary }}>Live data unavailable</p>
            <p className="mt-1 text-sm" style={{ color: tv.textMuted }}>{feedError}</p>
          </div>
          <button onClick={refreshFeed} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ background: tv.accent, color: tv.bgOverlay }}>
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────────────────────── */}
      {!feedLoading && !feedError && rankedPicks.length === 0 && (
        <div className="panel-img flex flex-col items-center gap-3 rounded-xl p-8 text-center" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
          <Calendar className="h-10 w-10" style={{ color: tv.textMuted }} />
          <p className="text-base font-semibold" style={{ color: tv.textPrimary }}>Analysis unavailable</p>
          <p className="text-sm" style={{ color: tv.textMuted }}>
            The engine could not produce independent predictions right now. No picks are shown until genuine model probabilities are available.
          </p>
          <button onClick={refreshFeed} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ color: tv.accent, border: `1px solid ${accentAlpha(0.2)}` }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      )}

      {/* ── Qualified picks ──────────────────────────────────────────────── */}
      {qualifiedPicks.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold" style={{ color: tv.accent }}>
            <Zap className="h-4 w-4" /> Best qualified picks
          </h2>
          {qualifiedPicks.map((pick, i) => (
            <PickCard
              key={pickKey(pick)}
              pick={pick}
              rank={i + 1}
              featured={i === 0 && statusFilter !== 'Excluded'}
              onAddToFive={() => addToPickFive(pick)}
              isAdded={isInFive(pick.eventId)}
              pickFiveCount={pickFiveCount}
              expanded={expandedPick === pickKey(pick)}
              onToggleExpand={() => setExpandedPick(expandedPick === pickKey(pick) ? null : pickKey(pick))}
            />
          ))}
        </section>
      )}

      {/* ── Excluded picks ───────────────────────────────────────────────── */}
      {excludedPicks.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold" style={{ color: tv.statusAmber }}>
            <AlertCircle className="h-4 w-4" /> Excluded — needs more data
          </h2>
          {excludedPicks.slice(0, excludedVisible).map((pick, i) => (
            <PickCard
              key={pickKey(pick)}
              pick={pick}
              rank={qualifiedPicks.length + i + 1}
              featured={false}
              onAddToFive={() => addToPickFive(pick)}
              isAdded={isInFive(pick.eventId)}
              pickFiveCount={pickFiveCount}
              expanded={expandedPick === pickKey(pick)}
              onToggleExpand={() => setExpandedPick(expandedPick === pickKey(pick) ? null : pickKey(pick))}
            />
          ))}
          {excludedPicks.length > 25 && (
            <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'rgba(220,225,222,0.02)', border: `1px solid ${tv.borderBase}` }}>
              <span className="text-xs" style={{ color: tv.textMuted }}>
                Showing {Math.min(excludedVisible, excludedPicks.length)} of {excludedPicks.length}
              </span>
              {excludedVisible < excludedPicks.length && (
                <button
                  onClick={() => setExcludedVisible((v) => v + 25)}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: tv.statusAmber, minHeight: '44px' }}
                >
                  Show 25 more
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── No results for filter ────────────────────────────────────────── */}
      {rankedPicks.length > 0 && qualifiedPicks.length === 0 && excludedPicks.length === 0 && (
        <div className="panel-img rounded-xl p-6 text-center" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
          <p className="text-sm" style={{ color: tv.textMuted }}>No games match the current filters.</p>
        </div>
      )}

      {/* ── Disclosure ───────────────────────────────────────────────────── */}
      {rankedPicks.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm" style={{ background: amberAlpha(0.04), border: `1px solid ${amberAlpha(0.12)}`, color: tv.statusAmber }}>
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Picks are ranked by data quality and value edge. This is paper tracking only — no real bets are placed.
          </span>
        </div>
      )}

      {/* ── Last updated ─────────────────────────────────────────────────── */}
      {lastFeedFetch && rankedPicks.length > 0 && (
        <p className="text-center text-xs" style={{ color: mutedAlpha(0.5) }}>
          Data from The Odds API · Updated {lastFeedFetch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica' })} Costa Rica time
        </p>
      )}
    </div>
  );
}

// ── Pick Card ──────────────────────────────────────────────────────────────

function PickCard({
  pick,
  rank,
  featured,
  onAddToFive,
  isAdded,
  pickFiveCount,
  expanded,
  onToggleExpand,
}: {
  pick: RankedPick;
  rank: number;
  featured: boolean;
  onAddToFive: () => void;
  isAdded: boolean;
  pickFiveCount: number;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const borderColor = pick.qualified ? accentAlpha(0.12) : amberAlpha(0.12);

  return (
    <div
      className={`overflow-hidden rounded-xl card-lift`}
      style={{ background: tv.bgSurface, border: `1px solid ${borderColor}` }}
    >
      {/* League photo banner */}
      <div className={`relative w-full overflow-hidden ${featured ? 'h-24' : 'h-16'}`}>
        <img src={leagueImage(pick.league)} alt={pick.league} loading="lazy" className="h-full w-full object-cover" style={{ opacity: 0.55 }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(27,21,17,0.15), ${tv.bgSurface})` }} />
        <span className="absolute left-3 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ background: 'rgba(27,21,17,0.6)', color: tv.textPrimary, backdropFilter: 'blur(4px)' }}>
          {pick.league}
        </span>
      </div>

      <div className={featured ? 'p-5' : 'p-4'}>
      {/* ── Header row: rank, teams, status, add button ──────────────── */}
      <div className="flex items-start gap-3">
        <span className="mono shrink-0 text-lg font-bold" style={{ color: pick.qualified ? tv.accent : tv.textMuted }}>
          #{rank}
        </span>
        <MatchupBadges home={pick.homeTeam} away={pick.awayTeam} size={featured ? 38 : 32} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`${featured ? 'text-lg' : 'text-base'} font-semibold`} style={{ color: tv.textPrimary }}>
              {pick.homeTeam} vs {pick.awayTeam}
            </p>
            <StatusBadge qualified={pick.qualified} />
          </div>
          <p className="mt-0.5 text-xs" style={{ color: tv.textMuted }}>
            {pick.league} · {fmtCostaRicaDateTime(pick.startTime)}
          </p>
        </div>
        <button
          onClick={onAddToFive}
          disabled={isAdded || !pick.qualified || pickFiveCount >= 5}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors"
          style={{
            background: isAdded ? accentAlpha(0.08) : pick.qualified ? tv.accent : mutedAlpha(0.04),
            color: isAdded ? tv.accent : pick.qualified ? tv.bgOverlay : tv.textMuted,
            cursor: isAdded || !pick.qualified || pickFiveCount >= 5 ? 'default' : 'pointer',
            border: isAdded ? `1px solid ${accentAlpha(0.2)}` : '1px solid transparent',
            minHeight: '44px',
          }}
        >
          <Plus className="h-4 w-4" />
          {isAdded ? 'Added' : pick.qualified ? 'Add' : 'Locked'}
        </button>
      </div>

      {/* ── The pick in plain English ────────────────────────────────── */}
      <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: 'rgba(8,10,9,0.6)', border: `1px solid ${mutedAlpha(0.04)}` }}>
        <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>
          {pick.market === 'Moneyline' ? `Pick ${pick.side} to win` : pick.side}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: tv.textSecondary }}>
          {fmtOdds(pick.bestOdds)} ({americanToDecimal(pick.bestOdds).toFixed(2)}) at {pick.bestBookmaker}
          {' · '}Quote age: {quoteAgeLabel(pick.freshnessMs)}
          {' · '}{pick.bookmakerCount} book{pick.bookmakerCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Key metrics grid ─────────────────────────────────────────── */}
      <div className={`mt-3 grid gap-x-4 gap-y-2 ${featured ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-3 sm:grid-cols-6'}`}>
        <Metric label="Independent p" value={fmtPercent(pick.pModel)} />
        <Metric label="Market no-vig" value={fmtPercent(pick.consensusProbability)} />
        <Metric label="Blended p" value={fmtPercent(pick.pFinal)} accent={tv.accent} />
        <Metric label="Fair odds" value={pick.fairDecimal !== null ? pick.fairDecimal.toFixed(2) : 'N/A'} />
        <Metric label="Edge" value={fmtSignedPp(pick.marketValueEdge)} accent={pick.marketValueEdge !== null && pick.marketValueEdge >= 0.03 ? tv.accent : undefined} />
        <Metric label="EV" value={pick.evPercent !== null ? `${pick.evPercent >= 0 ? '+' : '-'}${Math.abs(pick.evPercent * 100).toFixed(1)}%` : 'N/A'} accent={pick.evPercent !== null && pick.evPercent >= 0.03 ? tv.accent : pick.evPercent !== null && pick.evPercent >= 0.01 ? tv.statusAmber : undefined} />
      </div>

      {/* ── Data quality + exclusion reason ───────────────────────────── */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs" style={{ color: tv.textMuted }}>
        <span>Data quality: {(pick.dataCompleteness * 100).toFixed(0)}%</span>
        {!pick.qualified && pick.exclusionReason && (
          <span style={{ color: tv.statusAmber }}>Failed gates: {pick.exclusionReason}</span>
        )}
      </div>

      {/* ── Plain English reasoning ───────────────────────────────────── */}
      <p className="mt-2 text-sm" style={{ color: tv.textSecondary }}>
        {pick.qualified ? (
          <><span style={{ color: tv.accent }}>Why this is a pick:</span> {pick.reasoning}</>
        ) : (
          <><span style={{ color: tv.statusAmber }}>Failed gates:</span> {pick.exclusionReason ?? pick.reasoning}</>
        )}
      </p>

      {/* ── Show the math toggle ─────────────────────────────────────── */}
      <button
        onClick={onToggleExpand}
        className="mt-2 flex items-center gap-1 text-xs"
        style={{ color: tv.textMuted, minHeight: '44px' }}
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? 'Hide the math' : 'Show the math'}
      </button>

      {expanded && <MathDrawer pick={pick} />}
      </div>
    </div>
  );
}

// ── Math Drawer ─────────────────────────────────────────────────────────────

function MathDrawer({ pick }: { pick: RankedPick }) {
  const impliedProb = pick.bestOdds > 0
    ? 100 / (pick.bestOdds + 100)
    : -pick.bestOdds / (-pick.bestOdds + 100);

  return (
    <div className="mt-2 space-y-3 rounded-lg p-3 text-xs" style={{ background: 'rgba(8,10,9,0.6)', border: `1px solid ${mutedAlpha(0.04)}` }}>
      {/* Probability breakdown */}
      <div className="space-y-1.5">
        <p className="font-semibold" style={{ color: tv.textSecondary }}>Probability breakdown</p>
        <DetailRow label="Implied probability (vig-included)" value={`${(impliedProb * 100).toFixed(1)}%`} />
        <DetailRow label="Market no-vig consensus (p_market)" value={fmtPercent(pick.consensusProbability)} />
        <DetailRow label="Independent model (p_model)" value={fmtPercent(pick.pModel)} />
        <DetailRow label="Model weight (w_model)" value={pick.wModel !== null ? pick.wModel.toFixed(4) : 'N/A'} />
        <DetailRow label="Blended probability (p_final)" value={fmtPercent(pick.pFinal)} />
        <DetailRow label="Fair decimal price" value={pick.fairDecimal !== null ? pick.fairDecimal.toFixed(3) : 'N/A'} />
        <DetailRow label="Offered decimal price" value={pick.offeredDecimal.toFixed(3)} />
        <DetailRow label="EV per $1" value={pick.evPercent !== null ? `${pick.evPercent >= 0 ? '+' : '-'}${Math.abs(pick.evPercent * 100).toFixed(2)}%` : 'N/A'} />
      </div>

      {/* Data quality */}
      <div className="space-y-1.5">
        <p className="font-semibold" style={{ color: tv.textSecondary }}>Data quality</p>
        <DetailRow label="Data completeness" value={`${(pick.dataCompleteness * 100).toFixed(0)}%`} />
        <DetailRow label="Match confidence" value={`${(pick.matchConfidence * 100).toFixed(0)}%`} />
        <DetailRow label="Bookmakers" value={`${pick.bookmakerCount}`} />
        <DetailRow label="Quote age" value={quoteAgeLabel(pick.freshnessMs)} />
        <DetailRow label="Source" value={pick.source} />
        <DetailRow label="Model version" value={pick.modelVersion} />
      </div>

      {/* Qualification gates */}
      <div className="space-y-1.5">
        <p className="font-semibold" style={{ color: tv.textSecondary }}>
          Qualification gates ({pick.qualificationChecks.filter((c) => c.passed).length}/{pick.qualificationChecks.length} passed)
        </p>
        {pick.qualificationChecks.map((check) => (
          <GateRow key={check.name} name={check.name} passed={check.passed} detail={check.detail} />
        ))}
      </div>
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────────────────────

function SummaryCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="panel-img rounded-xl px-3 py-2.5 card-lift" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
      <div className="flex items-center gap-1.5" style={{ color: tv.textMuted }}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-0.5 text-lg font-bold mono" style={{ color: accent ?? tv.textPrimary }}>{value}</p>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
      style={{
        background: active ? accentAlpha(0.12) : mutedAlpha(0.04),
        color: active ? tv.accent : tv.textMuted,
        border: active ? `1px solid ${accentAlpha(0.2)}` : `1px solid ${tv.borderBase}`,
        minHeight: '32px',
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ qualified }: { qualified: boolean }) {
  return (
    <span
      className="rounded px-2 py-0.5 text-xs font-bold"
      style={{
        background: qualified ? accentAlpha(0.1) : amberAlpha(0.1),
        color: qualified ? tv.accent : tv.statusAmber,
      }}
    >
      {qualified ? 'QUALIFIED' : 'EXCLUDED'}
    </span>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: tv.textMuted }}>{label}</p>
      <p className="text-sm font-bold mono" style={{ color: accent ?? tv.textPrimary }}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span style={{ color: tv.textMuted }}>{label}</span>
      <span className="mono text-right" style={{ color: tv.textSecondary }}>{value}</span>
    </div>
  );
}

function GateRow({ name, passed, detail }: { name: string; passed: boolean; detail: string }) {
  const isCaution = !passed && (detail.toLowerCase().includes('only') || detail.toLowerCase().includes('low'));
  const color = passed ? tv.accent : isCaution ? tv.statusAmber : tv.statusRed;
  const bg = passed ? accentAlpha(0.12) : isCaution ? amberAlpha(0.12) : redAlpha(0.12);
  const symbol = passed ? '\u2713' : isCaution ? '!' : '\u2717';

  return (
    <div className="flex items-start gap-2">
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ background: bg, color }}
      >
        {symbol}
      </span>
      <div className="min-w-0">
        <span style={{ color: passed ? tv.textSecondary : tv.textMuted }}>{name}</span>
        <span className="ml-1.5" style={{ color: tv.textMuted }}>— {detail}</span>
      </div>
    </div>
  );
}
