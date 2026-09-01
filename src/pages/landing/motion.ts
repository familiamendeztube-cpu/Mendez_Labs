import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';

let registered = false;

/** Register GSAP plugins and the shared luxury easing curves. Idempotent. */
export function registerMotion() {
  if (registered) return;
  registered = true;
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
  // Jesko-style curves: fast start, long soft settle.
  CustomEase.create('lux', '0.625, 0.05, 0, 1');
  CustomEase.create('luxIn', '0.55, 0, 1, 0.45');
  // Heavier pull-up: near-vertical launch, long decelerating glide.
  CustomEase.create('pull', '0.16, 1, 0.3, 1');
}

export function prefersReducedMotion(settingsReduced: boolean): boolean {
  return (
    settingsReduced ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}

/** Weighted smooth scroll for the landing page only. Synced to ScrollTrigger. */
export function useLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    registerMotion();
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      gsap.ticker.lagSmoothing(500, 33); // restore default
    };
  }, [enabled]);
}

/** Masked line reveal (SplitText `mask: 'lines'`). Call inside a gsap.context. */
export function revealLines(el: Element, vars: gsap.TweenVars = {}) {
  const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
  return gsap.from(split.lines, {
    yPercent: 120,
    duration: 1.3,
    stagger: 0.11,
    ease: 'pull',
    ...vars,
  });
}

/** Masked word pull-up — Jesko's chunky per-word headline reveal. */
/** Masked per-character pull-up — the tightest agency headline reveal. */
export function revealChars(el: Element, vars: gsap.TweenVars = {}) {
  const split = SplitText.create(el, { type: 'chars,lines', mask: 'lines' });
  return gsap.from(split.chars, {
    yPercent: 120, duration: 1.0, stagger: 0.028, ease: 'pull', ...vars,
  });
}

export function revealWords(el: Element, vars: gsap.TweenVars = {}) {
  const split = SplitText.create(el, { type: 'words,lines', mask: 'lines' });
  return gsap.from(split.words, {
    yPercent: 130,
    duration: 1.15,
    stagger: 0.055,
    ease: 'pull',
    ...vars,
  });
}
