# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/pages/Entrance.tsx` with a Jesko-Jets-grade cinematic landing page: Lenis smooth-scroll, GSAP-driven motion, scroll-animated dark↔ivory theme, trading-first narrative, boxing brand kept.

**Architecture:** New `src/pages/landing/` directory — one component per chapter, shared motion utilities in `motion.ts`, palette in `theme.ts`. `Landing.tsx` owns the Lenis lifecycle and the scroll-driven background-theme animation. Hero uses CSS `position: sticky` staging with GSAP scrubbed timelines (more robust than ScrollTrigger pinning under React). During development the new page is reachable at `#/landing-preview` while `Entrance.tsx` keeps serving real traffic; the final task swaps them and deletes `Entrance.tsx`.

**Tech Stack:** React 18 + TS + Vite, Tailwind 3 (existing), GSAP ^3.15 with ScrollTrigger + SplitText + CustomEase (all already installed — SplitText/CustomEase are free since GSAP 3.13), `lenis` (new dep, ~4 KB), existing Supabase auth via `useStore()`.

## Global Constraints

- **The scrolling theme MUST animate**: root background crossfades carbon `#030605` ↔ ivory `#F2EDE4` as sections enter (owner's explicit requirement).
- **All movement MUST be GSAP-driven** (ScrollTrigger scrub/toggle, SplitText masked reveals, CustomEase curves). No CSS keyframe animations for reveals. (Owner's explicit requirement.)
- Node is only available after `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"` — prepend to every npm/npx command.
- `npm run typecheck` has 13 PRE-EXISTING errors (in Entrance.tsx, TopBar.tsx, StoreContext.tsx, tests, etc.). Gate: **zero errors mentioning `src/pages/landing/`**. Final task re-checks whole-project delta after Entrance.tsx is deleted.
- No fabricated statistics anywhere. Spec grids show factual platform capabilities, not invented numbers.
- Reduced motion (`settings.reducedMotion` OR `prefers-reduced-motion`): no Lenis, no animations; all content visible statically. All entrance animations use `gsap.from()` so the natural DOM state is the final state.
- Reuse existing assets: `/assets/boxing/fighter-cinematic.webp`, `/assets/boxing/gloves-cinematic.webp`, `/assets/boxing/belt-cinematic-v2.webp`.
- Dev server: `npm run dev` → http://localhost:5173. Preview URL during development: `http://localhost:5173/#/landing-preview`.
- Commit after every task with the message given in the task.

---

### Task 1: Foundation — Lenis, motion utils, theme, Landing shell with animated theme

**Files:**
- Create: `src/pages/landing/theme.ts`
- Create: `src/pages/landing/motion.ts`
- Create: `src/pages/landing/Landing.tsx`
- Modify: `src/App.tsx` (add temporary preview branch in `AppContent`)
- Modify: `package.json` (via `npm install lenis`)

**Interfaces:**
- Produces: `LP` palette object (theme.ts); `registerMotion()`, `useLenis(enabled: boolean)`, `prefersReducedMotion(settingsReduced: boolean): boolean`, `revealLines(el: Element, vars?: gsap.TweenVars): gsap.core.Tween` (motion.ts); `<Landing />` component. Chapters added in later tasks each receive prop `reduced: boolean` and must set `data-lp-theme="dark"` or `"light"` on their `<section>` — the shell's theme animation keys off that attribute.

- [ ] **Step 1: Install lenis**

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && npm install lenis
```

Expected: `added 1 package`. Version ^1.x.

- [ ] **Step 2: Create `src/pages/landing/theme.ts`**

```ts
// Landing-page palette and type constants. "LP" = Landing Page.
export const LP = {
  carbon: '#030605',
  surface: '#0A0E0C',
  ivory: '#F2EDE4',
  bone: '#E8E2D6',
  inkOnIvory: '#101312',
  mutedOnIvory: '#6B6558',
  textOnDark: '#E8E2D6',
  mutedOnDark: '#8A8F8A',
  emerald: '#20C878',
  emeraldDeep: '#0E8A4E',
  gold: '#B58A3A',
  borderDark: 'rgba(232,226,214,0.10)',
  borderLight: 'rgba(16,19,18,0.12)',
  display: "'Sora', 'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;
```

- [ ] **Step 3: Create `src/pages/landing/motion.ts`**

```ts
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
    yPercent: 110,
    duration: 1.1,
    stagger: 0.09,
    ease: 'lux',
    ...vars,
  });
}
```

- [ ] **Step 4: Create `src/pages/landing/Landing.tsx`** (shell with placeholder chapters; real chapters replace these placeholders task by task)

```tsx
import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '@/store/StoreContext';
import { registerMotion, useLenis, prefersReducedMotion } from './motion';
import { LP } from './theme';

