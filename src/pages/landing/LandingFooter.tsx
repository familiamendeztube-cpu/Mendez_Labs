import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { registerMotion } from './motion';
import { LP } from './theme';

export function LandingFooter({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      const mark = ref.current!.querySelector('[data-foot-mark]')!;
      const split = SplitText.create(mark, { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, {
        yPercent: 110, stagger: 0.03, duration: 0.9, ease: 'lux',
        scrollTrigger: { trigger: ref.current, start: 'top 70%' },
      });
      // Championship belt drifts up behind the wordmark as the footer scrolls in.
      gsap.fromTo('[data-foot-belt]',
        { yPercent: 30, rotation: -6, opacity: 0 },
        {
          yPercent: -10, rotation: 4, opacity: 0.22, ease: 'none',
          scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true },
        });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={ref}
      data-lp-theme="dark"
      className="relative flex min-h-[70vh] flex-col justify-end overflow-hidden px-[6vw] pb-28 pt-[14vh]"
      style={{ background: `linear-gradient(180deg, ${LP.carbon} 0%, #191410 60%, #120E0A 100%)` }}
    >
      <img
        data-foot-belt
        src="/assets/boxing/belt-cinematic-v2.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-[-6%] top-0 w-[46vw] max-w-[560px] select-none"
        draggable={false}
      />
      <p className="relative z-10 mb-4 text-xs tracking-[0.4em]" style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}>
        PRIVATE INTELLIGENCE TERMINAL — TRADING FIRST, SPORTS LAB SECOND
      </p>
      <h2
        data-foot-mark
        className="relative z-10 font-bold"
        style={{ color: LP.bone, fontFamily: LP.displayHero, fontWeight: 600, fontSize: 'clamp(2.6rem, 9.5vw, 9.5rem)', lineHeight: 1, letterSpacing: '-0.01em' }}
      >
        MENDEZ LABS
      </h2>
      <div
        className="mt-10 flex items-center justify-between pt-6 text-xs"
        style={{ borderTop: `1px solid ${LP.borderDark}`, color: LP.mutedOnDark, fontFamily: LP.mono }}
      >
        <span>© 2026 MENDEZ LABS. BUILT FOR ONE.</span>
        <span style={{ color: LP.champagne }}>PAPER → LIVE</span>
      </div>
    </section>
  );
}
