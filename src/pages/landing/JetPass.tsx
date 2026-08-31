import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealWords } from './motion';
import { LP } from './theme';

/**
 * The signature chapter: a photoreal top-down jet rises vertically through
 * the section while scrolling — 3D perspective pitch, hull swell at the
 * closest point, traveling specular sheen. Original artwork; lighting is
 * consistent from the upper-left.
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

        {/* ── The jet (original artwork; sun from upper-left) ── */}
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
                {/* Pearl-white cylinder: specular just left of center, bounce light right */}
                <linearGradient id="jp-fuse" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8E9092" />
                  <stop offset="8%" stopColor="#B9BBBC" />
                  <stop offset="26%" stopColor="#EEF0F0" />
                  <stop offset="40%" stopColor="#FFFFFF" />
                  <stop offset="52%" stopColor="#F7F8F8" />
                  <stop offset="72%" stopColor="#D5D7D6" />
                  <stop offset="90%" stopColor="#A6A8A8" />
                  <stop offset="100%" stopColor="#828486" />
                </linearGradient>
                <linearGradient id="jp-wing-r" x1="0" y1="0" x2="1" y2="0.6">
                  <stop offset="0%" stopColor="#E8EAE9" />
                  <stop offset="55%" stopColor="#C6C8C7" />
                  <stop offset="100%" stopColor="#96999A" />
                </linearGradient>
                <linearGradient id="jp-wing-l" x1="1" y1="0" x2="0" y2="0.6">
                  <stop offset="0%" stopColor="#F2F4F3" />
                  <stop offset="55%" stopColor="#CFD1D0" />
                  <stop offset="100%" stopColor="#9EA1A2" />
                </linearGradient>
                <linearGradient id="jp-stab-r" x1="0" y1="0" x2="1" y2="0.5">
                  <stop offset="0%" stopColor="#DFE1E0" />
                  <stop offset="100%" stopColor="#9B9E9F" />
                </linearGradient>
                <linearGradient id="jp-stab-l" x1="1" y1="0" x2="0" y2="0.5">
                  <stop offset="0%" stopColor="#E9EBEA" />
                  <stop offset="100%" stopColor="#A4A7A8" />
                </linearGradient>
                <linearGradient id="jp-eng" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7E8082" />
                  <stop offset="30%" stopColor="#D9DBDA" />
                  <stop offset="45%" stopColor="#F4F5F4" />
                  <stop offset="65%" stopColor="#C2C4C3" />
                  <stop offset="100%" stopColor="#77797B" />
                </linearGradient>
                <linearGradient id="jp-glass" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0C1118" />
                  <stop offset="55%" stopColor="#1D2B3C" />
                  <stop offset="100%" stopColor="#3E5A78" />
                </linearGradient>
                <radialGradient id="jp-nose" cx="0.42" cy="0.3" r="0.75">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </radialGradient>
                <filter id="jp-soft" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="7" />
                </filter>
                <filter id="jp-softer" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="14" />
                </filter>
              </defs>

              {/* ── Wings ── */}
              <path d="M334,560 L548,868 Q560,886 556,906 L544,922 L522,918 L336,752 Z" fill="url(#jp-wing-r)" />
              <path d="M266,560 L52,868 Q40,886 44,906 L56,922 L78,918 L264,752 Z" fill="url(#jp-wing-l)" />
              {/* Leading-edge polished strips */}
              <path d="M334,560 L548,868 L540,873 L332,574 Z" fill="#FFFFFF" opacity="0.85" />
              <path d="M266,560 L52,868 L60,873 L268,574 Z" fill="#FFFFFF" opacity="0.9" />
              {/* Flap / spoiler panel lines */}
              <path d="M352,618 L512,872" stroke="rgba(30,34,38,0.16)" strokeWidth="1.5" fill="none" />
              <path d="M344,682 L468,884" stroke="rgba(30,34,38,0.12)" strokeWidth="1.2" fill="none" />
              <path d="M248,618 L88,872" stroke="rgba(30,34,38,0.16)" strokeWidth="1.5" fill="none" />
              <path d="M256,682 L132,884" stroke="rgba(30,34,38,0.12)" strokeWidth="1.2" fill="none" />
              {/* Fuselage shadow cast onto the right wing root (sun upper-left) */}
              <path d="M336,570 L420,690 L360,740 L336,700 Z" fill="#2A2D30" opacity="0.22" filter="url(#jp-softer)" />
              {/* Wing-root ambient occlusion, both sides */}
              <path d="M336,566 L336,748 L368,706 Z" fill="#2A2D30" opacity="0.20" filter="url(#jp-soft)" />
              <path d="M264,566 L264,748 L232,706 Z" fill="#2A2D30" opacity="0.14" filter="url(#jp-soft)" />
              {/* Raked winglets */}
              <path d="M548,868 Q560,886 556,906 L544,922 L536,898 Z" fill="#6E7173" />
              <path d="M52,868 Q40,886 44,906 L56,922 L64,898 Z" fill="#7C7F81" />

              {/* ── T-tail ── */}
              <path d="M312,1148 L448,1266 Q456,1274 453,1286 L442,1294 L424,1290 L310,1200 Z" fill="url(#jp-stab-r)" />
              <path d="M288,1148 L152,1266 Q144,1274 147,1286 L158,1294 L176,1290 L290,1200 Z" fill="url(#jp-stab-l)" />
              {/* Fin shadow across the right stabilizer */}
              <path d="M312,1160 L390,1228 L360,1250 L310,1204 Z" fill="#2A2D30" opacity="0.18" filter="url(#jp-soft)" />
              <rect x="291" y="1078" width="18" height="196" rx="9" fill="#9B9E9F" />
              <rect x="291" y="1078" width="8" height="196" rx="4" fill="#C9CBCA" />
              <ellipse cx="300" cy="1272" rx="20" ry="10" fill="#DFE1E0" />

              {/* ── Engines ── */}
              <rect x="330" y="962" width="16" height="70" fill="#B4B6B5" />
              <rect x="254" y="962" width="16" height="70" fill="#BEC0BF" />
              <rect x="342" y="944" width="54" height="132" rx="27" fill="url(#jp-eng)" />
              <rect x="204" y="944" width="54" height="132" rx="27" fill="url(#jp-eng)" />
              {/* Intake lips */}
              <ellipse cx="369" cy="950" rx="25" ry="9" fill="none" stroke="#F2F3F2" strokeWidth="2.5" />
              <ellipse cx="231" cy="950" rx="25" ry="9" fill="none" stroke="#F7F8F7" strokeWidth="2.5" />
              <ellipse cx="369" cy="951" rx="22" ry="7.5" fill="#3A3D40" />
              <ellipse cx="231" cy="951" rx="22" ry="7.5" fill="#3A3D40" />
              {/* Fan disks + spinner cones */}
              <ellipse cx="369" cy="951" rx="15" ry="5" fill="#24262A" />
              <ellipse cx="231" cy="951" rx="15" ry="5" fill="#24262A" />
              <ellipse cx="369" cy="951" rx="4.5" ry="1.8" fill="#D9DBDA" />
              <ellipse cx="231" cy="951" rx="4.5" ry="1.8" fill="#D9DBDA" />
              {/* Exhausts */}
              <ellipse cx="369" cy="1073" rx="19" ry="6.5" fill="#6E7173" />
              <ellipse cx="231" cy="1073" rx="19" ry="6.5" fill="#6E7173" />

              {/* ── Fuselage ── */}
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
                fill="url(#jp-fuse)"
              />
              {/* Curvature AO along both hull edges */}
              <path d="M268,150 C265,400 265,800 273,1150 L266,1150 C258,800 258,400 261,150 Z" fill="#1E2124" opacity="0.10" filter="url(#jp-soft)" />
              <path d="M332,150 C335,400 335,800 327,1150 L336,1150 C343,800 343,400 340,150 Z" fill="#1E2124" opacity="0.16" filter="url(#jp-soft)" />
              {/* Long gloss line (specular, left of center) */}
              <path d="M288,100 C284,420 284,780 290,1130" stroke="#FFFFFF" strokeWidth="7" opacity="0.55" fill="none" filter="url(#jp-soft)" />
              {/* Faint sky reflection band on the right of the spine */}
              <path d="M312,120 C316,420 316,760 310,1100" stroke="#A8C4DB" strokeWidth="9" opacity="0.22" fill="none" filter="url(#jp-soft)" />
              {/* Radome seam + highlight */}
              <line x1="274" y1="80" x2="326" y2="80" stroke="rgba(20,23,26,0.18)" strokeWidth="1.5" />
              <ellipse cx="296" cy="58" rx="22" ry="36" fill="url(#jp-nose)" />

              {/* Gold coachlines, both sides */}
              <path d="M271,150 L266,560 L266,860 C266,980 270,1090 276,1166" fill="none" stroke={LP.gold} strokeWidth="2.2" opacity="0.8" />
              <path d="M329,150 L334,560 L334,860 C334,980 330,1090 324,1166" fill="none" stroke={LP.gold} strokeWidth="2.2" opacity="0.7" />
              <path d="M274.5,150 L269.5,560" fill="none" stroke={LP.gold} strokeWidth="0.9" opacity="0.55" />
              <path d="M325.5,150 L330.5,560" fill="none" stroke={LP.gold} strokeWidth="0.9" opacity="0.5" />

              {/* Embossed seam rings */}
              {[224, 330, 500, 640, 800, 930, 1060].map((y) => (
                <g key={y}>
                  <line x1="267" y1={y} x2="333" y2={y} stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                  <line x1="267" y1={y + 2} x2="333" y2={y + 2} stroke="rgba(20,23,26,0.13)" strokeWidth="1.2" />
                </g>
              ))}

              {/* Antennas on the spine */}
              <rect x="298.5" y="196" width="3" height="10" rx="1.5" fill="#6E7173" />
              <rect x="298.5" y="1098" width="3" height="8" rx="1.5" fill="#6E7173" />

              {/* Cockpit — glass with diagonal sky reflection */}
              <path d="M300,92 C315,92 323,106 325,132 L322,158 C308,148 292,148 278,158 L275,132 C277,106 285,92 300,92 Z" fill="url(#jp-glass)" />
              <path d="M283,100 L310,96 L298,126 L280,128 Z" fill="#DCE9F4" opacity="0.45" />
              <line x1="300" y1="94" x2="300" y2="152" stroke="#E9ECEF" strokeWidth="2" opacity="0.85" />
              <line x1="288" y1="98" x2="284" y2="150" stroke="#E9ECEF" strokeWidth="1.4" opacity="0.6" />
              <line x1="312" y1="98" x2="316" y2="150" stroke="#E9ECEF" strokeWidth="1.4" opacity="0.6" />

              {/* Main cabin door */}
              <rect x="269" y="196" width="17" height="52" rx="6" fill="none" stroke="rgba(20,23,26,0.22)" strokeWidth="1.5" />

              {/* Cabin windows — framed glass with glints */}
              {Array.from({ length: 16 }).map((_, i) => (
                <g key={i}>
                  <ellipse cx="277" cy={286 + i * 40} rx="5" ry="6.5" fill="#C9CBCA" />
                  <ellipse cx="277" cy={286 + i * 40} rx="3.6" ry="5" fill="#161B21" />
                  <circle cx="275.6" cy={283.6 + i * 40} r="1" fill="#FFFFFF" opacity="0.8" />
                  <ellipse cx="323" cy={286 + i * 40} rx="5" ry="6.5" fill="#BEC0BF" />
                  <ellipse cx="323" cy={286 + i * 40} rx="3.6" ry="5" fill="#161B21" />
                  <circle cx="321.6" cy={283.6 + i * 40} r="1" fill="#FFFFFF" opacity="0.7" />
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
