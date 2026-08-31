import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealLines } from './motion';
import { LP } from './theme';

const SPECS: Array<[string, string]> = [
  ['PICK FIVE', 'Five researched picks, daily'],
  ['SETTLEMENT', 'Verified final scores only'],
  ['MODEL', 'Elo v1 · experimental'],
  ['TRACKING', 'Paper only — never real bets'],
  ['LEAGUES', 'NFL · NBA · MLB · NHL · EPL'],
];

export function SportsLab({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      revealLines(ref.current!.querySelector('[data-sl-head]')!, {
        scrollTrigger: { trigger: ref.current, start: 'top 65%' },
      });
      gsap.fromTo('[data-sl-gloves]',
        { yPercent: 12, rotation: -4 },
        {
          yPercent: -12, rotation: 3, ease: 'none',
          scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      gsap.from('[data-sl-row]', {
        opacity: 0, y: 24, stagger: 0.08, duration: 0.7, ease: 'lux',
        scrollTrigger: { trigger: '[data-sl-grid]', start: 'top 78%' },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={ref} data-lp-theme="light" className="px-[6vw] py-[16vh]">
      <p className="mb-6 text-xs tracking-[0.4em]" style={{ color: LP.gold, fontFamily: LP.mono }}>
        04 — THE SPORTS LAB
      </p>
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <h2
            data-sl-head
            className="mb-10 font-bold leading-[1.02]"
            style={{ color: LP.inkOnIvory, fontFamily: LP.display, fontSize: 'clamp(2.2rem, 5vw, 4.5rem)' }}
          >
            The second discipline
          </h2>
          <div data-sl-grid>
            {SPECS.map(([label, value]) => (
              <div
                key={label}
                data-sl-row
                className="flex items-baseline justify-between py-4"
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
        </div>
        <div className="relative flex items-center justify-center">
          <img
            data-sl-gloves
            src="/assets/boxing/gloves-cinematic.webp"
            alt="Boxing gloves"
            className="max-h-[60vh] w-auto object-contain drop-shadow-2xl"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}
