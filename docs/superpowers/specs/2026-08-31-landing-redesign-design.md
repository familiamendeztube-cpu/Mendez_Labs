# Landing Page Redesign — "Jesko-grade" Motion

**Date:** 2026-08-31
**Status:** Approved by owner
**Reference:** https://jeskojets.com/ — motion language to be matched as closely as possible

## Goal

Replace the current landing page (`src/pages/Entrance.tsx`) with a premium, cinematic
scroll experience modeled on jeskojets.com. Keep the boxing brand identity. Lead the
narrative with trading (product #1); sports betting is the second act. The page must
stop reading as "AI template" — the specific fixes are weighted smooth-scroll, masked
text reveals, dark↔ivory section alternation, and editorial data layouts.

## What makes the reference feel premium (replication checklist)

1. **Lenis smooth-scroll** — inertial, lerped scrolling. The single biggest feel gap.
2. **Preloader intro** — wordmark alone on dark, then reveal into the hero.
3. **Dark ↔ cream alternation** — near-black sections alternate with warm ivory
   editorial sections.
4. **Masked line/char text reveals** — GSAP SplitText + CustomEase; headlines slide up
   from behind masks. No plain fades.
5. **Set pieces + spec grids** — real data presented like magazine spreads
   (Jesko: aircraft specs; us: live trading stats).
6. **Persistent pill CTA** — floats bottom-center for the whole page
   (Jesko: "Book the Flight"; us: "Enter the Terminal").

## Architecture

- **New directory `src/pages/landing/`** — one component per chapter plus shared
  motion utilities. The old `Entrance.tsx` is deleted once the new page renders the
  auth flow correctly.
- **New dependency: `lenis`** (~4 KB). Instantiated once for the landing page,
  destroyed on unmount (the in-app terminal keeps native scroll). Synced to GSAP
  ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker`.
- **GSAP plugins:** ScrollTrigger (already used), SplitText, CustomEase — all included
  free in the installed GSAP ≥3.13.
- **Assets:** reuse existing `/public/assets/boxing/*.webp|png` (fighter, gloves, belt).
  No new imagery required.
- **Auth:** the existing Supabase email/password flow (`useAuth` via `StoreContext`)
  is preserved. The pill CTA opens the sign-in panel (same form logic, restyled).
- **Live stats:** chapter 3 and 5 pull real numbers where available —
  Alpaca account via existing `alpaca-connector` service, settled-pick history from
  the store. When not authenticated / data unavailable, show honest static copy
  (no fabricated numbers), consistent with the project's no-fake-data principle.
- **Reduced motion:** `settings.reducedMotion` (and `prefers-reduced-motion`)
  disables Lenis and pinning; content renders as a plain scrolling page.
- **Mobile:** same chapters, simplified transforms (match current mobile/desktop
  split via `ScrollTrigger.matchMedia`).

## Page structure (chapters)

| # | Section | Theme | Content & motion |
|---|---------|-------|------------------|
| 0 | Preloader | black | "MENDEZ LABS" letter-tracked reveal, gold line sweep, curtain lift into hero. Runs once per visit. |
| 1 | Hero (pinned) | dark | Fighter under ring spotlight. Split headline: "We are discipline" (upper-left) / "We are edge" (lower-right), masked reveals. Slow scroll-driven push-in. Persistent pill CTA "Enter the Terminal" appears here and stays fixed bottom-center. |
| 2 | Manifesto | dark | Large editorial paragraph, line-by-line masked reveal: markets are a fight, preparation wins. Trading-first framing. |
| 3 | The Terminal | ivory | Background transitions dark→ivory. Framed dashboard preview + editorial spec grid (equity, buying power, positions, session status — real Alpaca data when signed in). |
| 4 | Markets never sleep | dark | Market-session clocks: New York · London · Tokyo with live open/closed status; animated SVG session arcs; oversized ghost type "GLOBAL" behind. No heavy globe library. |
| 5 | The Sports Lab | ivory | Gloves/belt imagery re-staged, Pick Five pitch, real win/loss record from settled history in the same spec-grid style. |
| 6 | Footer | dark | Oversized wordmark, sign-in CTA, minimal contact line. |

## Component breakdown

```
src/pages/landing/
  Landing.tsx          — assembles chapters, owns Lenis lifecycle
  Preloader.tsx
  Hero.tsx
  Manifesto.tsx
  TerminalShowcase.tsx
  MarketSessions.tsx
  SportsLab.tsx
  LandingFooter.tsx
  PillCta.tsx          — persistent CTA + sign-in panel (reuses auth handlers)
  motion.ts            — shared: Lenis setup, CustomEase curves, SplitText helpers,
                          reduced-motion guard
```

Each chapter component owns its own ScrollTrigger context and cleans up on unmount.
No chapter exceeds ~250 lines; shared easing/reveal patterns live in `motion.ts`.

## Palette

- Carbon `#030605` / deep surface `#0A0E0C` (existing)
- **New:** warm ivory `#F2EDE4` / bone `#E8E2D6` for light sections
- Emerald `#20C878` and antique gold `#B58A3A` accents retained
- Section background transitions animated via ScrollTrigger (like Jesko's
  dark↔cream shifts)

## Error handling

- GSAP/SplitText load failure → content is visible by default (reveals are
  progressive enhancement; initial states set via CSS only where JS is confirmed).
- Live stats fetch failure → static editorial copy, no invented numbers.
- Auth errors → surfaced inline in the sign-in panel (existing behavior).

## Testing / acceptance

- `npm run build` and `npm run typecheck` pass for all new files.
- Manual scroll-through at desktop (≥1024px) and mobile widths in the browser pane;
  screenshots at each chapter compared against the reference feel checklist above.
- Reduced-motion mode renders all content without pinning or hijacked scroll.
- Sign-in and sign-up still work end-to-end from the pill CTA.
- Old `Entrance.tsx` removed; no dead imports; bundle does not grow by more than
  ~10 KB gzip (Lenis only).

## Out of scope (later projects, in order)

1. Bug-fix pass: broken logout (`logout` vs `signOut`), typecheck errors, test runner.
2. Premium polish of the in-app terminal (dashboard, sidebar, charts).
3. Real-money trading: enable live Alpaca orders for the owner's own account,
   funding flow, real stats everywhere.
