import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { LogoutModal } from '@/components/LogoutModal';
import { NAV_ITEMS } from '@/components/navItems';
import { tv, accentAlpha, redAlpha, mutedAlpha } from '@/lib/themeVars';

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const location = useLocation();
  const { signOut } = useStore();
  const [showLogout, setShowLogout] = useState(false);
  const [sportsOpen, setSportsOpen] = useState(location.pathname.startsWith('/sports'));

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-full transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: '#080A09', borderRight: `1px solid ${tv.borderBase}` }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4" onClick={onToggle} style={{ cursor: 'pointer' }}>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: accentAlpha(0.12), border: `1px solid ${accentAlpha(0.3)}` }}
          >
            <span className="serif text-base font-bold" style={{ color: tv.accent }}>M</span>
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-wider" style={{ color: tv.textPrimary }}>
              MENDEZ LABS
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="mt-4 space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const { path, label, icon: Icon, children } = item;

            if (children) {
              const isChildActive = children.some((c) => location.pathname === c.path);
              const isParentActive = location.pathname.startsWith(path);
              const open = sportsOpen || isParentActive;

              return (
                <div key={path}>
                  <button
                    onClick={() => setSportsOpen(!sportsOpen)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    style={{
                      background: isParentActive ? accentAlpha(0.08) : 'transparent',
                      color: isParentActive ? tv.accent : tv.textMuted,
                    }}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{label}</span>
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </>
                    )}
                  </button>
                  {!collapsed && open && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l" style={{ borderColor: tv.borderBase }}>
                      {children.map((child) => {
                        const childActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                            style={{
                              background: childActive ? accentAlpha(0.08) : 'transparent',
                              color: childActive ? tv.accent : tv.textMuted,
                              boxShadow: childActive ? `inset 3px 0 0 ${tv.accent}` : undefined,
                              transition: 'all 180ms ease',
                            }}
                          >
                            <child.icon className="h-4 w-4 shrink-0" />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center' : ''
                }`}
                style={{
                  background: active ? accentAlpha(0.08) : 'transparent',
                  color: active ? tv.accent : tv.textMuted,
                  boxShadow: active ? `inset 3px 0 0 ${tv.accent}` : undefined,
                  transition: 'all 180ms ease',
                }}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Log Out */}
        <div className="absolute bottom-16 left-0 right-0 px-2">
          <button
            onClick={() => setShowLogout(true)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            style={{ color: tv.statusRed, border: `1px solid ${redAlpha(0.15)}` }}
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>

        {!collapsed && (
          <div className="absolute bottom-4 left-0 right-0 px-4">
            <p className="text-xs" style={{ color: mutedAlpha(0.5) }}>
              Paper trading · Research only
            </p>
          </div>
        )}
      </aside>

      <LogoutModal
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={() => { setShowLogout(false); signOut(); }}
      />
    </>
  );
}
