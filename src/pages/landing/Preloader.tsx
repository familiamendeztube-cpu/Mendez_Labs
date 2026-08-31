import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { registerMotion } from './motion';
import { LP } from './theme';

const KEY = 'lp-intro';

export function introAlreadySeen(): boolean {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function Preloader({ reduced }: { reduced: boolean }) {
  const [done, setDone] = useState(() => reduced || introAlreadySeen());
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (done) return;
    registerMotion();
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
          setDone(true);
        },
      });
      tl.from('[data-pre-letter]', {
        yPercent: 120, opacity: 0, duration: 0.7, stagger: 0.04, ease: 'lux',
      })
        .from('[data-pre-line]', { scaleX: 0, duration: 0.6, ease: 'lux' }, '-=0.2')
        .from('[data-pre-tag]', { opacity: 0, y: 10, duration: 0.4, ease: 'lux' }, '-=0.3')
        .to(rootRef.current, { yPercent: -100, duration: 0.9, ease: 'luxIn', delay: 0.35 });
    }, rootRef);
    return () => ctx.revert();
  }, [done]);

  if (done) return null;

  const word = 'MENDEZ LABS';
  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: LP.carbon }}
    >
      <div className="overflow-hidden">
        <h1
          className="text-3xl font-semibold tracking-[0.25em] sm:text-5xl"
          style={{ color: LP.bone, fontFamily: LP.displayHero }}
        >
          {word.split('').map((ch, i) => (
            <span key={i} data-pre-letter className="inline-block whitespace-pre">{ch}</span>
          ))}
        </h1>
      </div>
      <div
        data-pre-line
        className="mt-6 h-px w-40 origin-left"
        style={{ background: LP.gold }}
      />
      <p
        data-pre-tag
        className="mt-4 text-xs tracking-[0.4em]"
        style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}
      >
        INTELLIGENCE TERMINAL
      </p>
    </div>
  );
}
