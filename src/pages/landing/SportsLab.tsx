import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealWords } from './motion';
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
      gsap.from(ref.current, {
        y: 110, duration: 1.3, ease: 'lux',
        scrollTrigger: { trigger: ref.current, start: 'top 92%' },
      });
      revealWords(ref.current!.querySelector('[data-sl-head]')!, {
        scrollTrigger: { trigger: ref.current, start: 'top 65%' },
      });
      gsap.from('[data-sl-row]', {
        opacity: 0, x: -60, stagger: 0.08, duration: 0.8, ease: 'lux',
        scrollTrigger: { trigger: '[data-sl-grid]', start: 'top 78%' },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={ref}
      id="sports-lab"
      data-lp-theme="light"
      className="relative px-[6vw] pt-[14vh]"
      style={{ background: LP.ivory }}
    >
      <p className="mb-6 text-xs tracking-[0.4em]" style={{ color: LP.gold, fontFamily: LP.mono }}>
        04 — THE SPORTS LAB
      </p>
      <div className="mx-auto max-w-4xl">
        <h2
          data-sl-head
          className="mb-12 font-semibold"
          style={{ color: LP.inkOnIvory, fontFamily: LP.displayHero, fontSize: 'clamp(2.2rem, 5.5vw, 5.5rem)', lineHeight: 1.05, letterSpacing: '-0.01em' }}
        >
          The second discipline
        </h2>
        <div data-sl-grid>
          {SPECS.map(([label, value]) => (
            <div
              key={label}
              data-sl-row
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
      </div>

      {/* Atmospheric handoff: ivory settles through bronze into the
          espresso footer. */}
      <div
        aria-hidden="true"
        className="-mx-[6vw] mt-[12vh] h-[38vh]"
        style={{
          background: `linear-gradient(180deg, ${LP.ivory} 0%, #C9B592 45%, #5C4B34 78%, ${LP.carbon} 100%)`,
        }}
      />
    </section>
  );
}
