import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealWords } from './motion';
import { LP } from './theme';

/**
 * Jesko's signature chapter: a top-down jet rises vertically through the
 * section while scrolling — nose in from the bottom, fuselage passing behind
 * the headline, gentle lateral sway and banking, labels entering from the
 * sides. Original SVG artwork (no third-party assets).
 */
export function JetPass({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement>(null);
  const jetRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      revealWords(trackRef.current!.querySelector('[data-jet-head]')!, {
        scrollTrigger: { trigger: trackRef.current, start: 'top 60%' },
      });

      // ── The fly-through: jet rises the full track, swaying and banking ──
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      });
      tl.fromTo(jetRef.current,
        { yPercent: 115 },
        { yPercent: -135, ease: 'none', duration: 1 }, 0)
        .to(jetRef.current, {
          keyframes: {
            x: [0, 22, -16, 12, -6, 0],
            rotation: [0, 1.8, -2.2, 1.4, -0.8, 0],
          },
          ease: 'none',
          duration: 1,
        }, 0);

      // Side entrances — sub-copy from the left, wing labels from each side
      gsap.from('[data-jet-sub]', {
        x: -90, opacity: 0, duration: 1.1, ease: 'lux',
        scrollTrigger: { trigger: trackRef.current, start: 'top 45%' },
      });
      gsap.from('[data-jet-label-l]', {
        x: -70, opacity: 0, duration: 1, ease: 'lux',
        scrollTrigger: { trigger: trackRef.current, start: 'top 30%' },
      });
      gsap.from('[data-jet-label-r]', {
        x: 70, opacity: 0, duration: 1, ease: 'lux',
        scrollTrigger: { trigger: trackRef.current, start: 'top 30%' },
      });
    }, trackRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={trackRef}
      data-lp-theme="light"
      className="relative mx-2 rounded-[2.5rem] lg:mx-4 lg:rounded-[3rem]"
      style={{ background: LP.ivory, height: '320vh' }}
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden rounded-[2.5rem] px-[6vw] lg:rounded-[3rem]">
        {/* Headline — the jet passes in front of it */}
        <h2
          data-jet-head
          className="relative z-10 font-bold"
          style={{
            color: LP.inkOnIvory, fontFamily: LP.display,
            fontSize: 'clamp(3rem, 10vw, 10rem)', lineHeight: 0.95, letterSpacing: '-0.03em',
          }}
        >
          Trade in<br />
          <span className="block text-right">first class</span>
        </h2>

        <p
          data-jet-sub
          className="relative z-30 mt-8 max-w-[16ch] font-semibold"
          style={{ color: LP.inkOnIvory, fontFamily: LP.display, fontSize: 'clamp(1.2rem, 2.4vw, 2rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}
        >
          An edge that moves with you
        </p>

        {/* Wing labels — enter from the sides */}
        <div className="relative z-30 mt-10 flex items-center justify-between border-t pt-5" style={{ borderColor: LP.borderLight }}>
          <span data-jet-label-l className="text-xs font-bold tracking-[0.3em]" style={{ color: LP.inkOnIvory, fontFamily: LP.mono }}>
            ALPACA MARKETS
          </span>
          <span data-jet-label-r className="text-xs font-bold tracking-[0.3em]" style={{ color: LP.inkOnIvory, fontFamily: LP.mono }}>
            LIVE EXECUTION
          </span>
        </div>

        {/* ── The jet (original SVG, top-down) ── */}
        <div
          ref={jetRef}
          className="pointer-events-none absolute left-1/2 top-0 z-20 h-[160vh] w-[min(58vw,520px)] -translate-x-1/2"
          aria-hidden="true"
          style={{ filter: 'drop-shadow(-28px 38px 22px rgba(16,19,18,0.30))' }}
        >
          <svg viewBox="0 0 400 900" className="h-full w-full" preserveAspectRatio="xMidYMin meet">
            <defs>
              <linearGradient id="jet-body" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#D9D1C0" />
                <stop offset="45%" stopColor="#F6F2E9" />
                <stop offset="55%" stopColor="#F6F2E9" />
                <stop offset="100%" stopColor="#CFC6B2" />
              </linearGradient>
              <linearGradient id="jet-wing" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E6DFCE" />
                <stop offset="100%" stopColor="#C2B9A3" />
              </linearGradient>
              <linearGradient id="jet-engine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#B9B09A" />
                <stop offset="50%" stopColor="#DDD5C3" />
                <stop offset="100%" stopColor="#ABA28C" />
              </linearGradient>
            </defs>

            {/* Wings (behind fuselage) */}
            <path d="M214,382 L384,556 Q394,566 390,580 L358,590 L214,514 Z" fill="url(#jet-wing)" />
            <path d="M186,382 L16,556 Q6,566 10,580 L42,590 L186,514 Z" fill="url(#jet-wing)" />
            {/* Wing accent tips */}
            <path d="M384,556 Q394,566 390,580 L370,586 L358,562 Z" fill={LP.gold} opacity="0.55" />
            <path d="M16,556 Q6,566 10,580 L30,586 L42,562 Z" fill={LP.gold} opacity="0.55" />

            {/* Tailplane */}
            <path d="M210,742 L288,812 Q294,818 291,828 L268,834 L210,792 Z" fill="url(#jet-wing)" />
            <path d="M190,742 L112,812 Q106,818 109,828 L132,834 L190,792 Z" fill="url(#jet-wing)" />
            {/* Vertical fin spine (top-down) */}
            <rect x="196" y="700" width="8" height="112" rx="4" fill="#B9B09A" />
            <ellipse cx="200" cy="810" rx="12" ry="7" fill="#CFC6B2" />

            {/* Engine nacelles */}
            <rect x="222" y="648" width="32" height="78" rx="15" fill="url(#jet-engine)" />
            <rect x="146" y="648" width="32" height="78" rx="15" fill="url(#jet-engine)" />
            <ellipse cx="238" cy="652" rx="14" ry="6" fill="#8F8672" />
            <ellipse cx="162" cy="652" rx="14" ry="6" fill="#8F8672" />

            {/* Fuselage */}
            <path
              d="M200,14 C207,14 213,27 215,46 L219,142 C220,300 220,470 217,620 L213,762 C211,804 207,832 200,840 C193,832 189,804 187,762 L183,620 C180,470 180,300 181,142 L185,46 C187,27 193,14 200,14 Z"
              fill="url(#jet-body)"
            />
            {/* Center pinstripe */}
            <rect x="199" y="44" width="2" height="656" fill={LP.gold} opacity="0.5" />
            {/* Cockpit windshield */}
            <path d="M200,56 C209,56 214,66 215,86 L213,106 C205,99 195,99 187,106 L185,86 C186,66 191,56 200,56 Z" fill="#14171A" opacity="0.85" />
            <line x1="200" y1="58" x2="200" y2="102" stroke="#F6F2E9" strokeWidth="1.4" opacity="0.6" />

            {/* Cabin windows */}
            {Array.from({ length: 11 }).map((_, i) => (
              <g key={i}>
                <circle cx="212" cy={172 + i * 42} r="3.2" fill="#14171A" opacity="0.5" />
                <circle cx="188" cy={172 + i * 42} r="3.2" fill="#14171A" opacity="0.5" />
              </g>
            ))}
          </svg>
        </div>

        {/* Closing copy — in front of the jet as it exits */}
        <p
          className="relative z-30 mt-8 max-w-xl text-base leading-relaxed lg:text-lg"
          style={{ color: LP.mutedOnIvory, fontFamily: LP.display }}
        >
          Featuring a risk engine designed to neutralize anything that could
          disrupt your balance — position sizing, daily stops, and drawdown
          pauses, tuned for a single pilot: you.
        </p>
      </div>
    </section>
  );
}
