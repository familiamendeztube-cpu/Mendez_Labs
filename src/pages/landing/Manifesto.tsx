import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { registerMotion } from './motion';
import { FloatingChips } from './FloatingChips';
import { LP } from './theme';

const COPY =
  'The market is a fight. Every session, someone takes a hit. The ones left standing are never the fastest — they are the best prepared. Mendez Labs is a private intelligence terminal built on one belief: train harder than the market moves.';

export function Manifesto({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      const el = ref.current!.querySelector('[data-manifesto]')!;
      const split = SplitText.create(el, { type: 'lines' });
      // Each line brightens from muted to full as it crosses the viewport center.
      split.lines.forEach((line) => {
        gsap.fromTo(line,
          { color: 'rgba(250,252,254,0.30)' },
          {
            color: LP.textOnSky,
            ease: 'none',
            scrollTrigger: { trigger: line, start: 'top 75%', end: 'top 45%', scrub: true },
          });
      });
      gsap.from('[data-manifesto-tag]', {
        opacity: 0, y: 12, duration: 0.8, ease: 'lux',
        scrollTrigger: { trigger: ref.current, start: 'top 70%' },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={ref}
      data-lp-theme="sky"
      className="relative mx-2 flex min-h-screen items-center overflow-hidden rounded-[2.5rem] px-[6vw] py-[20vh] lg:mx-4 lg:rounded-[3rem]"
      style={{ background: `linear-gradient(180deg, ${LP.skyTop} 0%, ${LP.skyBottom} 100%)` }}
    >
      <FloatingChips
        tone="sky"
        chips={[
          { label: 'SPY · NYSE', top: '12%', right: '8%', speed: 55 },
          { label: 'QQQ · NASDAQ', top: '70%', left: '4%', speed: 35, blur: true },
          { label: 'ES · CME', top: '30%', left: '10%', speed: 70, blur: true },
          { label: 'GC · COMEX', top: '82%', right: '14%', speed: 45 },
        ]}
      />
      <div className="relative z-10 mx-auto max-w-6xl">
        <p data-manifesto-tag className="mb-8 text-xs font-bold tracking-[0.4em]" style={{ color: 'rgba(250,252,254,0.75)', fontFamily: LP.mono }}>
          01 — THE PHILOSOPHY
        </p>
        <p
          data-manifesto
          className="font-semibold"
          style={{ color: LP.textOnSky, fontFamily: LP.display, fontSize: 'clamp(1.9rem, 4.6vw, 4.4rem)', lineHeight: 1.12, letterSpacing: '-0.025em' }}
        >
          {COPY}
        </p>
        <p className="mt-10 text-sm font-bold tracking-widest" style={{ color: LP.textOnSky, fontFamily: LP.mono }}>
          STUDY. SIZE THE RISK. STRIKE ONCE.
        </p>
      </div>
    </section>
  );
}
