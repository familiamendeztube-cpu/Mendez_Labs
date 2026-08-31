import { useState } from 'react';
import { LogOut, Menu, RefreshCw } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { LogoutModal } from '@/components/LogoutModal';
import { tv, mutedAlpha, redAlpha } from '@/lib/themeVars';

export function TopBar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { feedProvider, refreshFeed, feedLoading, lastFeedFetch, signOut } = useStore();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 lg:px-6 header-blur"
        style={{
          background: `color-mix(in srgb, ${tv.bgOverlay} 72%, transparent)`,
          borderBottom: `1px solid ${tv.borderBase}`,
        }}
      >
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-2 lg:hidden"
          style={{ color: tv.textSecondary }}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          {feedProvider && (
            <>
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: feedProvider.status === 'connected' ? tv.accent
                    : feedProvider.status === 'degraded' ? tv.statusAmber
                    : tv.statusRed,
                  boxShadow: feedProvider.status === 'connected'
                    ? `0 0 6px ${tv.accent}` : undefined,
                }}
              />
              <span className="text-xs font-medium" style={{ color: tv.textMuted }}>
                {feedProvider.status === 'connected' ? 'Live data'
                  : feedProvider.status === 'degraded' ? 'Partial data'
                  : 'Unavailable'}
              </span>
              {lastFeedFetch && (
                <span className="hidden text-xs sm:inline" style={{ color: mutedAlpha(0.5) }}>
                  · Updated {lastFeedFetch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica' })}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshFeed}
            disabled={feedLoading}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium btn-press disabled:opacity-50"
            style={{ color: tv.textSecondary, border: `1px solid ${tv.borderBase}`, transition: 'border-color 180ms ease' }}
          >
            <RefreshCw className={`h-4 w-4 ${feedLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setShowLogout(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold btn-press"
            style={{ color: tv.statusRed, border: `1px solid ${redAlpha(0.2)}`, transition: 'border-color 180ms ease' }}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      <LogoutModal
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={() => { setShowLogout(false); signOut(); }}
      />
    </>
  );
}
