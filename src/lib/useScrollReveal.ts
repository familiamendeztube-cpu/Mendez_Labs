import { useEffect, useRef } from 'react';

/**
 * Scroll-triggered reveal for in-app sections. Put `data-reveal` on any
 * element inside the returned ref's subtree; each one rises + un-blurs into
 * place as it enters the viewport (staggered by DOM order). Pure
 * IntersectionObserver — no animation library in the app bundle.
 *
 * Respects reduced motion via the CSS guard in index.css.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const rootRef = useRef<T>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (targets.length === 0) return;

    // Stagger by document order within this page.
    targets.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i, 8) * 55}ms`;
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return rootRef;
}
