import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion } from './motion';
import { LP } from './theme';

interface Chip {
  label: string;
  top: string;    // CSS top within the host section
  left?: string;
  right?: string;
  speed: number;  // parallax intensity: yPercent travelled over the section
  blur?: boolean; // depth-of-field for background chips
}

/**
 * Decorative market chips that drift vertically at different speeds while the
 * host section scrolls past — the Jesko "objects floating through the page"
 * layer. Symbols only, no prices: nothing here fabricates market data.
 * Render inside a `relative` section; chips are absolutely positioned.
 */
export function FloatingChips({ chips, dark = true }: { chips: Chip[]; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    registerMotion();
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-chip]').forEach((chip, i) => {
        const speed = chips[i]?.speed ?? 40;
        gsap.fromTo(chip,
          { yPercent: speed },
          {
            yPercent: -speed,
            ease: 'none',
            scrollTrigger: {
              trigger: ref.current!.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });
      });
    }, ref);
    return () => ctx.revert();
  }, [chips]);

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
      {chips.map((c, i) => (
        <span
          key={i}
          data-chip
          className="absolute flex items-center gap-2 rounded-full px-4 py-2 text-[11px] tracking-[0.2em]"
          style={{
            top: c.top,
            left: c.left,
            right: c.right,
            fontFamily: LP.mono,
            color: dark ? 'rgba(232,226,214,0.55)' : 'rgba(16,19,18,0.55)',
            border: `1px solid ${dark ? 'rgba(232,226,214,0.14)' : 'rgba(16,19,18,0.14)'}`,
            background: dark ? 'rgba(10,14,12,0.6)' : 'rgba(242,237,228,0.6)',
            backdropFilter: 'blur(4px)',
            filter: c.blur ? 'blur(2px)' : 'none',
            opacity: c.blur ? 0.55 : 0.9,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: LP.emerald }}
          />
          {c.label}
        </span>
      ))}
    </div>
  );
}
