import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, CloudOff, Loader2 } from 'lucide-react';
import { probeSystem, stateLabel, type FnStatus, type FnState } from '@/services/systemStatus';
import { tv, accentAlpha, amberAlpha, redAlpha, mutedAlpha } from '@/lib/themeVars';

function toneFor(s: FnState) {
  if (s === 'ok') return { color: tv.accent, bg: accentAlpha(0.1), border: accentAlpha(0.25), Icon: CheckCircle2 };
  if (s === 'needs-secrets' || s === 'unauthorized') return { color: tv.statusAmber, bg: amberAlpha(0.1), border: amberAlpha(0.25), Icon: AlertTriangle };
  if (s === 'unreachable') return { color: tv.textMuted, bg: mutedAlpha(0.08), border: mutedAlpha(0.2), Icon: CloudOff };
  return { color: tv.statusRed, bg: redAlpha(0.1), border: redAlpha(0.25), Icon: XCircle };
}

/**
 * Live readiness board. Probes every edge function the terminal depends on and
 * says, per function, whether it is deployed, current, and holding its keys —
 * so "why isn't it connecting?" has an answer on screen instead of requiring
 * someone to go dig through server logs.
 */
export function SystemStatus() {
  const [rows, setRows] = useState<FnStatus[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    try { setRows(await probeSystem()); } finally { setBusy(false); }
  }, []);

  useEffect(() => { run(); }, [run]);

  const needsDeploy = rows?.filter((r) => r.state === 'not-deployed' || r.state === 'stale') ?? [];
  const needsKeys = rows?.filter((r) => r.state === 'needs-secrets' || r.state === 'unauthorized') ?? [];
  const liveCount = rows?.filter((r) => r.state === 'ok').length ?? 0;
  const allGood = rows !== null && needsDeploy.length === 0 && needsKeys.length === 0;

  return (
    <div className="panel-img rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold" style={{ color: tv.textPrimary }}>System status</h2>
        <button
          onClick={run}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: accentAlpha(0.1), color: tv.accent, border: `1px solid ${accentAlpha(0.22)}`, minHeight: 40, opacity: busy ? 0.6 : 1 }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Re-check
        </button>
      </div>
      <p className="mb-4 text-xs" style={{ color: tv.textMuted }}>
        Live probe of every server function. This reflects what is actually running right now — not what
        is in the code.
      </p>

      {rows === null ? (
        <div className="flex items-center gap-2 py-8" style={{ color: tv.textMuted }}>
          <Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm">Checking the server…</span>
        </div>
      ) : (
        <>
          {/* Headline verdict */}
          <div
            className="mb-4 rounded-xl px-4 py-3"
            style={
              allGood
                ? { background: accentAlpha(0.08), border: `1px solid ${accentAlpha(0.25)}` }
                : { background: amberAlpha(0.06), border: `1px solid ${amberAlpha(0.22)}` }
            }
          >
            <p className="text-sm font-semibold" style={{ color: allGood ? tv.accent : tv.statusAmber }}>
              {allGood
                ? `All ${liveCount} functions live.`
                : needsDeploy.length > 0
                  ? `${needsDeploy.length} function${needsDeploy.length === 1 ? '' : 's'} need deploying — that is the blocker.`
                  : `${needsKeys.length} function${needsKeys.length === 1 ? '' : 's'} still need their API keys.`}
            </p>
            {needsDeploy.length > 0 && (
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: tv.textMuted }}>
                Ask your deploy tool to deploy:{' '}
                <span className="font-mono" style={{ color: tv.textSecondary }}>
                  {needsDeploy.map((r) => r.slug).join(', ')}
                </span>
                . Adding API keys will not help until the code is on the server — the keys are read
                <em> by</em> that code.
              </p>
            )}
            {needsDeploy.length === 0 && needsKeys.length > 0 && (
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: tv.textMuted }}>
                Set these as Edge Function secrets:{' '}
                <span className="font-mono" style={{ color: tv.textSecondary }}>
                  {[...new Set(needsKeys.flatMap((r) => r.secrets))].join(', ')}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            {rows.map((r) => {
              const tone = toneFor(r.state);
              return (
                <div
                  key={r.slug}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: mutedAlpha(0.03), border: `1px solid ${tv.borderBase}` }}
                >
                  <tone.Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: tone.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{r.label}</p>
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}
                      >
                        {stateLabel(r.state)}
                      </span>
                      {!r.required && (
                        <span className="text-[9px] uppercase tracking-wider" style={{ color: mutedAlpha(0.6) }}>optional</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: tv.textMuted }}>{r.powers}</p>
                    {r.state !== 'ok' && (
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: tone.color }}>{r.detail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
