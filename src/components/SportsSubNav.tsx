import { Link, useLocation } from 'react-router-dom';
import { SPORTS_SUB_ITEMS } from '@/components/navItems';
import { tv, accentAlpha, mutedAlpha } from '@/lib/themeVars';

export function SportsSubNav() {
  const location = useLocation();

  return (
    <div
      className="sticky top-16 z-20 flex gap-1.5 overflow-x-auto px-4 py-2 lg:px-6 header-blur"
      style={{ background: `color-mix(in srgb, ${tv.bgOverlay} 80%, transparent)`, borderBottom: `1px solid ${tv.borderBase}` }}
    >
      {SPORTS_SUB_ITEMS.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className="relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background: active ? accentAlpha(0.12) : mutedAlpha(0.04),
              color: active ? tv.accent : tv.textMuted,
              border: active ? `1px solid ${accentAlpha(0.2)}` : `1px solid transparent`,
              minHeight: '32px',
              transition: 'all 200ms ease',
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {active && (
              <span
                className="absolute -bottom-2.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
                style={{ background: tv.accent, boxShadow: `0 0 6px ${tv.accent}` }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
