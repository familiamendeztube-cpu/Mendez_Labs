import { useState } from 'react';
import { RefreshCw, Check, AlertCircle, Clock, LogOut, Lock, Radio, XCircle, Palette } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { fmtCostaRicaDateTime } from '@/services/liveData';
import { LogoutModal } from '@/components/LogoutModal';
import {
  defaultSettingsConnections,
  computeReadiness,
  connectionStatusLabel,
  type ConnectionCard,
} from '@/utils/tradingCalc';
import { tv, accentAlpha, amberAlpha, redAlpha, mutedAlpha } from '@/lib/themeVars';
import { PageHero } from '@/components/PageHero';
import { APP_IMAGES } from '@/data/appImages';
import { useTheme } from '@/lib/useTheme';
import { THEMES } from '@/lib/themes';

export function Settings() {
  const { feedProvider, modelHealth, refreshFeed, feedLoading, settings, setSettings, lastFeedFetch, signOut } = useStore();
  const [showLogout, setShowLogout] = useState(false);
  const { themeId, setTheme } = useTheme();

  const settingsConns = defaultSettingsConnections().map((c) => {
    if (c.id === 'odds-api' && feedProvider?.status === 'connected') {
      return { ...c, status: 'connected' as const, lastSync: feedProvider.lastSync, nextAction: 'Connected and syncing' };
    }
    return c;
  });
  const readiness = computeReadiness(settingsConns);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHero
        image={APP_IMAGES.skyline}
        eyebrow="Terminal"
        title="Settings"
        subtitle="Connections, readiness, and display preferences."
        height="sm"
      />

      {/* ── Theme Picker ─────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5" style={{ color: tv.accent }} />
          <h2 className="text-base font-semibold" style={{ color: tv.textPrimary }}>Theme</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = t.id === themeId;
            const bg = t.colors['--bg-surface'];
            const accent = t.colors['--accent'];
            const text = t.colors['--text-primary'];
            const muted = t.colors['--text-muted'];
            const red = t.colors['--status-red'];
            const amber = t.colors['--status-amber'];
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="relative rounded-xl p-3 text-left transition-all"
                style={{
                  background: bg,
                  border: active ? `2px solid ${accent}` : `1px solid ${t.colors['--border-base']}`,
                  outline: active ? `2px solid ${accent}44` : 'none',
                  outlineOffset: 2,
                  minHeight: '88px',
                }}
              >
                {active && (
                  <div
                    className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: accent }}
                  >
                    <Check className="h-3 w-3" style={{ color: bg }} />
                  </div>
                )}
                <p className="text-sm font-semibold" style={{ color: text }}>{t.name}</p>
                <p className="mt-0.5 text-xs" style={{ color: muted }}>{t.description}</p>
                <div className="mt-2 flex gap-1">
                  {[accent, t.colors['--accent-deep'], amber, red, muted].map((c, i) => (
                    <span key={i} className="h-3 w-3 rounded-full" style={{ background: c }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs" style={{ color: mutedAlpha(0.5) }}>
          Your theme choice is saved automatically and applies across the entire app.
        </p>
      </div>

      {/* ── Trading Connections ────────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <h2 className="text-base font-semibold mb-3" style={{ color: tv.textPrimary }}>Trading connections</h2>
        <div className="space-y-2">
          {settingsConns.filter((c) => c.id.startsWith('alpaca')).map((c) => (
            <SettingsConnectionRow key={c.id} card={c} />
          ))}
        </div>
        <div className="mt-3 rounded-lg px-3 py-2" style={{ background: mutedAlpha(0.03) }}>
          <p className="text-xs font-semibold mb-1" style={{ color: tv.textMuted }}>Required server secrets</p>
          <div className="flex flex-wrap gap-1.5">
            {['ALPACA_PAPER_KEY_ID', 'ALPACA_PAPER_SECRET', 'ALPACA_LIVE_KEY_ID', 'ALPACA_LIVE_SECRET'].map((s) => (
              <span key={s} className="rounded px-2 py-0.5 text-xs mono" style={{ background: mutedAlpha(0.06), color: tv.textMuted }}>{s}</span>
            ))}
          </div>
          <p className="mt-1.5 text-xs" style={{ color: mutedAlpha(0.5) }}>
            Values are never shown. Website login does not equal API connection. Credentials are stored server-side only.
          </p>
        </div>
      </div>

      {/* ── Sports Lab Connections (collapsed) ─────────────────────────── */}
      <details className="rounded-2xl" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <summary className="cursor-pointer px-5 py-4 text-base font-semibold" style={{ color: tv.textPrimary }}>
          Sports Lab connections
        </summary>
        <div className="space-y-2 px-5 pb-5">
          {settingsConns.filter((c) => !c.id.startsWith('alpaca')).map((c) => (
            <SettingsConnectionRow key={c.id} card={c} />
          ))}
        </div>
      </details>

      {/* ── Readiness ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <h2 className="text-base font-semibold mb-3" style={{ color: tv.textPrimary }}>Readiness</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ReadinessChip label="Trading paper" ready={readiness.tradingPaper} />
          <ReadinessChip label="Trading live" ready={false} locked />
          <ReadinessChip label="Sports data" ready={readiness.sportsData} />
          <ReadinessChip label="Sports execution" ready={false} locked />
        </div>
        <p className="mt-2 text-xs" style={{ color: mutedAlpha(0.5) }}>
          Credentials stored server-side only. Website logins do not verify API access.
        </p>
      </div>

      {/* Provider status */}
      <div className="rounded-2xl p-6" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: tv.textPrimary }}>Data provider</h2>
        {feedProvider ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {feedProvider.status === 'connected' ? (
                  <Check className="h-5 w-5" style={{ color: tv.accent }} />
                ) : feedProvider.status === 'degraded' ? (
                  <AlertCircle className="h-5 w-5" style={{ color: tv.statusAmber }} />
                ) : (
                  <AlertCircle className="h-5 w-5" style={{ color: tv.statusRed }} />
                )}
                <div>
                  <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{feedProvider.name}</p>
                  <p className="text-xs" style={{ color: tv.textMuted }}>
                    {feedProvider.status === 'connected' ? 'Connected — live data available'
                      : feedProvider.status === 'degraded' ? 'Partial — some sports unavailable'
                      : 'Unavailable'}
                  </p>
                </div>
              </div>
              <button
                onClick={refreshFeed}
                disabled={feedLoading}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: tv.accent, color: tv.bgOverlay }}
              >
                <RefreshCw className={`h-4 w-4 ${feedLoading ? 'animate-spin' : ''}`} />
                Refresh status
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: `1px solid ${tv.borderBase}` }}>
              <DetailItem icon={<Clock className="h-4 w-4" />} label="Last sync" value={feedProvider.lastSync ? fmtCostaRicaDateTime(feedProvider.lastSync) : 'Never'} />
              <DetailItem label="Events loaded" value={`${feedProvider.eventsCount}`} />
              <DetailItem label="Bookmakers" value={`${feedProvider.bookmakersCount}`} />
              <DetailItem label="Sports fetched" value={`${feedProvider.sportsFetched} / 5`} />
              {feedProvider.remainingQuota !== null && <DetailItem label="API quota remaining" value={`${feedProvider.remainingQuota} credits`} />}
              {feedProvider.message && <DetailItem label="Status message" value={feedProvider.message} />}
            </div>
            {lastFeedFetch && (
              <p className="text-xs" style={{ color: mutedAlpha(0.5) }}>
                Last checked: {lastFeedFetch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica' })} Costa Rica time
              </p>
            )}
            <p className="text-xs" style={{ color: mutedAlpha(0.6) }}>
              Data is cached for 1 hour to conserve API credits. Refresh checks the cache and fetches fresh data only when the cache expires.
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: tv.textMuted }}>No provider data yet. Click refresh to check status.</p>
        )}
      </div>

      {/* Model health */}
      {modelHealth && (
        <div className="rounded-2xl p-6" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: tv.textPrimary }}>Analysis engine</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  background: modelHealth.status === 'active' ? accentAlpha(0.15) : amberAlpha(0.15),
                  color: modelHealth.status === 'active' ? tv.accent : tv.statusAmber,
                }}
              >
                {modelHealth.label}
              </span>
              <span className="text-sm mono" style={{ color: tv.textMuted }}>{modelHealth.modelVersion}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: `1px solid ${tv.borderBase}` }}>
              <DetailItem label="Total sample size" value={`${modelHealth.sampleSize} games`} />
              <DetailItem label="Qualified picks" value={`${modelHealth.qualifiedCount}`} />
              <DetailItem label="Excluded picks" value={`${modelHealth.excludedCount}`} />
              <DetailItem label="Total predictions" value={`${modelHealth.totalPredictions}`} />
            </div>
            {Object.keys(modelHealth.leagueSampleSizes).length > 0 && (
              <div className="pt-4" style={{ borderTop: `1px solid ${tv.borderBase}` }}>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: tv.textMuted }}>League sample sizes</p>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(modelHealth.leagueSampleSizes).map(([league, size]) => (
                    <div key={league} className="text-center rounded-lg p-2" style={{ background: mutedAlpha(0.06) }}>
                      <p className="text-xs font-semibold" style={{ color: tv.textPrimary }}>{league}</p>
                      <p className="text-sm mono" style={{ color: (size as number) >= 30 ? tv.accent : tv.statusAmber }}>{size as number}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {modelHealth.message && <p className="text-xs" style={{ color: tv.statusAmber }}>{modelHealth.message}</p>}
            <p className="text-xs" style={{ color: mutedAlpha(0.6) }}>
              The model builds independent Elo probabilities before looking at market prices, then blends them with no-vig market consensus using explicit shrinkage. A pick qualifies only when all critical gates pass: league sample &ge;30, features complete, fresh/unstarted market, reliable match, &ge;3 valid bookmakers, and EV &ge;3%. Picks that fail any gate are excluded and never appear in Top Five.
            </p>
          </div>
        </div>
      )}

      {/* Display settings */}
      <div className="rounded-2xl p-6" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: tv.textPrimary }}>Display</h2>
        <div className="space-y-4">
          <ToggleRow label="Reduced motion" description="Minimize animations" value={settings.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} />
          <ToggleRow label="Sound effects" description="Audio feedback on actions" value={settings.soundEnabled} onChange={(v) => setSettings({ soundEnabled: v })} />
        </div>
      </div>

      {/* About */}
      <div className="rounded-2xl p-6" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: tv.textPrimary }}>About</h2>
        <p className="text-sm" style={{ color: tv.textSecondary }}>
          Mendez Labs is a trading and sports research terminal. Trading signals use real market data from Alpaca.
          Sports picks use real odds from real sportsbooks. All activity is paper tracked — no real money at risk.
        </p>
        <p className="mt-2 text-xs" style={{ color: mutedAlpha(0.6) }}>
          API keys are stored securely server-side and never exposed to the browser.
        </p>
      </div>

      {/* Log Out */}
      <div className="rounded-2xl p-6" style={{ background: tv.bgSurface, border: `1px solid ${redAlpha(0.12)}` }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: tv.textPrimary }}>Account</h2>
        <p className="mb-4 text-sm" style={{ color: tv.textMuted }}>
          Sign out of Mendez Labs. Your picks and results are saved automatically.
        </p>
        <button
          onClick={() => setShowLogout(true)}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors"
          style={{ background: redAlpha(0.1), color: tv.statusRed, border: `1px solid ${redAlpha(0.25)}` }}
          aria-label="Log out of Mendez Labs"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>

      <LogoutModal open={showLogout} onCancel={() => setShowLogout(false)} onConfirm={() => { setShowLogout(false); signOut(); }} />
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs uppercase tracking-wider" style={{ color: tv.textMuted }}>{icon}{label}</p>
      <p className="mt-1 text-sm font-medium mono" style={{ color: tv.textSecondary }}>{value}</p>
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium" style={{ color: tv.textSecondary }}>{label}</p>
        <p className="text-xs" style={{ color: tv.textMuted }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative h-7 w-12 rounded-full transition-colors"
        style={{ background: value ? tv.accent : 'rgba(255,255,255,0.1)' }}
        aria-label={`Toggle ${label}`}
        aria-pressed={value}
      >
        <span className="absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform" style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }} />
      </button>
    </div>
  );
}

