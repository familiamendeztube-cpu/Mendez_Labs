import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealLines } from './motion';
import { LP } from './theme';

const SPECS: Array<[string, string]> = [
  ['EXECUTION', 'Alpaca Markets'],
  ['MARKETS', 'US Equities & ETFs'],
  ['DATA FEED', 'IEX real-time quotes'],
  ['MODE', 'Paper today · Live next'],
  ['RISK ENGINE', 'Position-sized, drawdown-aware'],
  ['SESSIONS', 'New York · London · Tokyo'],
];

// Decorative equity curve — product art, not a performance claim.
const CURVE = 'M0,90 C40,85 70,70 110,74 S180,52 220,58 S290,30 340,36 S420,14 480,18';

export function TerminalShowcase({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      revealLines(ref.current!.querySelector('[data-term-head]')!, {
        scrollTrigger: { trigger: ref.current, start: 'top 65%' },
      });
      gsap.from('[data-term-frame]', {
        y: 80, opacity: 0, duration: 1.2, ease: 'lux',
        scrollTrigger: { trigger: '[data-term-frame]', start: 'top 80%' },
      });
      gsap.from('[data-term-curve]', {
        strokeDashoffset: 700, duration: 1,
        ease: 'none',
        scrollTrigger: { trigger: '[data-term-frame]', start: 'top 75%', end: 'top 30%', scrub: true },
      });
      gsap.from('[data-spec-row]', {
        opacity: 0, y: 24, stagger: 0.08, duration: 0.7, ease: 'lux',
        scrollTrigger: { trigger: '[data-spec-grid]', start: 'top 78%' },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={ref} data-lp-theme="light" className="px-[6vw] py-[16vh]">
      <p className="mb-6 text-xs tracking-[0.4em]" style={{ color: LP.gold, fontFamily: LP.mono }}>
        02 — THE TERMINAL
      </p>
      <h2
        data-term-head
        className="mb-14 max-w-4xl font-bold leading-[1.02]"
        style={{ color: LP.inkOnIvory, fontFamily: LP.display, fontSize: 'clamp(2.2rem, 5.5vw, 5rem)' }}
      >
        One cockpit for every position you hold
      </h2>

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
        <div className="p-6">
          <svg viewBox="0 0 480 110" className="w-full" aria-hidden="true">
            <path
              data-term-curve
              d={CURVE}
              fill="none"
              stroke={LP.emerald}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="700"
            />
          </svg>
        </div>
      </div>

      {/* Editorial spec grid — Jesko's aircraft-spec table */}
      <div data-spec-grid className="mx-auto grid max-w-4xl grid-cols-1 gap-x-12 sm:grid-cols-2">
        {SPECS.map(([label, value]) => (
          <div
            key={label}
            data-spec-row
            className="flex items-baseline justify-between py-5"
            style={{ borderTop: `1px solid ${LP.borderLight}` }}
          >
            <span className="text-xs tracking-[0.25em]" style={{ color: LP.mutedOnIvory, fontFamily: LP.mono }}>
              {label}
            </span>
            <span className="text-right text-base font-bold" style={{ color: LP.inkOnIvory, fontFamily: LP.display }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
