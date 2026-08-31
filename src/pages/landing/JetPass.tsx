import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealWords } from './motion';
import { LP } from './theme';

/**
 * The signature chapter: a supersonic delta jet rises vertically through the
 * section while scrolling — 3D perspective pitch, hull swell at the closest
 * point, traveling specular sheen. Original artwork (Concorde-class
 * geometry: needle fuselage, ogival delta wing, paired engine boxes,
 * pointed tail cone); lighting is consistent from the upper-left.
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

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      });
      // Pure vertical rise; nose crosses the bottom edge at track start,
      // tail clears the top at track end.
      tl.fromTo(jetRef.current,
        { yPercent: 10 },
        { yPercent: -101, ease: 'none', duration: 1 }, 0)
        // 3D pass-under: pitch toward camera, flatten overhead, pitch away.
        .fromTo(jetInnerRef.current,
          { rotateX: 16, scale: 0.94 },
          {
            keyframes: { rotateX: [16, 0, -13], scale: [0.94, 1.07, 0.95] },
            ease: 'none',
            duration: 1,
          }, 0)
        // Specular sheen sliding along the hull during the pass.
        .fromTo('[data-jet-sheen]',
          { yPercent: -60 },
          { yPercent: 480, ease: 'none', duration: 1 }, 0);

      // Side entrances
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
        <h2
          data-jet-head
          className="relative z-10 font-semibold"
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

        <div className="relative z-30 mt-10 flex items-center justify-between border-t pt-5" style={{ borderColor: LP.borderLight }}>
          <span data-jet-label-l className="text-xs font-bold tracking-[0.3em]" style={{ color: LP.inkOnIvory, fontFamily: LP.mono }}>
            ALPACA MARKETS
          </span>
          <span data-jet-label-r className="text-xs font-bold tracking-[0.3em]" style={{ color: LP.inkOnIvory, fontFamily: LP.mono }}>
            LIVE EXECUTION
          </span>
        </div>

        {/* ── The jet (original supersonic-delta artwork; sun upper-left) ── */}
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
            <div
              data-jet-sheen
              className="absolute inset-x-[30%] top-0 h-[22%]"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                mixBlendMode: 'screen',
                zIndex: 2,
              }}
            />
            <svg viewBox="0 0 600 1400" className="h-auto w-full" preserveAspectRatio="xMidYMin meet">
              <defs>
                <linearGradient id="jp-fuse" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8E9092" />
                  <stop offset="10%" stopColor="#BCBEBF" />
                  <stop offset="30%" stopColor="#F0F2F2" />
                  <stop offset="44%" stopColor="#FFFFFF" />
                  <stop offset="56%" stopColor="#F6F7F7" />
                  <stop offset="76%" stopColor="#D2D4D3" />
                  <stop offset="100%" stopColor="#898B8D" />
                </linearGradient>
                <linearGradient id="jp-wing-r" x1="0" y1="0" x2="1" y2="0.35">
                  <stop offset="0%" stopColor="#F2F4F3" />
                  <stop offset="45%" stopColor="#DDDFDE" />
                  <stop offset="100%" stopColor="#A9ACAD" />
                </linearGradient>
                <linearGradient id="jp-wing-l" x1="1" y1="0" x2="0" y2="0.35">
                  <stop offset="0%" stopColor="#FAFBFA" />
                  <stop offset="45%" stopColor="#E6E8E7" />
                  <stop offset="100%" stopColor="#B3B6B7" />
                </linearGradient>
                <linearGradient id="jp-eng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3A3D40" />
                  <stop offset="25%" stopColor="#5C5F62" />
                  <stop offset="100%" stopColor="#2A2C2F" />
                </linearGradient>
                <linearGradient id="jp-glass" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0C1118" />
                  <stop offset="60%" stopColor="#1D2B3C" />
                  <stop offset="100%" stopColor="#3E5A78" />
                </linearGradient>
                <radialGradient id="jp-nose" cx="0.42" cy="0.3" r="0.75">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </radialGradient>
                <filter id="jp-soft" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
                <filter id="jp-softer" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="13" />
                </filter>
              </defs>

              {/* ── Ogival delta wings ── */}
              <path
                d="M316,455
                   C328,585 362,715 428,830
                   C482,925 534,1005 554,1052
                   Q561,1072 559,1094 L548,1112
                   L522,1116 L318,1152 Z"
                fill="url(#jp-wing-r)"
              />
              <path
                d="M284,455
                   C272,585 238,715 172,830
                   C118,925 66,1005 46,1052
                   Q39,1072 41,1094 L52,1112
                   L78,1116 L282,1152 Z"
                fill="url(#jp-wing-l)"
              />
              {/* Polished leading edges along the ogival curve */}
              <path d="M316,455 C328,585 362,715 428,830 C482,925 534,1005 554,1052 L548,1058 C527,1010 476,930 422,836 C357,722 323,590 311,458 Z" fill="#FFFFFF" opacity="0.8" />
              <path d="M284,455 C272,585 238,715 172,830 C118,925 66,1005 46,1052 L52,1058 C73,1010 124,930 178,836 C243,722 277,590 289,458 Z" fill="#FFFFFF" opacity="0.9" />
              {/* Elevon hinge lines along the trailing edge */}
              <path d="M340,1148 L352,1094" stroke="rgba(30,34,38,0.16)" strokeWidth="1.4" fill="none" />
              <path d="M300,1152 L470,1116" stroke="rgba(30,34,38,0.10)" strokeWidth="1.2" fill="none" />
              <path d="M260,1148 L248,1094" stroke="rgba(30,34,38,0.16)" strokeWidth="1.4" fill="none" />
              <path d="M300,1152 L130,1116" stroke="rgba(30,34,38,0.10)" strokeWidth="1.2" fill="none" />
              {/* Fuselage shadow cast onto the right wing (sun upper-left) */}
              <path d="M318,520 L392,760 L344,820 L318,700 Z" fill="#2A2D30" opacity="0.20" filter="url(#jp-softer)" />
              {/* Wing-root ambient occlusion */}
              <path d="M316,520 L316,1120 L336,1080 L330,620 Z" fill="#2A2D30" opacity="0.16" filter="url(#jp-soft)" />
              <path d="M284,520 L284,1120 L264,1080 L270,620 Z" fill="#2A2D30" opacity="0.11" filter="url(#jp-soft)" />

              {/* ── Paired engine boxes under each wing, at the trailing edge ── */}
              {/* Right pair */}
              <rect x="348" y="1078" width="44" height="76" rx="5" fill="url(#jp-eng)" />
              <rect x="396" y="1078" width="44" height="76" rx="5" fill="url(#jp-eng)" />
              <rect x="352" y="1082" width="36" height="10" rx="3" fill="#0F1113" />
              <rect x="400" y="1082" width="36" height="10" rx="3" fill="#0F1113" />
              <line x1="370" y1="1098" x2="370" y2="1148" stroke="rgba(255,255,255,0.16)" strokeWidth="1.4" />
              <line x1="418" y1="1098" x2="418" y2="1148" stroke="rgba(255,255,255,0.16)" strokeWidth="1.4" />
              {/* Left pair */}
              <rect x="160" y="1078" width="44" height="76" rx="5" fill="url(#jp-eng)" />
              <rect x="208" y="1078" width="44" height="76" rx="5" fill="url(#jp-eng)" />
              <rect x="164" y="1082" width="36" height="10" rx="3" fill="#0F1113" />
              <rect x="212" y="1082" width="36" height="10" rx="3" fill="#0F1113" />
              <line x1="182" y1="1098" x2="182" y2="1148" stroke="rgba(255,255,255,0.16)" strokeWidth="1.4" />
              <line x1="230" y1="1098" x2="230" y2="1148" stroke="rgba(255,255,255,0.16)" strokeWidth="1.4" />

              {/* ── Tail fin (top-view spine) ── */}
              <path d="M300,1128 L307,1298 L300,1312 L293,1298 Z" fill="#A6A9AA" />
              <path d="M300,1128 L303.5,1298 L300,1312 Z" fill="#CFD1D0" />

              {/* ── Needle fuselage with pointed tail cone ── */}
              <path
                d="M300,26
                   C304,26 307,38 308.5,62 L311,150
                   C313,240 315,330 316,440 L316,1000
                   C316,1090 312,1180 308,1250
                   C305,1300 302,1340 300,1352
                   C298,1340 295,1300 292,1250
                   C288,1180 284,1090 284,1000 L284,440
                   C285,330 287,240 289,150 L291.5,62
                   C293,38 296,26 300,26 Z"
                fill="url(#jp-fuse)"
              />
              {/* Nose probe */}
              <rect x="299" y="6" width="2" height="22" rx="1" fill="#7E8082" />
              {/* Curvature AO along both hull edges */}
              <path d="M288,160 C286,420 285,800 291,1240 L286,1240 C280,800 281,420 283,160 Z" fill="#1E2124" opacity="0.10" filter="url(#jp-soft)" />
              <path d="M312,160 C314,420 315,800 309,1240 L314,1240 C320,800 319,420 317,160 Z" fill="#1E2124" opacity="0.15" filter="url(#jp-soft)" />
              {/* Long gloss line (specular, left of the spine) */}
              <path d="M294,110 C291,420 291,800 295,1230" stroke="#FFFFFF" strokeWidth="5" opacity="0.6" fill="none" filter="url(#jp-soft)" />
              {/* Faint sky-reflection band right of the spine */}
              <path d="M306,130 C309,420 309,760 305,1180" stroke="#A8C4DB" strokeWidth="6" opacity="0.22" fill="none" filter="url(#jp-soft)" />
              {/* Radome seam + nose highlight */}
              <line x1="291" y1="150" x2="309" y2="150" stroke="rgba(20,23,26,0.18)" strokeWidth="1.2" />
              <ellipse cx="298" cy="70" rx="10" ry="34" fill="url(#jp-nose)" />

              {/* Gold coachlines along both sides */}
              <path d="M289,180 L285,440 L285,1000 C285,1090 289,1180 293,1246" fill="none" stroke={LP.gold} strokeWidth="1.8" opacity="0.8" />
              <path d="M311,180 L315,440 L315,1000 C315,1090 311,1180 307,1246" fill="none" stroke={LP.gold} strokeWidth="1.8" opacity="0.7" />

              {/* Embossed seam rings */}
              {[260, 420, 620, 830, 1010].map((y) => (
                <g key={y}>
                  <line x1="286" y1={y} x2="314" y2={y} stroke="rgba(255,255,255,0.5)" strokeWidth="0.9" />
                  <line x1="286" y1={y + 2} x2="314" y2={y + 2} stroke="rgba(20,23,26,0.13)" strokeWidth="1" />
                </g>
              ))}

              {/* Cockpit — slender visor glazing far forward */}
              <path d="M300,168 C306,168 309,174 310,186 L308,204 C303,199 297,199 292,204 L290,186 C291,174 294,168 300,168 Z" fill="url(#jp-glass)" />
              <path d="M294,172 L305,170 L300,190 L292,192 Z" fill="#DCE9F4" opacity="0.45" />
              <line x1="300" y1="170" x2="300" y2="200" stroke="#E9ECEF" strokeWidth="1.2" opacity="0.85" />

              {/* Cabin door */}
              <rect x="287" y="236" width="9" height="34" rx="4" fill="none" stroke="rgba(20,23,26,0.22)" strokeWidth="1.2" />

              {/* Tiny supersonic cabin windows */}
              {Array.from({ length: 15 }).map((_, i) => (
                <g key={i}>
                  <circle cx="288.5" cy={320 + i * 38} r="2.4" fill="#C9CBCA" />
                  <circle cx="288.5" cy={320 + i * 38} r="1.7" fill="#161B21" />
                  <circle cx="311.5" cy={320 + i * 38} r="2.4" fill="#BEC0BF" />
                  <circle cx="311.5" cy={320 + i * 38} r="1.7" fill="#161B21" />
                </g>
              ))}
            </svg>
          </div>
        </div>

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