function Placeholder({ theme, label }: { theme: 'dark' | 'light'; label: string }) {
  return (
    <section
      data-lp-theme={theme}
      className="flex min-h-screen items-center justify-center"
    >
      <h2
        className="text-5xl font-bold"
        style={{
          color: theme === 'dark' ? LP.textOnDark : LP.inkOnIvory,
          fontFamily: LP.display,
        }}
      >
        {label}
      </h2>
    </section>
  );
}

export function Landing() {
  const { settings } = useStore();
  const reduced = prefersReducedMotion(settings.reducedMotion);
  useLenis(!reduced);
  const rootRef = useRef<HTMLDivElement>(null);

  // ── Animated theme: root background crossfades as sections enter ──
  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-lp-theme]').forEach((sec) => {
        const dark = sec.dataset.lpTheme === 'dark';
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 55%',
          end: 'bottom 45%',
          onToggle: (self) => {
            if (self.isActive) {
              gsap.to(rootRef.current, {
                backgroundColor: dark ? LP.carbon : LP.ivory,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: 'auto',
              });
            }
          },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div
      ref={rootRef}
      className="relative"
      style={{ backgroundColor: LP.carbon, overflowX: 'clip' }}
    >
      <Placeholder theme="dark" label="Hero" />
      <Placeholder theme="dark" label="Manifesto" />
      <Placeholder theme="light" label="The Terminal" />
      <Placeholder theme="dark" label="Markets Never Sleep" />
      <Placeholder theme="light" label="The Sports Lab" />
      <Placeholder theme="dark" label="Footer" />
    </div>
  );
}
```

- [ ] **Step 5: Add temporary preview branch to `src/App.tsx`**

In `AppContent`, add the import and change the unauthenticated return:

```tsx
import { Landing } from '@/pages/landing/Landing';
```

Replace the line `if (!authenticated) return <Entrance />;` with:

```tsx
  if (!authenticated) {
    // TEMP: preview route for the new landing page (removed in final cutover task)
    if (window.location.hash.includes('landing-preview')) return <Landing />;
    return <Entrance />;
  }
```

- [ ] **Step 6: Verify typecheck and build**

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "landing" ; npm run build 2>&1 | tail -3
```

Expected: grep prints nothing (no landing errors); build ends `✓ built in …s`.

- [ ] **Step 7: Browser verify**

Ensure dev server runs (`npm run dev` with nvm preamble, background). Navigate the browser pane to `http://localhost:5173/#/landing-preview`. Scroll through all six placeholders. Expected: scrolling feels inertial/weighted (Lenis); the page background visibly crossfades carbon→ivory as "The Terminal" enters and back to carbon after it, again for "The Sports Lab". Screenshot at a light section to confirm.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(landing): foundation — lenis smooth scroll, motion utils, animated theme shell"
```

---

### Task 2: PillCta — persistent CTA + sign-in panel

**Files:**
- Create: `src/pages/landing/PillCta.tsx`
- Modify: `src/pages/landing/Landing.tsx` (render `<PillCta />` after the sections)

**Interfaces:**
- Consumes: `useStore()` → `signIn(email, password)`, `signUp(email, password)`, `clearAuthError()`; `LP` from theme.
- Produces: `<PillCta />` — self-contained fixed pill + modal sign-in panel. No props.

- [ ] **Step 1: Create `src/pages/landing/PillCta.tsx`**

```tsx
import { useState } from 'react';
import { ArrowRight, LockKeyhole, X } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { LP } from './theme';