function SettingsConnectionRow({ card }: { card: ConnectionCard }) {
  const color = card.status === 'connected' ? tv.accent : card.status === 'error' ? tv.statusRed : tv.statusAmber;
  const Icon = card.status === 'connected' ? Radio : card.status === 'error' ? XCircle : Lock;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5" style={{ background: mutedAlpha(0.03) }}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 shrink-0" style={{ color }} />
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{card.name}</p>
          <p className="text-xs" style={{ color: tv.textMuted }}>{card.nextAction}</p>
        </div>
      </div>
      <span className="shrink-0 text-xs font-semibold" style={{ color }}>{connectionStatusLabel(card.status)}</span>
    </div>
  );
}

function ReadinessChip({ label, ready, locked }: { label: string; ready: boolean; locked?: boolean }) {
  const color = locked ? tv.statusAmber : ready ? tv.accent : tv.statusRed;
  const text = locked ? 'Locked' : ready ? 'Ready' : 'Not ready';
  return (
    <div className="rounded-lg px-3 py-2 text-center" style={{ background: mutedAlpha(0.04), border: `1px solid ${tv.borderBase}` }}>
      <p className="text-xs" style={{ color: tv.textMuted }}>{label}</p>
      <p className="text-xs font-bold" style={{ color }}>{text}</p>
    </div>
  );
}
