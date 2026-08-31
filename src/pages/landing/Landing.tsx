import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '@/store/StoreContext';
import { registerMotion, useLenis, prefersReducedMotion } from './motion';
import { LP } from './theme';
import { PillCta } from './PillCta';

function Placeholder({ theme, label }: { theme: 'dark' | 'light'; label: string }) {
  return (
    <section
      data-lp-theme={theme}
      className="flex min-h-screen items-center justify-center"
    >
      <h2
        className="text-5xl font-bold"
        style={{
          color: theme === 'dark' ? LP.textOnDark : LP.inkOnIvory,
          fontFamily: LP.display,
        }}
      >
        {label}
      </h2>
    </section>
  );
}

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
          start: 'top 55%',
          end: 'bottom 45%',
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
      <Placeholder theme="dark" label="Hero" />
      <Placeholder theme="dark" label="Manifesto" />
      <Placeholder theme="light" label="The Terminal" />
      <Placeholder theme="dark" label="Markets Never Sleep" />
      <Placeholder theme="light" label="The Sports Lab" />
      <Placeholder theme="dark" label="Footer" />
      <PillCta />
    </div>
  );
}