export function PillCta() {
  const { signIn, signUp, clearAuthError } = useStore();
  const [open, setOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    clearAuthError();
    if (!email || !password) { setError('Email and password required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      if (isSignUp) await signUp(email, password);
      else await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Persistent pill — Jesko's "Book the Flight" */}
      <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2" data-lp-pill>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 rounded-full py-3 pl-7 pr-3 text-sm font-bold tracking-wide transition-transform hover:scale-[1.03]"
          style={{
            background: LP.bone,
            color: LP.carbon,
            fontFamily: LP.display,
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          }}
        >
          Enter the Terminal
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: LP.carbon }}
          >
            <ArrowRight className="h-4 w-4" style={{ color: LP.emerald }} />
          </span>
        </button>
      </div>

      {/* Sign-in panel */}
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: 'rgba(3,6,5,0.72)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: LP.surface, border: `1px solid ${LP.borderDark}` }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4" style={{ color: LP.emerald }} />
                <span className="text-sm font-bold tracking-widest" style={{ color: LP.textOnDark, fontFamily: LP.display }}>
                  {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
                </span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" style={{ color: LP.mutedOnDark }} />
              </button>
            </div>
            <input
              type="email" value={email} autoFocus placeholder="Email" aria-label="Email"
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="mb-3 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${LP.borderDark}`, color: LP.textOnDark }}
            />
            <input
              type="password" value={password} placeholder="Password" minLength={6} aria-label="Password"
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="mb-3 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${LP.borderDark}`, color: LP.textOnDark }}
            />
            {error && <p className="mb-3 text-xs" style={{ color: '#D94550', fontFamily: LP.mono }}>{error}</p>}
            <button
              type="submit" disabled={submitting}
              className="w-full rounded-lg py-2.5 text-sm font-bold"
              style={{
                background: `linear-gradient(135deg, ${LP.emerald}, ${LP.emeraldDeep})`,
                color: LP.carbon, opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Please wait…' : isSignUp ? 'CREATE ACCOUNT' : 'ENTER'}
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp((v) => !v); setError(''); }}
              className="mt-3 w-full text-center text-xs underline"
              style={{ color: LP.mutedOnDark }}
            >
              {isSignUp ? 'Have an account? Sign in' : 'New? Create account'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Render it in `Landing.tsx`**

Add `import { PillCta } from './PillCta';` and place `<PillCta />` as the last child inside the root `<div ref={rootRef}>`.

- [ ] **Step 3: Verify**

Typecheck/build command from Task 1 Step 6 (same expectations). In the browser preview: pill floats bottom-center at every scroll position; clicking opens the panel; submitting bogus credentials shows a Supabase error message inline; a valid sign-in navigates into the app (test with real credentials, then sign out from the app — note: in-app logout button is known-broken, so clear the session by `localStorage.clear()` in devtools console or use a private window).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(landing): persistent pill CTA with sign-in panel"
```

---

### Task 3: Preloader

**Files:**
- Create: `src/pages/landing/Preloader.tsx`
- Modify: `src/pages/landing/Landing.tsx` (render `<Preloader reduced={reduced} />` first)

**Interfaces:**
- Produces: `<Preloader reduced={boolean} />`; exported `introAlreadySeen(): boolean` (sessionStorage flag `lp-intro`) — Task 4's Hero uses it to pick its entrance delay.

- [ ] **Step 1: Create `src/pages/landing/Preloader.tsx`**

```tsx
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
          className="text-4xl font-bold tracking-[0.3em] sm:text-6xl"
          style={{ color: LP.bone, fontFamily: LP.display }}
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
```

- [ ] **Step 2: Render in `Landing.tsx`** — `import { Preloader } from './Preloader';` and place `<Preloader reduced={reduced} />` as the FIRST child of the root div.

- [ ] **Step 3: Verify** — typecheck/build as before. Browser: hard-reload the preview in a fresh session (devtools console: `sessionStorage.clear()` then reload). Expected: letters stagger up, gold line sweeps, tag fades, whole screen lifts like a curtain revealing the page. Reloading again skips it (sessionStorage). No landing typecheck errors.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(landing): cinematic preloader with curtain reveal"
```

---

### Task 4: Hero — pinned fighter, split headline, scroll push-in

**Files:**
- Create: `src/pages/landing/Hero.tsx`
- Modify: `src/pages/landing/Landing.tsx` (replace the "Hero" placeholder)

**Interfaces:**
- Consumes: `introAlreadySeen()` from `./Preloader`; `registerMotion`, `revealLines` from `./motion`; `LP`.
- Produces: `<Hero reduced={boolean} />`.

- [ ] **Step 1: Create `src/pages/landing/Hero.tsx`**

```tsx
import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { registerMotion, revealLines } from './motion';
import { introAlreadySeen } from './Preloader';
import { LP } from './theme';

export function Hero({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement>(null);
  const fighterRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const delay = introAlreadySeen() ? 0.3 : 2.6;
    const ctx = gsap.context(() => {
      // ── Entrance (plays once after preloader) ──
      const upper = trackRef.current!.querySelector('[data-hero-upper]')!;
      const lower = trackRef.current!.querySelector('[data-hero-lower]')!;
      revealLines(upper, { delay });
      revealLines(lower, { delay: delay + 0.15 });
      gsap.from(fighterRef.current, {
        opacity: 0, scale: 1.06, duration: 1.6, ease: 'lux', delay: delay - 0.2,
      });
      gsap.from('[data-hero-sub]', {
        opacity: 0, y: 14, duration: 0.8, ease: 'lux', delay: delay + 0.6,
      });
      gsap.from('[data-lp-pill]', {
        y: 90, duration: 1, ease: 'lux', delay: delay + 0.8,
      });

      // ── Scroll-driven push-in (scrubbed over the 300vh track) ──
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      });
      tl.fromTo(fighterRef.current,
        { scale: 1, yPercent: 0, filter: 'brightness(0.9)' },
        { scale: 1.55, yPercent: -8, filter: 'brightness(1.15)', ease: 'none', duration: 0.6 }, 0)
        .to(fighterRef.current,
          { scale: 2.4, yPercent: -20, opacity: 0, filter: 'brightness(2) blur(6px)', ease: 'power2.in', duration: 0.4 }, 0.6)
        .to('[data-hero-upper]', { xPercent: -18, opacity: 0, ease: 'none', duration: 0.5 }, 0.25)
        .to('[data-hero-lower]', { xPercent: 18, opacity: 0, ease: 'none', duration: 0.5 }, 0.25)
        .to('[data-hero-spot]', { scale: 1.8, opacity: 0, ease: 'none', duration: 0.5 }, 0.5)
        .to('[data-hero-sub]', { opacity: 0, ease: 'none', duration: 0.2 }, 0.2);
    }, trackRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={trackRef} data-lp-theme="dark" style={{ height: '300vh' }}>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Ring spotlight */}
        <div
          data-hero-spot
          className="absolute left-1/2 top-1/2 h-[85vmin] w-[85vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(32,200,120,0.10) 0%, rgba(32,200,120,0.03) 45%, transparent 70%)`,
            border: `1px solid ${LP.borderDark}`,
          }}
        />
        {/* Fighter */}
        <div ref={fighterRef} className="relative z-10 h-[72vh] w-auto">
          <img
            src="/assets/boxing/fighter-cinematic.webp"
            alt="Boxer in fighting stance under a ring spotlight"
            className="h-full w-auto object-contain"
            draggable={false}
          />
        </div>
        {/* Split headline */}
        <h1
          data-hero-upper
          className="absolute left-[6vw] top-[16vh] z-20 font-bold leading-[0.95]"
          style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(2.4rem, 7vw, 7rem)' }}
        >
          We are<br />discipline
        </h1>
        <h1
          data-hero-lower
          className="absolute bottom-[18vh] right-[6vw] z-20 text-right font-bold leading-[0.95]"
          style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(2.4rem, 7vw, 7rem)' }}
        >
          We are<br />edge
        </h1>
        <p
          data-hero-sub
          className="absolute bottom-[8vh] left-1/2 z-20 -translate-x-1/2 text-center text-xs tracking-[0.35em]"
          style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}
        >
          A PRIVATE TRADING TERMINAL · BUILT LIKE A FIGHTER
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into `Landing.tsx`** — `import { Hero } from './Hero';`, replace `<Placeholder theme="dark" label="Hero" />` with `<Hero reduced={reduced} />`.

- [ ] **Step 3: Verify** — typecheck/build. Browser (fresh session so preloader runs): after the curtain lift, headlines reveal line-by-line from behind masks (not fades), fighter fades/scales in, pill slides up. Scrolling: fighter pushes toward camera over ~2 viewport-heights while headlines drift outward, then fighter blows out bright and the section releases. Screenshot mid-push.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(landing): hero — sticky fighter push-in with masked split headline"
```

---

### Task 5: Manifesto

**Files:**
- Create: `src/pages/landing/Manifesto.tsx`
- Modify: `src/pages/landing/Landing.tsx` (replace the "Manifesto" placeholder)

**Interfaces:**
- Consumes: `registerMotion` from `./motion`, `SplitText` via gsap, `LP`.
- Produces: `<Manifesto reduced={boolean} />`.

- [ ] **Step 1: Create `src/pages/landing/Manifesto.tsx`**

```tsx
import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { registerMotion } from './motion';
import { LP } from './theme';

const COPY =
  'The market is a fight. Every session, someone takes a hit. The ones left standing are never the fastest — they are the best prepared. Mendez Labs is a private intelligence terminal built on one belief: train harder than the market moves.';

export function Manifesto({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      const el = ref.current!.querySelector('[data-manifesto]')!;
      const split = SplitText.create(el, { type: 'lines' });
      // Each line brightens from muted to full as it crosses the viewport center.
      split.lines.forEach((line) => {
        gsap.fromTo(line,
          { color: 'rgba(232,226,214,0.18)' },
          {
            color: LP.bone,
            ease: 'none',
            scrollTrigger: { trigger: line, start: 'top 75%', end: 'top 45%', scrub: true },
          });
      });
      gsap.from('[data-manifesto-tag]', {
        opacity: 0, y: 12, duration: 0.8, ease: 'lux',
        scrollTrigger: { trigger: ref.current, start: 'top 70%' },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={ref} data-lp-theme="dark" className="flex min-h-screen items-center px-[6vw] py-[20vh]">
      <div className="mx-auto max-w-5xl">
        <p data-manifesto-tag className="mb-8 text-xs tracking-[0.4em]" style={{ color: LP.gold, fontFamily: LP.mono }}>
          01 — THE PHILOSOPHY
        </p>
        <p
          data-manifesto
          className="font-semibold leading-[1.25]"
          style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(1.5rem, 3.4vw, 3.2rem)' }}
        >
          {COPY}
        </p>
        <p className="mt-10 text-sm tracking-widest" style={{ color: LP.emerald, fontFamily: LP.mono }}>
          STUDY. SIZE THE RISK. STRIKE ONCE.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into `Landing.tsx`** — replace the Manifesto placeholder with `<Manifesto reduced={reduced} />`.

- [ ] **Step 3: Verify** — typecheck/build. Browser: as you scroll, each line of the paragraph brightens from faint to full ivory tied to scroll position (scrub — reversing scroll reverses it).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(landing): manifesto with scroll-scrubbed line brightening"
```

---

### Task 6: TerminalShowcase — ivory editorial section with spec grid

**Files:**
- Create: `src/pages/landing/TerminalShowcase.tsx`
- Modify: `src/pages/landing/Landing.tsx` (replace "The Terminal" placeholder)

**Interfaces:**
- Consumes: `registerMotion`, `revealLines` from `./motion`; `LP`.
- Produces: `<TerminalShowcase reduced={boolean} />`. Section uses `data-lp-theme="light"` — the shell animates the page background to ivory when it enters.

- [ ] **Step 1: Create `src/pages/landing/TerminalShowcase.tsx`**

```tsx
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
```

- [ ] **Step 2: Wire into `Landing.tsx`** — replace the placeholder with `<TerminalShowcase reduced={reduced} />`.

- [ ] **Step 3: Verify** — typecheck/build. Browser: page background animates dark→ivory as the section enters (and back to dark when leaving); headline reveals in masked lines; terminal frame rises; the emerald equity curve DRAWS itself tied to scroll; spec rows stagger in.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(landing): terminal showcase — ivory editorial section with drawing equity curve"
```

---

### Task 7: MarketSessions — live clocks, session arcs, ghost type

**Files:**
- Create: `src/pages/landing/MarketSessions.tsx`
- Modify: `src/pages/landing/Landing.tsx` (replace "Markets Never Sleep" placeholder)

**Interfaces:**
- Consumes: `registerMotion` from `./motion`; `LP`.
- Produces: `<MarketSessions reduced={boolean} />`. Clock data is real (Intl API), status computed from actual exchange hours.

- [ ] **Step 1: Create `src/pages/landing/MarketSessions.tsx`**

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { registerMotion } from './motion';
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

      <p className="mb-6 text-xs tracking-[0.4em]" style={{ color: LP.gold, fontFamily: LP.mono }}>
        03 — MARKETS NEVER SLEEP
      </p>
      <h2
        className="mb-16 max-w-3xl font-bold leading-[1.02]"
        style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(2.2rem, 5.5vw, 5rem)' }}
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
            stroke={i === 1 ? LP.emerald : LP.borderDark.replace('0.10', '0.35')}
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
```

- [ ] **Step 2: Wire into `Landing.tsx`** — replace the placeholder with `<MarketSessions reduced={reduced} />`.

- [ ] **Step 3: Verify** — typecheck/build. Browser: page returns to dark theme entering this section; three clocks tick every second showing correct local times (cross-check one against the system clock); OPEN/CLOSED status plausible for current UTC time; arcs draw with scroll; ghost "GLOBAL" parallaxes slower than content.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(landing): market sessions — live exchange clocks with scroll-drawn arcs"
```

---

### Task 8: SportsLab + LandingFooter

**Files:**
- Create: `src/pages/landing/SportsLab.tsx`
- Create: `src/pages/landing/LandingFooter.tsx`
- Modify: `src/pages/landing/Landing.tsx` (replace the last two placeholders)

**Interfaces:**
- Consumes: `registerMotion`, `revealLines` from `./motion`; `LP`.
- Produces: `<SportsLab reduced={boolean} />`, `<LandingFooter reduced={boolean} />`.

- [ ] **Step 1: Create `src/pages/landing/SportsLab.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/pages/landing/LandingFooter.tsx`**

```tsx
import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { registerMotion } from './motion';
import { LP } from './theme';

export function LandingFooter({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    registerMotion();
    const ctx = gsap.context(() => {
      const mark = ref.current!.querySelector('[data-foot-mark]')!;
      const split = SplitText.create(mark, { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, {
        yPercent: 110, stagger: 0.03, duration: 0.9, ease: 'lux',
        scrollTrigger: { trigger: ref.current, start: 'top 70%' },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={ref} data-lp-theme="dark" className="flex min-h-[70vh] flex-col justify-end px-[6vw] pb-28 pt-[14vh]">
      <p className="mb-4 text-xs tracking-[0.4em]" style={{ color: LP.mutedOnDark, fontFamily: LP.mono }}>
        PRIVATE INTELLIGENCE TERMINAL — TRADING FIRST, SPORTS LAB SECOND
      </p>
      <h2
        data-foot-mark
        className="font-bold leading-[0.95]"
        style={{ color: LP.bone, fontFamily: LP.display, fontSize: 'clamp(3rem, 12vw, 11rem)' }}
      >
        MENDEZ LABS
      </h2>
      <div
        className="mt-10 flex items-center justify-between pt-6 text-xs"
        style={{ borderTop: `1px solid ${LP.borderDark}`, color: LP.mutedOnDark, fontFamily: LP.mono }}
      >
        <span>© 2026 MENDEZ LABS. BUILT FOR ONE.</span>
        <span style={{ color: LP.emerald }}>PAPER → LIVE</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Wire both into `Landing.tsx`** — replace the last two placeholders with `<SportsLab reduced={reduced} />` and `<LandingFooter reduced={reduced} />`. Remove the now-unused `Placeholder` component from `Landing.tsx`.

- [ ] **Step 4: Verify** — typecheck/build. Browser: theme swaps to ivory for Sports Lab (gloves parallax while scrolling) and back to dark for the footer; giant wordmark reveals character-by-character from masks; pill CTA still floats above everything.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(landing): sports lab and footer chapters"
```

---

### Task 9: Cutover — replace Entrance, delete old page, QA sweep

**Files:**
- Modify: `src/App.tsx` (remove preview branch and Entrance import; render `<Landing />` for unauthenticated)
- Delete: `src/pages/Entrance.tsx`

**Interfaces:**
- Consumes: everything above. Produces the shipped page.

- [ ] **Step 1: Swap in `src/App.tsx`**

Remove `import { Entrance } from '@/pages/Entrance';` and the temporary preview branch. The unauthenticated path becomes exactly:

```tsx
  if (!authenticated) return <Landing />;
```

- [ ] **Step 2: Delete the old page**

```bash
git rm src/pages/Entrance.tsx
```

Then grep for stragglers: `grep -rn "Entrance" src/` — expected: no results. If any file still imports it, remove that import.

- [ ] **Step 3: Full verification**

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && npx tsc --noEmit -p tsconfig.app.json 2>&1 | tee /tmp/tsc-after.txt | grep -c "error TS"
```

Expected: ≤ 11 (the 13 pre-existing errors minus the 2 that lived in Entrance.tsx: `StaggerChildren` usage may remain — acceptance is: no errors referencing `src/pages/landing/` and no NEW files in the error list vs. before).

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && npm run build 2>&1 | tail -5
```

Expected: build succeeds; main JS chunk within ~10 KB gzip of the pre-project size (Lenis only; GSAP plugins were already bundled).

- [ ] **Step 4: Browser QA sweep**

At `http://localhost:5173/` (root, no preview hash, fresh session):
1. Desktop: full scroll-through — preloader → hero push-in → manifesto brighten → ivory terminal → dark sessions → ivory sports lab → dark footer. Theme crossfades at every boundary. Screenshot each chapter.
2. Mobile (resize to 375×812): full scroll-through; headlines wrap cleanly via clamp(); no horizontal scroll; pill CTA fits.
3. Reduced motion (emulate `prefers-reduced-motion: reduce`, reload): all content visible immediately, native scroll, no pinning; sign-in panel still works.
4. Sign-in from the pill with real credentials → lands in the app.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(landing): cut over to new landing page, remove Entrance"
```

---

## Self-Review Notes

- Spec coverage: preloader (T3), hero pin+split headline+pill (T2/T4), manifesto (T5), ivory terminal + spec grid (T6), market clocks + arcs + ghost type (T7), sports lab + footer (T8), Lenis + animated theme (T1), reduced motion (all tasks via `reduced` prop + `gsap.from`), auth preserved (T2), Entrance deleted (T9), mobile via clamp/vw units + T9 QA. Live-Alpaca-stats-when-signed-in is moot pre-auth; spec's honest-static-copy fallback is the implemented path (factual capability rows, no invented numbers).
- Types: `reduced: boolean` prop consistent across chapters; `revealLines(el, vars)` signature matches all call sites; `introAlreadySeen()` exported from Preloader, consumed only by Hero.
