import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealLines } from './motion';
import { introAlreadySeen } from './Preloader';
import { LP } from './theme';

export function Hero({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement>(null);
  const fighterRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const delay = introAlreadySeen() ? 0.3 : 2.6;
    const ctx = gsap.context(() => {
      // ── Entrance (plays once after preloader) ──
      const upper = trackRef.current!.querySelector('[data-hero-upper]')!;
      const lower = trackRef.current!.querySelector('[data-hero-lower]')!;
      revealLines(upper, { delay });
      revealLines(lower, { delay: delay + 0.15 });
      gsap.from(fighterRef.current, {
        opacity: 0, scale: 1.06, duration: 1.6, ease: 'lux', delay: delay - 0.2,
      });
      gsap.from('[data-hero-sub]', {
        opacity: 0, y: 14, duration: 0.8, ease: 'lux', delay: delay + 0.6,
      });
      gsap.from('[data-lp-pill]', {
        y: 90, duration: 1, ease: 'lux', delay: delay + 0.8,
      });

      // ── Scroll-driven push-in (scrubbed over the 300vh track) ──
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      });
      tl.fromTo(fighterRef.current,
        { scale: 1, yPercent: 0, filter: 'brightness(0.9)' },
        { scale: 1.55, yPercent: -8, filter: 'brightness(1.15)', ease: 'none', duration: 0.6 }, 0)
        .to(fighterRef.current,
          { scale: 2.4, yPercent: -20, opacity: 0, filter: 'brightness(2) blur(6px)', ease: 'power2.in', duration: 0.4 }, 0.6)
        .to('[data-hero-upper]', { xPercent: -18, opacity: 0, ease: 'none', duration: 0.5 }, 0.25)
        .to('[data-hero-lower]', { xPercent: 18, opacity: 0, ease: 'none', duration: 0.5 }, 0.25)
        .to('[data-hero-spot]', { scale: 1.8, opacity: 0, ease: 'none', duration: 0.5 }, 0.5)
        .to('[data-hero-sub]', { opacity: 0, ease: 'none', duration: 0.2 }, 0.2);
    }, trackRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={trackRef} data-lp-theme="dark" style={{ height: '300vh' }}>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Ring spotlight */}
        <div
          data-hero-spot
          className="absolute left-1/2 top-1/2 h-[85vmin] w-[85vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(32,200,120,0.10) 0%, rgba(32,200,120,0.03) 45%, transparent 70%)`,
            border: `1px solid ${LP.borderDark}`,
          }}
        />
        {/* Fighter */}
        <div ref={fighterRef} className="relative z-10 h-[72vh] w-auto">
          <img
            src="/assets/boxing/fighter-cinematic.webp"
            alt="Boxer in fighting stance under a ring spotlight"
            className="h-full w-auto object-contain"
            draggable={false}
          />
        </div>
        {/* Split headline */}
        <h1
          data-hero-upper
          className="absolute left-[6vw] top-[16vh] z-20 font-bold leading-[0.95]"
          style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(2.4rem, 7vw, 7rem)' }}
        >
          We are<br />discipline
        </h1>
        <h1
          data-hero-lower
          className="absolute bottom-[18vh] right-[6vw] z-20 text-right font-bold leading-[0.95]"
          style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(2.4rem, 7vw, 7rem)' }}
        >
          We are<br />edge
        </h1>
        <p
          data-hero-sub
          className="absolute bottom-[16vh] left-1/2 z-20 w-full -translate-x-1/2 px-8 text-center text-xs tracking-[0.35em] lg:bottom-[8vh] lg:w-auto lg:px-0"
          style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}
        >
          A PRIVATE TRADING TERMINAL · BUILT LIKE A FIGHTER
        </p>
      </div>
    </section>
  );
}
