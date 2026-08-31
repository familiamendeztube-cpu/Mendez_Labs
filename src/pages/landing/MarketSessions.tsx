import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealWords } from './motion';
import { FloatingChips } from './FloatingChips';
import { LP } from './theme';

interface Market { city: string; tz: string; open: number; close: number }
// open/close are minutes since local midnight, regular sessions, Mon–Fri.
const MARKETS: Market[] = [
  { city: 'NEW YORK', tz: 'America/New_York', open: 570, close: 960 },   // 09:30–16:00
  { city: 'LONDON', tz: 'Europe/London', open: 480, close: 990 },        // 08:00–16:30
  { city: 'TOKYO', tz: 'Asia/Tokyo', open: 540, close: 900 },            // 09:00–15:00
];

function sessionInfo(m: Market): { time: string; isOpen: boolean } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: m.tz, hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, weekday: 'short',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const mins = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
  const weekend = get('weekday') === 'Sat' || get('weekday') === 'Sun';
  return {
    time: `${get('hour')}:${get('minute')}:${get('second')}`,
    isOpen: !weekend && mins >= m.open && mins < m.close,
  };
}

export function MarketSessions({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      revealWords(ref.current!.querySelector('[data-ms-head]')!, {
        scrollTrigger: { trigger: ref.current, start: 'top 65%' },
      });
      gsap.from('[data-ms-ghost]', {
        yPercent: 30, ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true },
      });
      gsap.from('[data-ms-arc]', {
        strokeDashoffset: 900, ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top 70%', end: 'center 40%', scrub: true },
      });
      gsap.from('[data-ms-card]', {
        opacity: 0, y: 40, stagger: 0.12, duration: 0.9, ease: 'lux',
        scrollTrigger: { trigger: '[data-ms-cards]', start: 'top 75%' },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={ref} data-lp-theme="dark" className="relative overflow-hidden px-[6vw] py-[20vh]">
      {/* Ghost type */}
      <div
        data-ms-ghost
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 select-none text-center font-bold leading-none"
        style={{ color: 'rgba(232,226,214,0.045)', fontFamily: LP.display, fontSize: 'clamp(6rem, 22vw, 20rem)' }}
      >
        GLOBAL
      </div>

      <FloatingChips
        chips={[
          { label: 'NIKKEI · TYO', top: '8%', right: '6%', speed: 50, blur: true },
          { label: 'FTSE · LDN', top: '20%', left: '6%', speed: 65 },
          { label: 'DAX · FRA', top: '58%', right: '10%', speed: 38, blur: true },
        ]}
      />
      <p className="mb-6 text-xs tracking-[0.4em]" style={{ color: LP.gold, fontFamily: LP.mono }}>
        03 — MARKETS NEVER SLEEP
      </p>
      <h2
        data-ms-head
        className="mb-16 max-w-3xl font-bold"
        style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(2.4rem, 6.5vw, 6rem)', lineHeight: 0.95, letterSpacing: '-0.03em' }}
      >
        Three sessions. One fighter in the corner.
      </h2>

      {/* Session arcs */}
      <svg viewBox="0 0 900 200" className="mb-16 w-full" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            data-ms-arc
            d={`M${60 + i * 40},190 Q450,${30 + i * 35} ${840 - i * 40},190`}
            fill="none"
            stroke={i === 1 ? LP.champagne : 'rgba(232,226,214,0.35)'}
            strokeWidth="1.5"
            strokeDasharray="900"
          />
        ))}
      </svg>

      {/* Clock cards */}
      <div data-ms-cards className="relative z-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {MARKETS.map((m) => {
          const { time, isOpen } = sessionInfo(m);
          return (
            <div
              key={m.city}
              data-ms-card
              className="rounded-2xl p-6"
              style={{ background: LP.surface, border: `1px solid ${LP.borderDark}` }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs tracking-[0.3em]" style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}>
                  {m.city}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest"
                  style={{
                    color: isOpen ? LP.carbon : LP.mutedOnDark,
                    background: isOpen ? LP.emerald : 'rgba(138,143,138,0.15)',
                  }}
                >
                  {isOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <span className="text-4xl font-bold tabular-nums" style={{ color: LP.bone, fontFamily: LP.mono }}>
                {time}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
