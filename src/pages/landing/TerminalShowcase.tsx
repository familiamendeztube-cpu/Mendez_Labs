import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealWords } from './motion';
import { LP } from './theme';

const SPECS: Array<[string, string]> = [
  ['EXECUTION', 'Alpaca Markets'],
  ['MARKETS', 'US Equities & ETFs'],
  ['DATA FEED', 'IEX real-time quotes'],
  ['MODE', 'Paper today · Live next'],
  ['RISK ENGINE', 'Position-sized, drawdown-aware'],
  ['SESSIONS', 'New York · London · Tokyo'],
];

// Decorative price action — product art, deliberately unlabeled so nothing
// reads as a performance claim. Deterministic jagged walk with pullbacks.
const PRICE_Y = [
  152, 149, 151, 145, 147, 140, 143, 136, 138, 131, 133, 127, 130, 121, 125,
  118, 121, 113, 116, 108, 111, 104, 108, 113, 105, 100, 103, 95, 98, 90, 94,
  86, 89, 96, 88, 82, 85, 77, 80, 72, 75, 68, 71, 63, 66, 58, 61, 54, 57,
  49, 52, 45, 48, 41, 44, 38, 41, 35, 38, 40,
];
const PRICE_PTS = PRICE_Y.map((y, i) => `${(i * 480) / (PRICE_Y.length - 1)},${y}`);
const PRICE_PATH = `M${PRICE_PTS.join(' L')}`;
const AREA_PATH = `${PRICE_PATH} L480,210 L0,210 Z`;
// Smoother benchmark underneath, always trailing the price.
const BENCH_PATH = 'M0,158 C60,152 110,146 170,138 S290,118 350,106 S440,86 480,78';
// Volume bars: [height, direction] — direction picks the bar tint.
const VOLUME: Array<[number, number]> = [
  [12, 1], [8, 0], [16, 1], [10, 0], [20, 1], [14, 1], [9, 0], [18, 1],
  [12, 0], [22, 1], [15, 1], [10, 0], [19, 1], [13, 0], [24, 1], [16, 1],
  [11, 0], [20, 1], [14, 0], [26, 1], [17, 1], [12, 0], [21, 1], [15, 0],
  [25, 1], [18, 1], [13, 0], [22, 1], [16, 0], [24, 1], [19, 1], [14, 0],
  [23, 1], [17, 1],
];

