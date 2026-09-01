import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealChars } from './motion';
import { introAlreadySeen } from './Preloader';
import { HeroBackdrop } from './HeroBackdrop';
import { LP } from './theme';

/**
 * Hero: the cabin-window moment. A dark cabin wall around an airplane
 * window looking out on sky; the brand sits across the glass, the split
 * headline around it. Scrolling pushes the camera into the window until
 * the sky takes over and hands off to the next chapter.
 */
export function Hero({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const delay = introAlreadySeen() ? 0.3 : 2.6;
    const ctx = gsap.context(() => {
      // ── Entrance ──
      const upper = trackRef.current!.querySelector('[data-hero-upper]')!;
      const lower = trackRef.current!.querySelector('[data-hero-lower]')!;
      revealChars(upper, { delay });
      revealChars(lower, { delay: delay + 0.25 });
      gsap.from(windowRef.current, {
        opacity: 0, scale: 0.92, duration: 1.8, ease: 'lux', delay: delay - 0.3,
      });
      gsap.from('[data-hero-mark]', {
        opacity: 0, letterSpacing: '0.6em', duration: 1.6, ease: 'lux', delay: delay + 0.4,
      });
      const pill = document.querySelector('[data-lp-pill]');
      if (pill) {
        gsap.from(pill, { y: 90, duration: 1, ease: 'lux', delay: delay + 0.8 });
      }

      // ── Idle: clouds drift past the window ──
      gsap.to('[data-hero-cloud-a]', {
        xPercent: 60, duration: 26, ease: 'none', repeat: -1, yoyo: true,
      });
      gsap.to('[data-hero-cloud-b]', {
        xPercent: -45, duration: 34, ease: 'none', repeat: -1, yoyo: true,
      });

      // ── Scroll: camera pushes into the window until sky takes over ──
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      });
      tl.fromTo(windowRef.current,
        { scale: 1 },
        { scale: 1.9, ease: 'none', duration: 0.6 }, 0)
        .to(windowRef.current,
          { scale: 4.4, opacity: 0, filter: 'blur(7px)', ease: 'power2.in', duration: 0.4 }, 0.6)
        // The hero stays dark on the way out; the manifesto's own gradient
        // opens on this exact carbon and climbs to sky — one direction, no
        // sky→dark→sky valley.
        .to('[data-hero-mark]', { opacity: 0, ease: 'none', duration: 0.25 }, 0.35)
        .to('[data-hero-upper]', { xPercent: -18, opacity: 0, ease: 'none', duration: 0.5 }, 0.25)
        .to('[data-hero-lower]', { xPercent: 18, opacity: 0, ease: 'none', duration: 0.5 }, 0.25);
    }, trackRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={trackRef} data-lp-theme="dark" style={{ height: '300vh' }}>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <HeroBackdrop reduced={reduced} />


        {/* ── The cabin window ── */}
        <div
          ref={windowRef}
          className="relative z-10 flex items-center justify-center"
          style={{ height: '74vmin', width: '56vmin' }}
        >
          {/* Outer surround — bone cabin lining with soft depth */}
          <div
            className="absolute inset-0"
            style={{
              borderRadius: '28vmin',
              background: `linear-gradient(145deg, ${LP.bone} 0%, #CFC8B8 55%, #A79F8D 100%)`,
              boxShadow: '0 0 120px rgba(232,226,214,0.08), inset 0 6px 24px rgba(255,255,255,0.5), inset 0 -14px 34px rgba(16,19,18,0.35)',
            }}
          />
          {/* Bevel crease */}
          <div
            className="absolute"
            style={{
              inset: '5.5%',
              borderRadius: '24vmin',
              background: 'linear-gradient(160deg, #8F8875 0%, #C8C1B0 45%, #EFEADD 100%)',
              boxShadow: 'inset 0 4px 14px rgba(16,19,18,0.4)',
            }}
          />
          {/* Sky pane */}
          <div
            className="absolute overflow-hidden"
            style={{
              inset: '9%',
              borderRadius: '20vmin',
              background: `linear-gradient(180deg, ${LP.skyTop} 0%, ${LP.skyBottom} 70%, #A9C2D8 100%)`,
              boxShadow: 'inset 0 10px 30px rgba(16,19,18,0.35)',
            }}
          >
            {/* Drifting clouds */}
            <div
              data-hero-cloud-a
              className="absolute left-[-30%] top-[30%] h-[22%] w-[90%]"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 70%)',
                filter: 'blur(6px)',
              }}
            />
            <div
              data-hero-cloud-b
              className="absolute left-[10%] top-[62%] h-[16%] w-[70%]"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)',
                filter: 'blur(8px)',
              }}
            />
            {/* Glass reflection streak */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.28) 46%, rgba(255,255,255,0.06) 55%, transparent 62%)',
              }}
            />
          </div>
          {/* Brand across the glass */}
          <span
            data-hero-mark
            className="relative z-10 text-center font-semibold"
            style={{
              color: 'rgba(250,252,254,0.92)',
              fontFamily: LP.displayHero,
              fontSize: 'clamp(1.4rem, 4.2vmin, 2.6rem)',
              letterSpacing: '0.22em',
              textShadow: '0 2px 18px rgba(30,43,56,0.35)',
            }}
          >
            Mendez Labs
          </span>
        </div>

        {/* Split headline — oversized, tight, char-revealed */}
        <h1
          data-hero-upper
          className="absolute left-[4vw] top-[11vh] z-20 font-bold"
          style={{ color: '#FDFBF6', fontFamily: LP.displayHero, fontWeight: 600, fontSize: 'clamp(2.6rem, 7.8vw, 8.4rem)', lineHeight: 0.96, letterSpacing: '-0.025em' }}
        >
          We are<br />discipline
        </h1>
        <h1
          data-hero-lower
          className="absolute bottom-[13vh] right-[5vw] z-20 max-w-[92vw] text-right font-bold"
          style={{ color: '#FDFBF6', fontFamily: LP.displayHero, fontWeight: 600, fontSize: 'clamp(2.6rem, 7.8vw, 8.4rem)', lineHeight: 0.96, letterSpacing: '-0.025em' }}
        >
          We are<br />edge
        </h1>
      </div>
    </section>
  );
}
