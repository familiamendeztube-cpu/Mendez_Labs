import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '@/store/StoreContext';
import { registerMotion, useLenis, prefersReducedMotion } from './motion';
import { LP } from './theme';
import { PillCta } from './PillCta';
import { Preloader } from './Preloader';
import { LandingHeader } from './LandingHeader';
import { Hero } from './Hero';
import { Manifesto } from './Manifesto';
import { JetPass } from './JetPass';
import { TerminalShowcase } from './TerminalShowcase';
import { MarketSessions } from './MarketSessions';
import { SportsLab } from './SportsLab';
import { LandingFooter } from './LandingFooter';

export function Landing() {
  const { settings } = useStore();
  const reduced = prefersReducedMotion(settings.reducedMotion);
  useLenis(!reduced);
  const rootRef = useRef<HTMLDivElement>(null);

  // ── Animated theme: root background crossfades as sections enter ──
  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      const THEME_BG: Record<string, string> = {
        dark: LP.carbon,
        light: LP.ivory,
        sky: LP.skyMid,
      };
      gsap.utils.toArray<HTMLElement>('[data-lp-theme]').forEach((sec) => {
        const bg = THEME_BG[sec.dataset.lpTheme ?? 'dark'] ?? LP.carbon;
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 35%',
          end: 'bottom 65%',
          onToggle: (self) => {
            if (self.isActive) {
              gsap.to(rootRef.current, {
                backgroundColor: bg,
                duration: 1.4,
                ease: 'power1.inOut',
                overwrite: 'auto',
              });
            }
          },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div
      ref={rootRef}
      className="relative"
      style={{ backgroundColor: LP.carbon, overflowX: 'clip' }}
    >
      {/* Ambient light — one cold high-altitude wash, kept faint. Restraint is
          the whole point of this palette; it should read as air, not colour. */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(1200px 640px at 50% -8%, rgba(143,182,218,0.09), transparent 62%), radial-gradient(900px 500px at 88% 104%, rgba(143,182,218,0.05), transparent 55%)',
        }}
      />
      <Preloader reduced={reduced} />
      <LandingHeader reduced={reduced} />
      <Hero reduced={reduced} />
      <Manifesto reduced={reduced} />
      <JetPass reduced={reduced} />
      <TerminalShowcase reduced={reduced} />
      <MarketSessions reduced={reduced} />
      <SportsLab reduced={reduced} />
      <LandingFooter reduced={reduced} />
      <PillCta />
    </div>
  );
}