export function TerminalShowcase({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        y: 110, duration: 1.3, ease: 'lux',
        scrollTrigger: { trigger: ref.current, start: 'top 92%' },
      });
      revealWords(ref.current!.querySelector('[data-term-head]')!, {
        scrollTrigger: { trigger: ref.current, start: 'top 65%' },
      });
      gsap.from('[data-term-frame]', {
        x: 140, opacity: 0, duration: 1.3, ease: 'lux',
        scrollTrigger: { trigger: '[data-term-frame]', start: 'top 82%' },
      });
      gsap.from('[data-term-curve]', {
        strokeDashoffset: 720, duration: 1,
        ease: 'none',
        scrollTrigger: { trigger: '[data-term-frame]', start: 'top 75%', end: 'top 30%', scrub: true },
      });
      gsap.to('[data-term-cross]', {
        attr: { x1: 150, x2: 150 }, duration: 6, ease: 'sine.inOut',
        repeat: -1, yoyo: true,
      });
      gsap.from('[data-term-area]', {
        opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '[data-term-frame]', start: 'top 60%', end: 'top 30%', scrub: true },
      });
      gsap.from('[data-term-vol] rect', {
        scaleY: 0, transformOrigin: '50% 100%', stagger: 0.02, duration: 0.5, ease: 'lux',
        scrollTrigger: { trigger: '[data-term-frame]', start: 'top 70%' },
      });
      gsap.to('[data-term-dot]', {
        scale: 1.8, opacity: 0.2, transformOrigin: '50% 50%',
        duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
      gsap.from('[data-spec-row]', {
        opacity: 0, x: -60, stagger: 0.08, duration: 0.8, ease: 'lux',
        scrollTrigger: { trigger: '[data-spec-grid]', start: 'top 78%' },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={ref}
      id="terminal"
      data-lp-theme="light"
      className="relative px-[6vw] pt-[14vh]"
      style={{ background: LP.ivory }}
    >
      {/* Editorial split header — small brand word, huge model name left;
          category + intro paragraph right */}
      <div className="mb-16 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-lg font-semibold" style={{ color: LP.inkOnIvory, fontFamily: LP.display, letterSpacing: '-0.01em' }}>
            Mendez
          </p>
          <h2
            data-term-head
            className="font-semibold"
            style={{ color: LP.inkOnIvory, fontFamily: LP.displayHero, fontSize: 'clamp(3rem, 9vw, 9.5rem)', lineHeight: 0.95, letterSpacing: '-0.01em' }}
          >
            ALPHA-1
          </h2>
        </div>
        <div className="lg:pl-[12%] lg:pt-2">
          <h3 className="mb-8 font-semibold" style={{ color: LP.inkOnIvory, fontFamily: LP.display, fontSize: 'clamp(1.4rem, 2.4vw, 2rem)', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Always-on trading cockpit
          </h3>
          <div className="mb-6 border-t pt-4" style={{ borderColor: LP.borderLight }}>
            <p className="text-[11px] font-bold tracking-[0.2em]" style={{ color: LP.inkOnIvory, fontFamily: LP.mono }}>
              DIRECT ACCESS TO<br />LIVE MARKETS
            </p>
          </div>
          <p className="max-w-md text-base leading-relaxed lg:text-lg" style={{ color: LP.mutedOnIvory, fontFamily: LP.display }}>
            One cockpit for every position you hold — your account, the
            tape, and the risk engine on a single pane of glass, awake in
            every session you trade.
          </p>
        </div>
      </div>

      {/* Framed terminal preview */}
      <div
        data-term-frame
        className="mx-auto mb-16 max-w-4xl overflow-hidden rounded-2xl"
        style={{ background: LP.carbon, border: `1px solid ${LP.borderLight}`, boxShadow: '0 40px 90px rgba(16,19,18,0.25)' }}
      >
        <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: `1px solid ${LP.borderDark}` }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#D94550' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: LP.gold }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: LP.emerald }} />
          <span className="ml-3 text-[10px] tracking-widest" style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}>
            MENDEZ LABS — LIVE COCKPIT
          </span>
        </div>
        {/* Chart toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${LP.borderDark}` }}>
          <span className="flex items-center gap-2 text-[10px] tracking-[0.25em]" style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: LP.champagne }} />
            MENDEZ ALPHA · LIVE
          </span>
          <span className="flex items-center gap-1.5">
            {['1D', '1W', '1M', '1Y'].map((t) => (
              <span
                key={t}
                className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                style={t === '1M'
                  ? { background: 'rgba(214,183,122,0.18)', color: LP.champagne, fontFamily: LP.mono }
                  : { color: LP.mutedOnDark, fontFamily: LP.mono }}
              >
                {t}
              </span>
            ))}
          </span>
        </div>
        <div className="relative p-6 pb-4">
          {/* Top inner light on the panel */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16" style={{ background: 'linear-gradient(180deg, rgba(237,229,213,0.05), transparent)' }} />
          <svg viewBox="0 0 480 210" className="w-full" aria-hidden="true">
            <defs>
              <linearGradient id="term-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#B58A3A" />
                <stop offset="55%" stopColor="#D6B77A" />
                <stop offset="100%" stopColor="#F1DDAE" />
              </linearGradient>
              <linearGradient id="term-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LP.champagne} stopOpacity="0.34" />
                <stop offset="55%" stopColor={LP.champagne} stopOpacity="0.08" />
                <stop offset="100%" stopColor={LP.champagne} stopOpacity="0" />
              </linearGradient>
              <filter id="term-glow" x="-20%" y="-20%" width="140%" height="160%">
                <feGaussianBlur stdDeviation="4.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid */}
            {[36, 76, 116, 156].map((y) => (
              <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="rgba(237,229,213,0.055)" strokeWidth="1" />
            ))}
            {[80, 160, 240, 320, 400].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="176" stroke="rgba(237,229,213,0.04)" strokeWidth="1" />
            ))}
            {[36, 76, 116, 156].map((y) => (
              <line key={y} x1="472" y1={y} x2="480" y2={y} stroke="rgba(237,229,213,0.22)" strokeWidth="1.4" />
            ))}

            {/* Volume bars */}
            <g data-term-vol>
              {VOLUME.map(([h, up], i) => (
                <rect
                  key={i}
                  x={4 + i * 14}
                  y={208 - h}
                  width="8"
                  height={h}
                  rx="1.5"
                  fill={up ? 'rgba(214,183,122,0.38)' : 'rgba(156,144,131,0.20)'}
                />
              ))}
            </g>

            {/* Benchmark line beneath */}
            <path d={BENCH_PATH} fill="none" stroke="rgba(237,229,213,0.20)" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" />

            {/* Area fill */}
            <path data-term-area d={AREA_PATH} fill="url(#term-area)" />

            {/* Soft under-glow of the price line */}
            <path d={PRICE_PATH} fill="none" stroke={LP.champagne} strokeWidth="7" strokeOpacity="0.16" strokeLinejoin="round" strokeLinecap="round" filter="url(#term-glow)" />

            {/* Price action — gradient stroke */}
            <path
              data-term-curve
              d={PRICE_PATH}
              fill="none"
              stroke="url(#term-stroke)"
              strokeWidth="2.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="720"
            />

            {/* Crosshair — vertical guide + level, with a tag pill (no digits) */}
            <line data-term-cross x1="360" y1="0" x2="360" y2="176" stroke="rgba(237,229,213,0.22)" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="0" y1="44" x2="472" y2="44" stroke="rgba(214,183,122,0.3)" strokeWidth="1" strokeDasharray="4 5" />
            <rect x="452" y="37" width="28" height="14" rx="3" fill={LP.champagne} opacity="0.9" />
            <rect x="457" y="42" width="18" height="4" rx="2" fill={LP.carbon} opacity="0.55" />

            {/* Live endpoint */}
            <circle data-term-dot cx="480" cy="40" r="8" fill={LP.champagne} opacity="0.22" />
            <circle cx="480" cy="40" r="3.6" fill="#F1DDAE" />
          </svg>
        </div>
      </div>

      {/* Editorial spec sheet — stacked label-over-value, two columns,
          anchored left like an aircraft data plate */}
      <div data-spec-grid className="grid max-w-2xl grid-cols-1 gap-x-10 sm:grid-cols-2">
        {SPECS.map(([label, value]) => (
          <div
            key={label}
            data-spec-row
            className="py-4"
            style={{ borderTop: `1px solid ${LP.borderLight}` }}
          >
            <p className="mb-1 text-[11px] font-bold tracking-[0.15em]" style={{ color: LP.mutedOnIvory, fontFamily: LP.mono }}>
              {label}
            </p>
            <p className="text-sm font-bold uppercase tracking-wide" style={{ color: LP.inkOnIvory, fontFamily: LP.display }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Atmospheric handoff: ivory fades through bronze into the dark
          markets chapter — no card edge, no color step. */}
      <div
        aria-hidden="true"
        className="-mx-[6vw] mt-[12vh] h-[42vh]"
        style={{
          background: `linear-gradient(180deg, ${LP.ivory} 0%, #C9B592 45%, #6E5A41 75%, #241D17 100%)`,
        }}
      />
    </section>
  );
}
