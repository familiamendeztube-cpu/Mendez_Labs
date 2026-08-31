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
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={ref} data-lp-theme="dark" className="flex min-h-[70vh] flex-col justify-end px-[6vw] pb-28 pt-[14vh]">
      <p className="mb-4 text-xs tracking-[0.4em]" style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}>
        PRIVATE INTELLIGENCE TERMINAL — TRADING FIRST, SPORTS LAB SECOND
      </p>
      <h2
        data-foot-mark
        className="font-bold leading-[0.95]"
        style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(3rem, 12vw, 11rem)' }}
      >
        MENDEZ LABS
      </h2>
      <div
        className="mt-10 flex items-center justify-between pt-6 text-xs"
        style={{ borderTop: `1px solid ${LP.borderDark}`, color: LP.mutedOnDark, fontFamily: LP.mono }}
      >
        <span>© 2026 MENDEZ LABS. BUILT FOR ONE.</span>
        <span style={{ color: LP.emerald }}>PAPER → LIVE</span>
      </div>
    </section>
  );
}
