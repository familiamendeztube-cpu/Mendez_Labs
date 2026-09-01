import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealWords } from './motion';
import { LP } from './theme';

/**
 * The signature chapter: a supersonic delta jet rises vertically through the
 * section while scrolling — 3D perspective pitch, hull swell, traveling
 * sheen — and mid-pass the metal skin dissolves to reveal the cabin
 * interior floor plan. Original artwork throughout; lighting is computed
 * (feDiffuse/feSpecular) from a golden-hour distant light.
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
      tl.fromTo(jetRef.current,
        { yPercent: 10 },
        { yPercent: -101, ease: 'none', duration: 1 }, 0)
        .fromTo(jetInnerRef.current,
          { rotateX: 16, scale: 0.94 },
          {
            keyframes: { rotateX: [16, 0, -13], scale: [0.94, 1.07, 0.95] },
            ease: 'none',
            duration: 1,
          }, 0)
        .fromTo('[data-jet-sheen]',
          { yPercent: -60 },
          { yPercent: 480, ease: 'none', duration: 1 }, 0)
        // ── X-ray moment: directly overhead, the skin dissolves and the
        //    cabin interior fades up — then the skin returns as it departs.
        .fromTo('[data-jet-interior]',
          { opacity: 0 },
          { opacity: 1, ease: 'none', duration: 0.22 }, 0.34)
        .to('[data-jet-skin]',
          { opacity: 0.1, ease: 'none', duration: 0.22 }, 0.34)
        .to('[data-jet-interior]',
          { opacity: 0, ease: 'none', duration: 0.18 }, 0.72)
        .to('[data-jet-skin]',
          { opacity: 1, ease: 'none', duration: 0.18 }, 0.72);

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
      className="relative"
      style={{
        // Continues seamlessly from the manifesto's warming sky (#E9E2D0).
        background: `linear-gradient(180deg, #E9E2D0 0%, #EFE8D8 40%, #F8F3E8 75%, ${LP.ivory} 100%)`,
        height: '420vh',
      }}
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden px-[6vw]">
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

        {/* ── The jet ── */}
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
                {/* Champagne-gold metal: deep bronze edges, hot cream specular */}
                <linearGradient id="jp-fuse" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#71613F" />
                  <stop offset="10%" stopColor="#A6926A" />
                  <stop offset="30%" stopColor="#E9DBB6" />
                  <stop offset="44%" stopColor="#FFF9E7" />
                  <stop offset="56%" stopColor="#F3E7C8" />
                  <stop offset="76%" stopColor="#C6B489" />
                  <stop offset="100%" stopColor="#6B5B3A" />
                </linearGradient>
                <linearGradient id="jp-wing-r" x1="0" y1="0" x2="1" y2="0.35">
                  <stop offset="0%" stopColor="#E7D9B3" />
                  <stop offset="45%" stopColor="#C2AF83" />
                  <stop offset="100%" stopColor="#84714A" />
                </linearGradient>
                <linearGradient id="jp-wing-l" x1="1" y1="0" x2="0" y2="0.35">
                  <stop offset="0%" stopColor="#F3E7C4" />
                  <stop offset="45%" stopColor="#CFBD92" />
                  <stop offset="100%" stopColor="#93805A" />
                </linearGradient>
                <linearGradient id="jp-eng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4E4128" />
                  <stop offset="25%" stopColor="#6E5F40" />
                  <stop offset="100%" stopColor="#2E2718" />
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
                <filter id="jp-3d" x="-15%" y="-8%" width="130%" height="116%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="relief" />
                  <feDiffuseLighting in="relief" surfaceScale="8" diffuseConstant="1.05" lightingColor="#FFF3E2" result="diff">
                    <feDistantLight azimuth="230" elevation="58" />
                  </feDiffuseLighting>
                  <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="lit" />
                  <feSpecularLighting in="relief" surfaceScale="8" specularConstant="0.65" specularExponent="16" lightingColor="#FFFDF6" result="spec">
                    <feDistantLight azimuth="230" elevation="58" />
                  </feSpecularLighting>
                  <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
                  <feComposite in="lit" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
                </filter>
                <filter id="jp-grain">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n" />
                  <feColorMatrix in="n" type="matrix"
                    values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0.9 0.9 0.9 0 0" />
                </filter>
                <linearGradient id="jp-fin-gold" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#F0D49A" />
                  <stop offset="50%" stopColor="#D6B77A" />
                  <stop offset="100%" stopColor="#8F6D2C" />
                </linearGradient>
                <clipPath id="jp-clip">
                  <path d="M316,455 C328,585 362,715 428,830 C482,925 534,1005 554,1052 Q561,1072 559,1094 L548,1112 L522,1116 L318,1152 Z" />
                  <path d="M284,455 C272,585 238,715 172,830 C118,925 66,1005 46,1052 Q39,1072 41,1094 L52,1112 L78,1116 L282,1152 Z" />
                  <path d="M300,26 C304,26 307,38 308.5,62 L311,150 C313,240 315,330 316,440 L316,1000 C316,1090 312,1180 308,1250 C305,1300 302,1340 300,1352 C298,1340 295,1300 292,1250 C288,1180 284,1090 284,1000 L284,440 C285,330 287,240 289,150 L291.5,62 C293,38 296,26 300,26 Z" />
                  <rect x="348" y="1078" width="92" height="76" rx="5" />
                  <rect x="160" y="1078" width="92" height="76" rx="5" />
                  <path d="M300,1128 L307,1298 L300,1312 L293,1298 Z" />
                </clipPath>
              </defs>

              {/* ── Wings / engines / fin under the computed-lighting pass ── */}
              <g filter="url(#jp-3d)">
                <path d="M316,455 C328,585 362,715 428,830 C482,925 534,1005 554,1052 Q561,1072 559,1094 L548,1112 L522,1116 L318,1152 Z" fill="url(#jp-wing-r)" />
                <path d="M284,455 C272,585 238,715 172,830 C118,925 66,1005 46,1052 Q39,1072 41,1094 L52,1112 L78,1116 L282,1152 Z" fill="url(#jp-wing-l)" />
                <rect x="348" y="1078" width="44" height="76" rx="5" fill="url(#jp-eng)" />
                <rect x="396" y="1078" width="44" height="76" rx="5" fill="url(#jp-eng)" />
                <rect x="160" y="1078" width="44" height="76" rx="5" fill="url(#jp-eng)" />
                <rect x="208" y="1078" width="44" height="76" rx="5" fill="url(#jp-eng)" />
                <path d="M300,1128 L307,1298 L300,1312 L293,1298 Z" fill="url(#jp-fin-gold)" />
              </g>
              {/* Wing overlays */}
              <path d="M316,455 C328,585 362,715 428,830 C482,925 534,1005 554,1052 L548,1058 C527,1010 476,930 422,836 C357,722 323,590 311,458 Z" fill="#FFF6DE" opacity="0.85" />
              <path d="M284,455 C272,585 238,715 172,830 C118,925 66,1005 46,1052 L52,1058 C73,1010 124,930 178,836 C243,722 277,590 289,458 Z" fill="#FFFAEA" opacity="0.9" />
              {/* Engine contact shadows cast onto the wings */}
              <ellipse cx="394" cy="1158" rx="54" ry="9" fill="#241C10" opacity="0.24" filter="url(#jp-soft)" />
              <ellipse cx="206" cy="1158" rx="54" ry="9" fill="#241C10" opacity="0.20" filter="url(#jp-soft)" />
              <path d="M340,1148 L352,1094" stroke="rgba(30,34,38,0.16)" strokeWidth="1.4" fill="none" />
              <path d="M300,1152 L470,1116" stroke="rgba(30,34,38,0.10)" strokeWidth="1.2" fill="none" />
              <path d="M260,1148 L248,1094" stroke="rgba(30,34,38,0.16)" strokeWidth="1.4" fill="none" />
              <path d="M300,1152 L130,1116" stroke="rgba(30,34,38,0.10)" strokeWidth="1.2" fill="none" />
              <rect x="352" y="1082" width="36" height="10" rx="3" fill="#0F1113" />
              <rect x="400" y="1082" width="36" height="10" rx="3" fill="#0F1113" />
              <rect x="164" y="1082" width="36" height="10" rx="3" fill="#0F1113" />
              <rect x="212" y="1082" width="36" height="10" rx="3" fill="#0F1113" />
              <path d="M300,1128 L303.5,1298 L300,1312 Z" fill="#F4E2B6" opacity="0.8" />

              {/* ── Cabin interior — revealed as the skin dissolves overhead ── */}
              <g data-jet-interior opacity="0">
                {/* Cabin shell */}
                <path
                  d="M300,26 C304,26 307,38 308.5,62 L311,150 C313,240 315,330 316,440 L316,1000 C316,1090 312,1180 308,1250 C305,1300 302,1340 300,1352 C298,1340 295,1300 292,1250 C288,1180 284,1090 284,1000 L284,440 C285,330 287,240 289,150 L291.5,62 C293,38 296,26 300,26 Z"
                  fill="#F2EBDA" stroke="rgba(36,28,20,0.55)" strokeWidth="2"
                />
                {/* Cockpit: two crew seats + console */}
                <path d="M290,160 C293,152 307,152 310,160" fill="none" stroke="rgba(36,28,20,0.5)" strokeWidth="1.4" />
                <rect x="288.5" y="168" width="9" height="11" rx="2.5" fill="#DCD2BC" stroke="rgba(36,28,20,0.55)" strokeWidth="1" />
                <rect x="302.5" y="168" width="9" height="11" rx="2.5" fill="#DCD2BC" stroke="rgba(36,28,20,0.55)" strokeWidth="1" />
                {/* Forward galley */}
                <rect x="287" y="212" width="26" height="38" rx="3" fill="none" stroke="rgba(36,28,20,0.5)" strokeWidth="1.2" />
                <line x1="287" y1="231" x2="313" y2="231" stroke="rgba(36,28,20,0.35)" strokeWidth="1" />
                {/* Seat rows, aisle down the middle */}
                {Array.from({ length: 18 }).map((_, i) => {
                  const y = 286 + i * 38;
                  return (
                    <g key={i}>
                      <rect x="286.5" y={y} width="10.5" height="15" rx="3" fill="#DCD2BC" stroke="rgba(36,28,20,0.55)" strokeWidth="1" />
                      <rect x="288.5" y={y} width="6.5" height="3.4" rx="1.6" fill="#C4B89D" />
                      <rect x="303" y={y} width="10.5" height="15" rx="3" fill="#DCD2BC" stroke="rgba(36,28,20,0.55)" strokeWidth="1" />
                      <rect x="305" y={y} width="6.5" height="3.4" rx="1.6" fill="#C4B89D" />
                    </g>
                  );
                })}
                {/* Rear lounge + table */}
                <rect x="286.5" y="984" width="11" height="52" rx="3.5" fill="#DCD2BC" stroke="rgba(36,28,20,0.55)" strokeWidth="1" />
                <rect x="303.5" y="994" width="9" height="20" rx="2" fill="none" stroke="rgba(36,28,20,0.5)" strokeWidth="1.2" />
                {/* Aft lavatory */}
                <rect x="287" y="1052" width="26" height="30" rx="3" fill="none" stroke="rgba(36,28,20,0.5)" strokeWidth="1.2" />
                <line x1="289" y1="1054" x2="311" y2="1080" stroke="rgba(36,28,20,0.3)" strokeWidth="1" />
              </g>

              {/* ── Fuselage skin (dissolves overhead) ── */}
              <g data-jet-skin>
                <g filter="url(#jp-3d)">
                  <path
                    d="M300,26 C304,26 307,38 308.5,62 L311,150 C313,240 315,330 316,440 L316,1000 C316,1090 312,1180 308,1250 C305,1300 302,1340 300,1352 C298,1340 295,1300 292,1250 C288,1180 284,1090 284,1000 L284,440 C285,330 287,240 289,150 L291.5,62 C293,38 296,26 300,26 Z"
                    fill="url(#jp-fuse)"
                  />
                </g>
                <rect
                  x="0" y="0" width="600" height="1400"
                  filter="url(#jp-grain)"
                  clipPath="url(#jp-clip)"
                  opacity="0.45"
                  style={{ mixBlendMode: 'overlay' }}
                />
                <rect x="299" y="6" width="2" height="22" rx="1" fill="#7E8082" />
                <path d="M288,160 C286,420 285,800 291,1240 L286,1240 C280,800 281,420 283,160 Z" fill="#1E2124" opacity="0.10" filter="url(#jp-soft)" />
                <path d="M312,160 C314,420 315,800 309,1240 L314,1240 C320,800 319,420 317,160 Z" fill="#1E2124" opacity="0.15" filter="url(#jp-soft)" />
                <path d="M294,110 C291,420 291,800 295,1230" stroke="#FFFFFF" strokeWidth="5" opacity="0.6" fill="none" filter="url(#jp-soft)" />
                <path d="M306,130 C309,420 309,760 305,1180" stroke="#A8C4DB" strokeWidth="6" opacity="0.22" fill="none" filter="url(#jp-soft)" />
                <line x1="291" y1="150" x2="309" y2="150" stroke="rgba(20,23,26,0.18)" strokeWidth="1.2" />
                <ellipse cx="298" cy="70" rx="10" ry="34" fill="url(#jp-nose)" />
                {/* Dark cheat-lines (dark stripe reads sharper on gold metal) */}
                <path d="M289,180 L285,440 L285,1000 C285,1090 289,1180 293,1246" fill="none" stroke="rgba(58,46,28,0.6)" strokeWidth="1.8" />
                <path d="M311,180 L315,440 L315,1000 C315,1090 311,1180 307,1246" fill="none" stroke="rgba(58,46,28,0.5)" strokeWidth="1.8" />
                {/* Belly shading toward the tail — grounds the hull */}
                <path d="M292,1040 C288,1130 288,1210 294,1256 L306,1256 C312,1210 312,1130 308,1040 Z" fill="#2A2216" opacity="0.16" filter="url(#jp-softer)" />
                {[260, 420, 620, 830, 1010].map((y) => (
                  <g key={y}>
                    <line x1="286" y1={y} x2="314" y2={y} stroke="rgba(255,255,255,0.5)" strokeWidth="0.9" />
                    <line x1="286" y1={y + 2} x2="314" y2={y + 2} stroke="rgba(20,23,26,0.13)" strokeWidth="1" />
                  </g>
                ))}
                <path d="M300,168 C306,168 309,174 310,186 L308,204 C303,199 297,199 292,204 L290,186 C291,174 294,168 300,168 Z" fill="url(#jp-glass)" />
                <path d="M294,172 L305,170 L300,190 L292,192 Z" fill="#DCE9F4" opacity="0.45" />
                <line x1="300" y1="170" x2="300" y2="200" stroke="#E9ECEF" strokeWidth="1.2" opacity="0.85" />
                <rect x="287" y="236" width="9" height="34" rx="4" fill="none" stroke="rgba(20,23,26,0.22)" strokeWidth="1.2" />
                {Array.from({ length: 15 }).map((_, i) => (
                  <g key={i}>
                    <circle cx="288.5" cy={320 + i * 38} r="2.4" fill="#8A7B5D" />
                    <circle cx="288.5" cy={320 + i * 38} r="1.7" fill="#161B21" />
                    <circle cx="311.5" cy={320 + i * 38} r="2.4" fill="#7E7052" />
                    <circle cx="311.5" cy={320 + i * 38} r="1.7" fill="#161B21" />
                  </g>
                ))}
              </g>
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
