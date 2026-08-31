import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '@/components/navItems';
import { tv } from '@/lib/themeVars';

export function MobileBottomNav() {
  const location = useLocation();

  const items = NAV_ITEMS.map((item) => {
    if (item.children) {
      return { path: '/sports/today', label: item.label, icon: item.icon, matchPrefix: '/sports' };
    }
    return { path: item.path, label: item.label, icon: item.icon, matchPrefix: item.path };
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around lg:hidden"
      style={{ background: tv.bgOverlay, borderTop: `1px solid ${tv.borderBase}`, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map(({ path, label, icon: Icon, matchPrefix }) => {
        const active = matchPrefix === '/sports'
          ? location.pathname.startsWith('/sports')
          : location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className="flex flex-1 flex-col items-center gap-1 py-3"
            style={{ color: active ? tv.accent : tv.textMuted }}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
