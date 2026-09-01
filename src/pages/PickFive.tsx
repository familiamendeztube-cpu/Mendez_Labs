import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Lock, X, ArrowUp, ArrowDown, Plus, CheckCircle2, Zap, AlertTriangle, Info, Brain, Loader2, ThumbsUp, Minus, ThumbsDown, ExternalLink, Sparkles } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { fmtOdds, fmtPercent, fmtDateTime, fmtCurrency } from '@/utils/format';
import { fmtCostaRicaDateTime } from '@/services/liveData';
import { plainEnglishBet } from '@/utils/pickFive';
import { quarterKellyStake } from '@/utils/valueEngine';
import { autoSelectBestFive } from '@/utils/autoSelect';
import { aiSelectFive } from '@/services/aiPicks';
import { MatchupBadges } from '@/components/TeamBadge';
import { SPORTS_IMAGES } from '@/data/sportsImages';
import { tv, accentAlpha, redAlpha, mutedAlpha, amberAlpha } from '@/lib/themeVars';
import { terminalHeaders } from '@/lib/terminalConfig';
import type { RankedPick } from '@/services/liveData';

interface AIResearch {
  pick_id: string;
  summary: string;
  key_factors: string[];
  risk_flags: string[];
  verdict: 'supports' | 'neutral' | 'against';
  confidence: number;
  sources: string[];
}

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analysis`;

// ── Main component ──────────────────────────────────────────────────────────

export function PickFive() {
  const {
    pickFiveToday,
    rankedPicks,
    addToPickFive,
    setPickFiveFromPicks,
    removeFromPickFive,
    reorderPickFive,
    lockPickFive,
    replacePick,
    riskSettings,
  } = useStore();

  const [showReplaceModal, setShowReplaceModal] = useState<number | null>(null);
  const [auditNote, setAuditNote] = useState('');
  const [lockMessage, setLockMessage] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [autoSelectMsg, setAutoSelectMsg] = useState<{ text: string; tier: 'model' | 'market' | 'none' } | null>(null);
  const [aiResearch, setAiResearch] = useState<Record<string, AIResearch>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSelecting, setAiSelecting] = useState(false);
  const [aiSelectSummary, setAiSelectSummary] = useState<string | null>(null);

  const bankroll = riskSettings.startingBankroll;

  const availablePicks = useMemo(
    () =>
      rankedPicks.filter(
        (p) => p.qualified && p.pFinal !== null && p.evPercent !== null && !pickFiveToday.picks.some((pk) => pk.opportunityId === p.eventId),
      ),
    [rankedPicks, pickFiveToday.picks],
  );

  const handleLock = () => {
    const result = lockPickFive();
    setLockMessage(result);
    setTimeout(() => setLockMessage(null), 4000);
  };

  const handleAutoSelect = () => {
    if (pickFiveToday.locked) return;
    const { selected, explanation, tier } = autoSelectBestFive(rankedPicks, bankroll);
    const added = setPickFiveFromPicks(selected);
    const note = explanation
      ? explanation
      : added < 5
        ? `Added ${added} pick${added === 1 ? '' : 's'} — that's every independent game with data today.`
        : null;
    setAutoSelectMsg(note ? { text: note, tier } : null);
    if (note) setTimeout(() => setAutoSelectMsg(null), 12000);
  };

  const handleAiSelect = async () => {
    if (pickFiveToday.locked || aiSelecting) return;
    setAiSelecting(true);
    setAiSelectSummary(null);
    setAutoSelectMsg(null);
    try {
      const { summary, picks } = await aiSelectFive(rankedPicks, bankroll);
      const ordered = picks
        .map((p) => rankedPicks.find(
          (r) => r.eventId === p.eventId && r.market === p.market && r.side === p.side,
        ))
        .filter((r): r is NonNullable<typeof r> => r != null);
      const added = setPickFiveFromPicks(ordered);
      setAiSelectSummary(
        added > 0
          ? `${summary}\n\nAdded ${added} pick${added === 1 ? '' : 's'} to your card.`
          : summary || 'The AI found no plays worth backing today.',
      );
    } catch (err) {
      setAiSelectSummary(
        err instanceof Error && err.message.includes('ANTHROPIC_API_KEY')
          ? 'AI Select needs the ANTHROPIC_API_KEY secret set on the ai-picks function.'
          : err instanceof Error
            ? err.message
            : 'AI Select failed.',
      );
    } finally {
      setAiSelecting(false);
    }
  };

  const handleAIResearch = useCallback(async () => {
    const picks = pickFiveToday.picks;
    if (picks.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(FUNC_URL, {
        method: 'POST',
        headers: terminalHeaders(),
        body: JSON.stringify({
          picks: picks.map((p) => ({
            id: p.opportunityId,
            matchup: p.matchup,
            league: p.league,
            market: p.market,
            side: p.side,
            startTime: p.startTime,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || 'AI research failed');
      }
      const { results } = await res.json() as { results: AIResearch[] };
      const map: Record<string, AIResearch> = {};
      for (const r of results) map[r.pick_id] = r;
      setAiResearch(map);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI research failed');
    } finally {
      setAiLoading(false);
    }
  }, [pickFiveToday.picks]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl" style={{ border: `1px solid ${tv.borderBase}` }}>
        <img src={SPORTS_IMAGES.entranceHero} alt="" loading="lazy" className="h-32 w-full object-cover sm:h-40" style={{ opacity: 0.5 }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(27,21,17,0.2), ${tv.bgRoot})` }} />
        <div className="absolute bottom-0 left-0 p-4 sm:p-5">
          <h1 className="serif text-3xl font-normal" style={{ color: tv.textPrimary, letterSpacing: '-0.03em' }}>
            Top Five
          </h1>
          <p className="mt-1 text-sm" style={{ color: tv.textSecondary }}>
            Choose your five best picks, or let AI Select build the card. Lock when ready to paper track.
          </p>
        </div>
      </div>

      {/* Sticky progress + actions */}
      <div
        className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 sm:px-5 sm:py-4"
        style={{ background: 'rgba(12,15,13,0.95)', backdropFilter: 'blur(8px)', border: `1px solid ${tv.borderBase}` }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="h-2.5 w-2.5 rounded-full transition-colors"
                style={{ background: n <= pickFiveToday.picks.length ? tv.accent : mutedAlpha(0.2) }}
              />
            ))}
          </div>
          <span className="text-sm font-semibold" style={{ color: pickFiveToday.picks.length === 5 ? tv.accent : tv.textSecondary }}>
            {pickFiveToday.picks.length} of 5
          </span>
          {pickFiveToday.locked && (
            <span className="flex items-center gap-1 text-xs" style={{ color: tv.accent }}>
              <Lock className="h-3 w-3" /> Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pickFiveToday.picks.length > 0 && (
            <button
              onClick={handleAIResearch}
              disabled={aiLoading}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
              style={{
                background: 'rgba(59,130,246,0.08)',
                color: '#3B82F6',
                border: '1px solid rgba(59,130,246,0.2)',
                minHeight: '44px',
                opacity: aiLoading ? 0.6 : 1,
              }}
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {aiLoading ? 'Researching...' : 'AI Research'}
            </button>
          )}
          {!pickFiveToday.locked && (
            <>
              <button
                onClick={handleAiSelect}
                disabled={aiSelecting}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(214,183,122,0.18), rgba(181,138,58,0.12))',
                  color: tv.accent,
                  border: `1px solid ${accentAlpha(0.35)}`,
                  minHeight: '44px',
                  opacity: aiSelecting ? 0.6 : 1,
                }}
              >
                {aiSelecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiSelecting ? 'Thinking...' : 'AI Select'}
              </button>
              <button
                onClick={handleAutoSelect}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: accentAlpha(0.08),
                  color: tv.accent,
                  border: `1px solid ${accentAlpha(0.2)}`,
                  minHeight: '44px',
                }}
              >
                <Zap className="h-4 w-4" /> Auto-select
              </button>
            </>
          )}
          <button
            onClick={handleLock}
            disabled={pickFiveToday.picks.length < 1 || pickFiveToday.locked}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: pickFiveToday.picks.length >= 1 && !pickFiveToday.locked ? tv.accent : 'rgba(220,225,222,0.04)',
              color: pickFiveToday.picks.length >= 1 && !pickFiveToday.locked ? tv.bgOverlay : tv.textMuted,
              cursor: pickFiveToday.picks.length >= 1 && !pickFiveToday.locked ? 'pointer' : 'default',
              minHeight: '44px',
            }}
          >
            <Lock className="h-4 w-4" /> Lock
          </button>
        </div>
      </div>

      {/* Messages */}
      {lockMessage && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: lockMessage.ok ? accentAlpha(0.08) : redAlpha(0.08),
            border: `1px solid ${lockMessage.ok ? accentAlpha(0.2) : redAlpha(0.2)}`,
            color: lockMessage.ok ? tv.accent : tv.statusRed,
          }}
        >
          {lockMessage.ok ? 'Top Five locked! All picks are frozen for paper tracking.' : lockMessage.reason}
        </div>
      )}

      {aiError && (
        <div className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm" style={{ background: redAlpha(0.06), border: `1px solid ${redAlpha(0.15)}`, color: tv.statusRed }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          AI Research error: {aiError}
        </div>
      )}

      {autoSelectMsg && (
        <div
          className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm"
          style={
            autoSelectMsg.tier === 'model'
              ? { background: accentAlpha(0.08), border: `1px solid ${accentAlpha(0.2)}`, color: tv.accent }
              : { background: amberAlpha(0.06), border: `1px solid ${amberAlpha(0.15)}`, color: tv.statusAmber }
          }
        >
          {autoSelectMsg.tier === 'model'
            ? <Zap className="h-4 w-4 shrink-0 mt-0.5" />
            : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
          {autoSelectMsg.text}
        </div>
      )}

      {aiSelectSummary && (
        <div
          className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm whitespace-pre-line"
          style={{ background: accentAlpha(0.08), border: `1px solid ${accentAlpha(0.25)}`, color: tv.textSecondary }}
        >
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" style={{ color: tv.accent }} />
          <span><strong style={{ color: tv.accent }}>AI Select:</strong> {aiSelectSummary}</span>
        </div>
      )}

      {/* Date */}
      <p className="text-sm" style={{ color: tv.textMuted }}>
        {new Date(pickFiveToday.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        {' · '}{pickFiveToday.timezone}
      </p>

      {/* Five slots */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((slot) => {
          const pick = pickFiveToday.picks.find((p) => p.slot === slot);
          if (!pick) {
            return (
              <EmptySlot
                key={slot}
                slot={slot}
                reason={
                  pickFiveToday.picks.length > 0 && slot > pickFiveToday.picks.length
                    ? 'Not enough qualified picks met all data-quality gates'
                    : undefined
                }
              />
            );
          }
          const research = aiResearch[pick.opportunityId];
          return (
            <div key={slot} className="space-y-2">
              <PickSlot
                slot={slot}
                pick={pick}
                bankroll={bankroll}
                locked={pickFiveToday.locked}
                onRemove={() => removeFromPickFive(slot)}
                onMoveUp={slot > 1 ? () => reorderPickFive(slot, slot - 1) : undefined}
                onMoveDown={slot < pickFiveToday.picks.length ? () => reorderPickFive(slot, slot + 1) : undefined}
                onReplace={() => setShowReplaceModal(slot)}
              />
              {research && <ResearchCard research={research} />}
            </div>
          );
        })}
      </div>

      {/* Replace modal */}
      {showReplaceModal !== null && (
        <ReplaceModal
          slot={showReplaceModal}
          availablePicks={availablePicks}
          bankroll={bankroll}
          auditNote={auditNote}
          setAuditNote={setAuditNote}
          onReplace={(pick) => {
            const result = replacePick(showReplaceModal, pick, auditNote || 'Replaced by admin');
            if (result.ok) {
              setShowReplaceModal(null);
              setAuditNote('');
            }
          }}
          onClose={() => { setShowReplaceModal(null); setAuditNote(''); }}
        />
      )}

      {/* Available picks */}
      {!pickFiveToday.locked && pickFiveToday.picks.length < 5 && availablePicks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: tv.textPrimary }}>Available qualified picks</h2>
          {availablePicks.slice(0, 8).map((pick) => (
            <AvailablePickRow
              key={`${pick.eventId}-${pick.market}-${pick.side}`}
              pick={pick}
              bankroll={bankroll}
              onAdd={() => addToPickFive(pick)}
            />
          ))}
        </div>
      )}

      {/* Disclosure */}
      <div
        className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm"
        style={{ background: amberAlpha(0.04), border: `1px solid ${amberAlpha(0.12)}`, color: tv.statusAmber }}
      >
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Paper tracking only. No real money is wagered. Stakes are sized by quarter-Kelly, capped at 1% per pick and 2% absolute.</span>
      </div>
    </div>
  );
}

// ── Empty Slot ──────────────────────────────────────────────────────────────

function EmptySlot({ slot, reason }: { slot: number; reason?: string }) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl p-4 sm:p-5"
      style={{ background: tv.bgSurface, border: `2px dashed ${tv.borderBase}` }}
    >
      <span className="mono text-2xl font-bold" style={{ color: mutedAlpha(0.3) }}>{slot}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: tv.textMuted }}>
          {reason ?? 'Empty slot — add a pick from Today\'s page or use Auto-select'}
        </p>
      </div>
      <Link
        to="/"
        className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium"
        style={{ color: tv.accent, border: `1px solid ${accentAlpha(0.2)}`, minHeight: '44px' }}
      >
        <Plus className="h-4 w-4" /> Browse
      </Link>
    </div>
  );
}

// ── Pick Slot ───────────────────────────────────────────────────────────────

function PickSlot({ slot, pick, bankroll, locked, onRemove, onMoveUp, onMoveDown, onReplace }: {
  slot: number;
  pick: import('@/types/models').FrozenPick;
  bankroll: number;
  locked: boolean;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onReplace: () => void;
}) {
  const { stake } = quarterKellyStake(
    pick.modelProbability > 0 ? pick.modelProbability : null,
    pick.odds > 0 ? pick.odds / 100 + 1 : pick.odds < 0 ? 100 / -pick.odds + 1 : null,
    bankroll,
  );
  const displayStake = pick.suggestedStake > 0 ? pick.suggestedStake : stake;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: tv.bgSurface, border: locked ? `1px solid ${accentAlpha(0.12)}` : `1px solid ${tv.borderBase}` }}
    >
      <div className="flex items-start gap-3">
        <span className="mono text-2xl font-bold" style={{ color: tv.accent }}>{slot}</span>
        {(() => {
          const [h, a] = pick.matchup.split(/\s+vs\.?\s+/i);
          return <MatchupBadges home={h ?? pick.matchup} away={a ?? ''} size={30} />;
        })()}
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold" style={{ color: tv.textPrimary }}>
            {pick.league} {pick.matchup}
          </p>
          <p className="text-sm" style={{ color: tv.textSecondary }}>
            {plainEnglishBet(pick.market, pick.side, pick.matchup)}
          </p>
          <p className="text-xs" style={{ color: tv.textMuted }}>
            {fmtOdds(pick.odds)} · {fmtCostaRicaDateTime(pick.startTime)}
          </p>

          {/* Metrics grid */}
          <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1.5 sm:grid-cols-6">
            <SlotMetric label="Model p" value={fmtPercent(pick.modelProbability > 0 ? pick.modelProbability : null)} />
            <SlotMetric label="Market p" value={fmtPercent(pick.impliedProbability > 0 ? pick.impliedProbability : null)} />
            <SlotMetric
              label="Edge"
              value={pick.edge > 0 ? `+${(pick.edge * 100).toFixed(1)}pp` : 'N/A'}
              accent={pick.edge >= 0.03 ? tv.accent : pick.edge >= 0.01 ? tv.statusAmber : undefined}
            />
            <SlotMetric label="EV" value={pick.edge > 0 && pick.modelProbability > 0 ? `+${(pick.edge * pick.modelProbability * 100).toFixed(1)}%` : 'N/A'} />
            <SlotMetric label="Quality" value={`${(pick.confidenceScore * 100).toFixed(0)}%`} />
            <SlotMetric label="Stake" value={displayStake > 0 ? fmtCurrency(displayStake) : '$0.00'} accent={tv.accent} />
          </div>

          {pick.reasoning && (
            <p className="mt-1.5 text-xs" style={{ color: tv.textMuted }}>{pick.reasoning}</p>
          )}

          {pick.auditNote && (
            <p className="mt-1 text-xs italic" style={{ color: tv.statusAmber }}>Replaced: {pick.auditNote}</p>
          )}

          <p className="mt-1 text-xs" style={{ color: mutedAlpha(0.5) }}>
            {pick.source} · Frozen {fmtDateTime(pick.frozenAt)}
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          {onMoveUp && (
            <button onClick={onMoveUp} className="rounded-lg p-2 hover:bg-white/5" style={{ minHeight: '44px', minWidth: '44px' }} aria-label="Move up">
              <ArrowUp className="h-4 w-4" style={{ color: tv.textMuted }} />
            </button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="rounded-lg p-2 hover:bg-white/5" style={{ minHeight: '44px', minWidth: '44px' }} aria-label="Move down">
              <ArrowDown className="h-4 w-4" style={{ color: tv.textMuted }} />
            </button>
          )}
          {!locked && (
            <button onClick={onRemove} className="rounded-lg p-2 hover:bg-white/5" style={{ minHeight: '44px', minWidth: '44px' }} aria-label="Remove pick">
              <X className="h-4 w-4" style={{ color: tv.statusRed }} />
            </button>
          )}
          {locked && (
            <button onClick={onReplace} className="rounded-lg px-3 py-2.5 text-xs font-medium" style={{ color: tv.statusAmber, border: `1px solid ${amberAlpha(0.2)}`, minHeight: '44px' }}>
              Replace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotMetric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: tv.textMuted }}>{label}</p>
      <p className="text-sm font-bold mono" style={{ color: accent ?? tv.textPrimary }}>{value}</p>
    </div>
  );
}

// ── Available Pick Row ──────────────────────────────────────────────────────

function AvailablePickRow({ pick, bankroll, onAdd }: { pick: RankedPick; bankroll: number; onAdd: () => void }) {
  const { stake } = quarterKellyStake(pick.pFinal, pick.offeredDecimal, bankroll);

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg p-3"
      style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}
    >
      <MatchupBadges home={pick.homeTeam} away={pick.awayTeam} size={26} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: tv.textPrimary }}>
          {pick.league} {pick.homeTeam} vs {pick.awayTeam}
        </p>
        <p className="text-xs" style={{ color: tv.textMuted }}>
          {pick.market === 'Moneyline' ? `Bet on ${pick.side} to win` : pick.side} · {fmtOdds(pick.bestOdds)} · EV {pick.evPercent !== null ? `+${(pick.evPercent * 100).toFixed(1)}%` : 'N/A'} · Stake {stake > 0 ? fmtCurrency(stake) : '$0'}
        </p>
      </div>
      <button
        onClick={onAdd}
        disabled={stake <= 0}
        className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-semibold disabled:opacity-40"
        style={{ background: tv.accent, color: tv.bgOverlay, minHeight: '44px' }}
      >
        <Plus className="h-4 w-4" /> Add
      </button>
    </div>
  );
}

// ── Replace Modal ───────────────────────────────────────────────────────────

function ResearchCard({ research }: { research: AIResearch }) {
  const VerdictIcon = research.verdict === 'supports' ? ThumbsUp : research.verdict === 'against' ? ThumbsDown : Minus;
  const verdictColor = research.verdict === 'supports' ? tv.accent : research.verdict === 'against' ? tv.statusRed : tv.statusAmber;
  const verdictBg = research.verdict === 'supports' ? accentAlpha(0.08) : research.verdict === 'against' ? redAlpha(0.08) : amberAlpha(0.08);
  const verdictBorder = research.verdict === 'supports' ? accentAlpha(0.2) : research.verdict === 'against' ? redAlpha(0.2) : amberAlpha(0.2);

  return (
    <div className="rounded-xl p-4 ml-8 ai-research-card" style={{ background: 'rgba(224,165,50,0.03)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4" style={{ color: '#3B82F6' }} />
        <span className="text-xs font-semibold" style={{ color: '#3B82F6' }}>AI Research</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 verdict-pulse" style={{ background: verdictBg, color: verdictColor, border: `1px solid ${verdictBorder}` }}>
          <VerdictIcon className="h-3 w-3" />
          {research.verdict.toUpperCase()}
        </span>
        {research.confidence > 0 && (
          <span className="text-[10px] font-semibold" style={{ color: tv.textMuted }}>
            {(research.confidence * 100).toFixed(0)}% confidence
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed" style={{ color: tv.textSecondary }}>{research.summary}</p>

      {research.key_factors.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold mb-1" style={{ color: tv.textMuted }}>Key factors</p>
          <div className="flex flex-wrap gap-1.5">
            {research.key_factors.map((f, i) => (
              <span key={i} className="rounded px-2 py-0.5 text-xs" style={{ background: mutedAlpha(0.06), color: tv.textSecondary }}>{f}</span>
            ))}
          </div>
        </div>
      )}

      {research.risk_flags.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold mb-1" style={{ color: tv.statusRed }}>Risk flags</p>
          <div className="flex flex-wrap gap-1.5">
            {research.risk_flags.map((f, i) => (
              <span key={i} className="rounded px-2 py-0.5 text-xs" style={{ background: redAlpha(0.06), color: tv.statusRed }}>{f}</span>
            ))}
          </div>
        </div>
      )}

      {research.sources.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {research.sources.map((s, i) => (
            <span key={i} className="flex items-center gap-1 text-[10px]" style={{ color: tv.textMuted }}>
              <ExternalLink className="h-2.5 w-2.5" /> {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ReplaceModal({ slot, availablePicks, bankroll, auditNote, setAuditNote, onReplace, onClose }: {
  slot: number;
  availablePicks: RankedPick[];
  bankroll: number;
  auditNote: string;
  setAuditNote: (v: string) => void;
  onReplace: (pick: RankedPick) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5"
        style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold" style={{ color: tv.textPrimary }}>Replace pick #{slot}</h3>
        <p className="mt-1 text-sm" style={{ color: tv.textMuted }}>This will freeze a new pick with an audit note.</p>

        <div className="mt-4">
          <label className="text-xs" style={{ color: tv.textMuted }}>Audit note (required)</label>
          <input
            type="text"
            value={auditNote}
            onChange={(e) => setAuditNote(e.target.value)}
            placeholder="e.g. Injury update changed the edge"
            className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
            style={{ background: tv.bgOverlay, border: `1px solid ${tv.borderBase}`, color: tv.textPrimary, minHeight: '44px' }}
          />
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>Choose a new pick:</p>
          {availablePicks.slice(0, 10).map((pick) => {
            const { stake } = quarterKellyStake(pick.pFinal, pick.offeredDecimal, bankroll);
            return (
              <button
                key={`${pick.eventId}-${pick.market}-${pick.side}`}
                onClick={() => onReplace(pick)}
                disabled={!auditNote.trim() || stake <= 0}
                className="flex w-full items-center justify-between gap-2 rounded-lg p-3 text-left disabled:opacity-50"
                style={{ background: 'rgba(8,10,9,0.6)', border: `1px solid ${tv.borderBase}`, minHeight: '44px' }}
              >
                <div>
                  <p className="text-sm" style={{ color: tv.textPrimary }}>{pick.homeTeam} vs {pick.awayTeam}</p>
                  <p className="text-xs" style={{ color: tv.textMuted }}>
                    {pick.market === 'Moneyline' ? `Bet on ${pick.side} to win` : pick.side} · {fmtOdds(pick.bestOdds)} · Stake {fmtCurrency(stake)}
                  </p>
                </div>
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: tv.accent }} />
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg py-2.5 text-sm"
          style={{ color: tv.textMuted, border: `1px solid ${tv.borderBase}`, minHeight: '44px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
