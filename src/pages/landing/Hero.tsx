import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealWords } from './motion';
import { introAlreadySeen } from './Preloader';
import { LP } from './theme';

export function Hero({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const delay = introAlreadySeen() ? 0.3 : 2.6;
    const ctx = gsap.context(() => {
      // ── Entrance (plays once after preloader) ──
      const upper = trackRef.current!.querySelector('[data-hero-upper]')!;
      const lower = trackRef.current!.querySelector('[data-hero-lower]')!;
      revealWords(upper, { delay });
      revealWords(lower, { delay: delay + 0.2 });
      gsap.from(dialRef.current, {
        opacity: 0, scale: 0.88, duration: 1.8, ease: 'lux', delay: delay - 0.3,
      });
      gsap.from('[data-hero-ring]', {
        scale: 0.7, opacity: 0, stagger: 0.12, duration: 1.4, ease: 'lux', delay,
        transformOrigin: '50% 50%',
      });
      gsap.from('[data-hero-sub]', {
        opacity: 0, y: 14, duration: 0.8, ease: 'lux', delay: delay + 0.6,
      });
      // The pill lives outside this section — query the document, not the
      // scoped context, and pass the element so gsap.context doesn't rescope it.
      const pill = document.querySelector('[data-lp-pill]');
      if (pill) {
        gsap.from(pill, { y: 90, duration: 1, ease: 'lux', delay: delay + 0.8 });
      }

      // ── Continuous instrument motion (idle, not scroll-bound) ──
      gsap.to('[data-hero-ticks]', {
        rotation: 360, duration: 90, ease: 'none', repeat: -1,
        transformOrigin: '50% 50%',
      });
      gsap.to('[data-hero-arc]', {
        rotation: -360, duration: 45, ease: 'none', repeat: -1,
        transformOrigin: '50% 50%',
      });

      // ── Scroll-driven push-through (scrubbed over the 300vh track) ──
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      });
      tl.fromTo(dialRef.current,
        { scale: 1, yPercent: 0 },
        { scale: 1.6, yPercent: -6, ease: 'none', duration: 0.6 }, 0)
        .to(dialRef.current,
          { scale: 3.2, opacity: 0, filter: 'blur(8px)', ease: 'power2.in', duration: 0.4 }, 0.6)
        .to('[data-hero-upper]', { xPercent: -18, opacity: 0, ease: 'none', duration: 0.5 }, 0.25)
        .to('[data-hero-lower]', { xPercent: 18, opacity: 0, ease: 'none', duration: 0.5 }, 0.25)
        .to('[data-hero-glow]', { scale: 2.2, opacity: 0, ease: 'none', duration: 0.5 }, 0.5)
        .to('[data-hero-sub]', { opacity: 0, ease: 'none', duration: 0.2 }, 0.2);
    }, trackRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={trackRef} data-lp-theme="dark" style={{ height: '300vh' }}>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Ambient glow */}
        <div
          data-hero-glow
          className="absolute left-1/2 top-1/2 h-[95vmin] w-[95vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(32,200,120,0.12) 0%, rgba(32,200,120,0.04) 40%, transparent 68%)',
          }}
        />

        {/* Instrument dial — the porthole of the terminal */}
        <div ref={dialRef} className="relative z-10 h-[78vmin] w-[78vmin]">
          <svg viewBox="0 0 600 600" className="h-full w-full" aria-hidden="true">
            {/* Outer bezel */}
            <circle data-hero-ring cx="300" cy="300" r="292" fill="none"
              stroke="rgba(232,226,214,0.14)" strokeWidth="1.5" />
            <circle data-hero-ring cx="300" cy="300" r="272" fill="none"
              stroke="rgba(232,226,214,0.07)" strokeWidth="22" />
            {/* Rotating minute ticks */}
            <g data-hero-ticks>
              <circle cx="300" cy="300" r="246" fill="none"
                stroke="rgba(232,226,214,0.35)" strokeWidth="12"
                strokeDasharray="1.5 23.5" />
            </g>
            {/* Counter-rotating emerald arc */}
            <g data-hero-arc>
              <circle cx="300" cy="300" r="218" fill="none"
                stroke={LP.emerald} strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray="240 1130" opacity="0.9" />
            </g>
            {/* Gold accent arc */}
            <g data-hero-ticks>
              <circle cx="300" cy="300" r="194" fill="none"
                stroke={LP.gold} strokeWidth="1.5" strokeLinecap="round"
                strokeDasharray="60 1160" opacity="0.8" />
            </g>
            {/* Inner rings */}
            <circle data-hero-ring cx="300" cy="300" r="168" fill="none"
              stroke="rgba(232,226,214,0.10)" strokeWidth="1" />
            <circle data-hero-ring cx="300" cy="300" r="120" fill="none"
              stroke="rgba(232,226,214,0.06)" strokeWidth="1" />
            {/* Crosshair center */}
            <line x1="300" y1="288" x2="300" y2="312" stroke="rgba(232,226,214,0.4)" strokeWidth="1" />
            <line x1="288" y1="300" x2="312" y2="300" stroke="rgba(232,226,214,0.4)" strokeWidth="1" />
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[36%]">
            <span
              className="text-[10px] tracking-[0.5em]"
              style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}
            >
              MENDEZ LABS
            </span>
            <span
              className="text-[9px] tracking-[0.45em]"
              style={{ color: 'rgba(138,143,138,0.6)', fontFamily: LP.mono }}
            >
              INTELLIGENCE TERMINAL
            </span>
          </div>
        </div>

        {/* Split headline */}
        <h1
          data-hero-upper
          className="absolute left-[5vw] top-[14vh] z-20 font-bold"
          style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(3rem, 9.2vw, 9.5rem)', lineHeight: 0.92, letterSpacing: '-0.03em' }}
        >
          We are<br />discipline
        </h1>
        <h1
          data-hero-lower
          className="absolute bottom-[16vh] right-[5vw] z-20 text-right font-bold"
          style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(3rem, 9.2vw, 9.5rem)', lineHeight: 0.92, letterSpacing: '-0.03em' }}
        >
          We are<br />edge
        </h1>
        <p
          data-hero-sub
          className="absolute bottom-[16vh] left-1/2 z-20 w-full -translate-x-1/2 px-8 text-center text-xs tracking-[0.35em] lg:bottom-[8vh] lg:w-auto lg:px-0"
          style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}
        >
          TRADING FIRST · SPORTS LAB SECOND
        </p>
      </div>
    </section>
  );
}
