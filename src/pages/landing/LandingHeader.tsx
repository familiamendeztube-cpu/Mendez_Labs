import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion } from './motion';
import { introAlreadySeen } from './Preloader';
import { LP } from './theme';

/** Fixed top bar — centered wordmark + rounded menu chip, Jesko-style. */
export function LandingHeader({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const delay = introAlreadySeen() ? 0.2 : 2.5;
    const ctx = gsap.context(() => {
      gsap.from('[data-hd-item]', {
        y: -28, opacity: 0, stagger: 0.1, duration: 1, ease: 'lux', delay,
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  const NAV: Array<[string, string]> = [
    ['Philosophy', 'philosophy'],
    ['Terminal', 'terminal'],
    ['Markets', 'markets'],
    ['Sports Lab', 'sports-lab'],
  ];

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex items-center justify-between px-4 py-4 lg:px-8 lg:py-5"
      style={{
        background: 'linear-gradient(180deg, rgba(8,12,17,0.55) 0%, rgba(8,12,17,0.28) 55%, transparent 100%)',
        backdropFilter: 'blur(2px)',
      }}
    >
      {/* Left: editorial nav — scrolls to chapters */}
      <nav className="pointer-events-auto hidden items-center gap-6 lg:flex" style={{ mixBlendMode: 'difference' }}>
        {NAV.map(([label, id]) => (
          <button
            key={id}
            data-hd-item
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
            className="text-xs font-bold tracking-wide transition-opacity hover:opacity-70"
            style={{ color: LP.bone, fontFamily: LP.display }}
          >
            {label}
          </button>
        ))}
      </nav>

      <span
        data-hd-item
        className="absolute left-1/2 -translate-x-1/2 text-lg font-bold tracking-[0.18em] lg:text-xl"
        style={{ color: LP.bone, fontFamily: LP.display, mixBlendMode: 'difference' }}
      >
        Mendez Labs
      </span>

      <span
        data-hd-item
        className="pointer-events-auto mr-3 hidden rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.3em] sm:inline-block"
        style={{
          color: LP.gold,
          border: '1px solid rgba(143,182,218,0.35)',
          background: 'rgba(27,21,17,0.35)',
          backdropFilter: 'blur(8px)',
          fontFamily: LP.mono,
          marginLeft: 'auto',
        }}
      >
        PRIVATE
      </span>
      <button
        data-hd-item
        aria-label="Open sign in"
        onClick={() => window.dispatchEvent(new CustomEvent('lp:open-auth'))}
        className="pointer-events-auto flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-2xl transition-transform hover:scale-105"
        style={{
          background: 'rgba(232,226,214,0.10)',
          border: `1px solid ${LP.borderDark}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <span className="h-px w-4" style={{ background: LP.bone }} />
        <span className="h-px w-4" style={{ background: LP.bone }} />
      </button>
    </div>
  );
}
