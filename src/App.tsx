import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { StoreProvider, useStore } from '@/store/StoreContext';
import { Entrance } from '@/pages/Entrance';
import { Landing } from '@/pages/landing/Landing';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SportsSubNav } from '@/components/SportsSubNav';
import { DataRainBackground } from '@/components/DataRainBackground';
import { TradingDashboard } from '@/pages/TradingDashboard';
import { Signals } from '@/pages/Signals';
import { PaperPortfolio } from '@/pages/PaperPortfolio';
import { Performance } from '@/pages/Performance';
import { Today } from '@/pages/Today';
import { PickFive } from '@/pages/PickFive';
import { Results } from '@/pages/Results';
import { Bankroll } from '@/pages/Bankroll';
import { Settings } from '@/pages/Settings';

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isSportsRoute = location.pathname.startsWith('/sports');

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen grain-overlay">
      <DataRainBackground />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className={`flex flex-1 flex-col min-w-0 ${collapsed ? 'lg:ml-16' : 'lg:ml-56'}`}>
          <TopBar onOpenSidebar={() => setMobileOpen(true)} />
          {isSportsRoute && <SportsSubNav />}
          <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6">
            <Routes>
              {/* Trading-first routes */}
              <Route path="/dashboard" element={<TradingDashboard />} />
              <Route path="/signals" element={<Signals />} />
              <Route path="/portfolio" element={<PaperPortfolio />} />
              <Route path="/performance" element={<Performance />} />

              {/* Sports Lab routes */}
              <Route path="/sports/today" element={<Today />} />
              <Route path="/sports/pick-five" element={<PickFive />} />
              <Route path="/sports/results" element={<Results />} />
              <Route path="/sports/bankroll" element={<Bankroll />} />
              <Route path="/sports" element={<Navigate to="/sports/today" replace />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings />} />

              {/* Backward-compat redirects from old routes */}
              <Route path="/trading" element={<Navigate to="/dashboard" replace />} />
              <Route path="/pick-five" element={<Navigate to="/sports/pick-five" replace />} />
              <Route path="/results" element={<Navigate to="/sports/results" replace />} />
              <Route path="/bankroll" element={<Navigate to="/sports/bankroll" replace />} />

              {/* Default + catch-all → trading dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}

function AppContent() {
  const { authenticated, authLoading } = useStore();
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: '#030403' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#36D67E', borderTopColor: 'transparent' }} />
          <span className="text-sm" style={{ color: '#A3ABA6' }}>Loading...</span>
        </div>
      </div>
    );
  }
  if (!authenticated) {
    // TEMP: preview route for the new landing page (removed in final cutover task)
    if (window.location.hash.includes('landing-preview')) return <Landing />;
    return <Entrance />;
  }
  return <AppLayout />;
}

export default function App() {
  return (
    <HashRouter>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </HashRouter>
  );
}
