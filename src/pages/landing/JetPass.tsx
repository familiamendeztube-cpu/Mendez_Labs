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
  const jetInnerRef = useRef<HTMLDivElement>(null);

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
      // Pure vertical rise — no lateral sway. Enter timing computed so the
      // nose crosses the bottom edge at track start and the tail clears the
      // top at track end (jet is ~2.15x its own width tall).
      tl.fromTo(jetRef.current,
        { yPercent: 10 },
        { yPercent: -101, ease: 'none', duration: 1 }, 0)
        // 3D pass-under: nose pitches toward the camera on entry, flattens
        // directly overhead, pitches away on exit — with the hull swelling
        // at its closest point.
        .fromTo(jetInnerRef.current,
          { rotateX: 16, scale: 0.94 },
          {
            keyframes: { rotateX: [16, 0, -13], scale: [0.94, 1.07, 0.95] },
            ease: 'none',
            duration: 1,
          }, 0)
        // Specular sheen sliding along the fuselage during the pass.
        .fromTo('[data-jet-sheen]',
          { yPercent: -60 },
          { yPercent: 480, ease: 'none', duration: 1 }, 0);

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
      style={{ background: LP.ivory, height: '420vh' }}
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden rounded-[2.5rem] px-[6vw] lg:rounded-[3rem]">
        {/* Headline — the jet passes in front of it */}
        <h2
          data-jet-head
          className="relative z-10 font-bold"
          style={{
            color: LP.inkOnIvory, fontFamily: LP.displayHero, fontWeight: 600,
            fontSize: 'clamp(2.6rem, 8.5vw, 9rem)', lineHeight: 1.02, letterSpacing: '-0.01em',
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

        {/* ── The jet (original artwork, top-down, Gulfstream proportions) ── */}
        <div
          ref={jetRef}
          className="pointer-events-none absolute left-1/2 top-0 z-20 w-[280vw] max-w-none -translate-x-1/2"
          aria-hidden="true"
          style={{ perspective: '1400px' }}
        >
          <div
            ref={jetInnerRef}
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              filter: 'drop-shadow(-52px 68px 42px rgba(16,19,18,0.34))',
            }}
          >
            {/* Traveling specular sheen — light sliding along the hull */}
            <div
              data-jet-sheen
              className="absolute inset-x-[30%] top-0 h-[22%]"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(255,253,244,0.35) 50%, transparent 100%)',
                mixBlendMode: 'screen',
                zIndex: 2,
              }}
            />
            <svg viewBox="0 0 600 1400" className="h-auto w-full" preserveAspectRatio="xMidYMin meet">
            <defs>
              <linearGradient id="jet-body" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#BFB49B" />
                <stop offset="30%" stopColor="#EDE6D5" />
                <stop offset="50%" stopColor="#F8F4EA" />
                <stop offset="70%" stopColor="#EDE6D5" />
                <stop offset="100%" stopColor="#B8AC92" />
              </linearGradient>
              <linearGradient id="jet-wing" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EAE3D1" />
                <stop offset="60%" stopColor="#CFC5AD" />
                <stop offset="100%" stopColor="#B2A78D" />
              </linearGradient>
              <linearGradient id="jet-engine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#A99F87" />
                <stop offset="45%" stopColor="#E2DAC7" />
                <stop offset="100%" stopColor="#9C9279" />
              </linearGradient>
              <linearGradient id="jet-stab" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DDD5C2" />
                <stop offset="100%" stopColor="#ABA189" />
              </linearGradient>
              <radialGradient id="jet-nose-hl" cx="0.5" cy="0.35" r="0.7">
                <stop offset="0%" stopColor="#FFFDF4" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#FFFDF4" stopOpacity="0" />
              </radialGradient>
              <filter id="jet-soft" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="7" />
              </filter>
            </defs>

            {/* ── Wings (behind fuselage): long, swept, raked tips ── */}
            <path d="M334,560 L548,868 Q560,886 556,906 L544,922 L522,918 L336,752 Z" fill="url(#jet-wing)" />
            <path d="M266,560 L52,868 Q40,886 44,906 L56,922 L78,918 L264,752 Z" fill="url(#jet-wing)" />
            {/* Leading-edge highlights */}
            <path d="M334,560 L548,868 L541,872 L332,572 Z" fill="#FFFDF6" opacity="0.5" />
            <path d="M266,560 L52,868 L59,872 L268,572 Z" fill="#FFFDF6" opacity="0.5" />
            {/* Flap and spoiler panel lines */}
            <path d="M352,618 L512,872" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" fill="none" />
            <path d="M344,682 L468,884" stroke="rgba(0,0,0,0.10)" strokeWidth="1.2" fill="none" />
            <path d="M248,618 L88,872" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" fill="none" />
            <path d="M256,682 L132,884" stroke="rgba(0,0,0,0.10)" strokeWidth="1.2" fill="none" />
            {/* Wing-root ambient occlusion */}
            <path d="M336,566 L336,748 L368,706 Z" fill="#4A4436" opacity="0.20" filter="url(#jet-soft)" />
            <path d="M264,566 L264,748 L232,706 Z" fill="#4A4436" opacity="0.20" filter="url(#jet-soft)" />
            {/* Raked winglets */}
            <path d="M548,868 Q560,886 556,906 L544,922 L536,898 Z" fill="#8F8570" />
            <path d="M52,868 Q40,886 44,906 L56,922 L64,898 Z" fill="#8F8570" />

            {/* ── T-tail horizontal stabilizers ── */}
            <path d="M312,1148 L448,1266 Q456,1274 453,1286 L442,1294 L424,1290 L310,1200 Z" fill="url(#jet-stab)" />
            <path d="M288,1148 L152,1266 Q144,1274 147,1286 L158,1294 L176,1290 L290,1200 Z" fill="url(#jet-stab)" />
            {/* Vertical fin spine + fin tip fairing */}
            <rect x="291" y="1078" width="18" height="196" rx="9" fill="#B0A68D" />
            <ellipse cx="300" cy="1272" rx="20" ry="10" fill="#D6CDBA" />

            {/* ── Rear-mounted engines with pylons ── */}
            <rect x="330" y="962" width="16" height="70" fill="#C4BAA1" />
            <rect x="254" y="962" width="16" height="70" fill="#C4BAA1" />
            <rect x="342" y="944" width="54" height="132" rx="27" fill="url(#jet-engine)" />
            <rect x="204" y="944" width="54" height="132" rx="27" fill="url(#jet-engine)" />
            <ellipse cx="369" cy="950" rx="25" ry="9" fill="#736A56" />
            <ellipse cx="231" cy="950" rx="25" ry="9" fill="#736A56" />
            {/* Fan disks + spinner cones */}
            <ellipse cx="369" cy="950" rx="17" ry="6" fill="#4A4436" />
            <ellipse cx="231" cy="950" rx="17" ry="6" fill="#4A4436" />
            <ellipse cx="369" cy="950" rx="5" ry="2.2" fill="#D9D1BE" />
            <ellipse cx="231" cy="950" rx="5" ry="2.2" fill="#D9D1BE" />
            <ellipse cx="369" cy="1072" rx="20" ry="7" fill="#867D66" />
            <ellipse cx="231" cy="1072" rx="20" ry="7" fill="#867D66" />

            {/* ── Fuselage: slender, long-cabin business jet ── */}
            <path
              d="M300,22
                 C312,22 322,42 326,78 L332,170
                 C335,240 336,420 336,560 L336,860
                 C336,980 332,1090 326,1170
                 C322,1224 312,1256 300,1262
                 C288,1256 278,1224 274,1170
                 C268,1090 264,980 264,860 L264,560
                 C264,420 265,240 268,170 L274,78
                 C278,42 288,22 300,22 Z"
              fill="url(#jet-body)"
            />
            {/* Radome seam + nose highlight */}
            <path d="M300,22 C312,22 322,42 326,78 L274,78 C278,42 288,22 300,22 Z" fill="#F8F4EA" opacity="0.65" />
            <line x1="274" y1="80" x2="326" y2="80" stroke="rgba(0,0,0,0.10)" strokeWidth="1.5" />

            {/* Gold coachlines along both sides */}
            <path d="M271,150 L266,560 L266,860 C266,980 270,1090 276,1166" fill="none" stroke={LP.gold} strokeWidth="2.2" opacity="0.65" />
            <path d="M329,150 L334,560 L334,860 C334,980 330,1090 324,1166" fill="none" stroke={LP.gold} strokeWidth="2.2" opacity="0.65" />

            {/* Embossed fuselage seam rings */}
            {[224, 330, 500, 640, 800, 930, 1060].map((y) => (
              <g key={y}>
                <line x1="266" y1={y} x2="334" y2={y} stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
                <line x1="266" y1={y + 2} x2="334" y2={y + 2} stroke="rgba(0,0,0,0.10)" strokeWidth="1.2" />
              </g>
            ))}
            {/* Nose radome highlight */}
            <ellipse cx="300" cy="62" rx="24" ry="42" fill="url(#jet-nose-hl)" />

            {/* Cockpit windshield (four-pane) */}
            <path d="M300,92 C315,92 323,106 325,132 L322,158 C308,148 292,148 278,158 L275,132 C277,106 285,92 300,92 Z" fill="#12151A" opacity="0.9" />
            <line x1="300" y1="94" x2="300" y2="152" stroke="#F8F4EA" strokeWidth="2" opacity="0.7" />
            <line x1="288" y1="98" x2="284" y2="150" stroke="#F8F4EA" strokeWidth="1.4" opacity="0.5" />
            <line x1="312" y1="98" x2="316" y2="150" stroke="#F8F4EA" strokeWidth="1.4" opacity="0.5" />

            {/* Main cabin door outline */}
            <rect x="269" y="196" width="17" height="52" rx="6" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1.5" />

            {/* Cabin windows — two long rows */}
            {Array.from({ length: 16 }).map((_, i) => (
              <g key={i}>
                <ellipse cx="277" cy={286 + i * 40} rx="4" ry="5.5" fill="#14171A" opacity="0.55" />
                <ellipse cx="323" cy={286 + i * 40} rx="4" ry="5.5" fill="#14171A" opacity="0.55" />
              </g>
            ))}

            {/* Center spine highlight */}
            <rect x="297" y="90" width="6" height="1080" rx="3" fill="#FFFDF6" opacity="0.35" />
            </svg>
          </div>
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
