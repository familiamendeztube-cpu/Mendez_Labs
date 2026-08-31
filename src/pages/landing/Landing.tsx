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
      gsap.utils.toArray<HTMLElement>('[data-lp-theme]').forEach((sec) => {
        const dark = sec.dataset.lpTheme === 'dark';
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 35%',
          end: 'bottom 65%',
          onToggle: (self) => {
            if (self.isActive) {
              gsap.to(rootRef.current, {
                backgroundColor: dark ? LP.carbon : LP.ivory,
                duration: 0.8,
                ease: 'power2.out',
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
      <Preloader reduced={reduced} />
      <LandingHeader reduced={reduced} />
      <Hero reduced={reduced} />
      <Manifesto reduced={reduced} />
      <TerminalShowcase reduced={reduced} />
      <MarketSessions reduced={reduced} />
      <SportsLab reduced={reduced} />
      <LandingFooter reduced={reduced} />
      <PillCta />
    </div>
  );
}
