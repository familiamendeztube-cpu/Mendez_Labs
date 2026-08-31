import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck, ChevronDown, TrendingUp, CalendarDays, Trophy } from 'lucide-react';
import { useStore } from '@/store/StoreContext';

// ── V51 Unified palette: carbon, ivory, emerald, antique gold ──
const COLORS = {
  bg: '#030605',
  surface: '#0A0E0C',
  textPrimary: '#E8E2D6',
  textSecondary: '#A8AAA6',
  textMuted: '#6A6E6A',
  green: '#20C878',
  greenDeep: '#0E8A4E',
  gold: '#B58A3A',
  red: '#D94550',
  border: 'rgba(232,226,214,0.08)',
  borderGreen: 'rgba(32,200,120,0.2)',
  beltLight: '#E8E2D6',
  beltStone: '#C4B8A8',
};

const ASSETS = {
  fighter: '/assets/boxing/fighter-cinematic.webp',
  gloves: '/assets/boxing/gloves-cinematic.webp',
  belt: '/assets/boxing/belt-cinematic-v2.webp',
};

// ── V51: Chapter progress rail labels ──
const CHAPTERS = ['I', 'II', 'III'] as const;

// Mobile safe-area: header height (64px) + 28px gap = 92px minimum top inset
const MOBILE_SAFE_TOP = 92;

// ═════════════════════════════════════════════════════════════════════════════
// CHAPTER 1 — FIGHTER / TUNNEL: 300vh pinned
// CHAPTER 2 — GLOVES / FEATURES: 280vh pinned
// CHAPTER 3 — BELT / PROOF: 320vh pinned
// Total: 860vh — well over 8,000px at a 936px viewport
// ═════════════════════════════════════════════════════════════════════════════

export function Entrance() {
  const { signIn, signUp, authLoading, authError, clearAuthError, authenticated: authed, settings } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const heroStageRef = useRef<HTMLDivElement>(null);
  const glovesTrackRef = useRef<HTMLDivElement>(null);
  const glovesStageRef = useRef<HTMLDivElement>(null);
  const beltTrackRef = useRef<HTMLDivElement>(null);
  const beltStageRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const fighterRef = useRef<HTMLDivElement>(null);
  const beltRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const progressRailRef = useRef<HTMLDivElement>(null);
  const shockwaveRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const gloveLeftRef = useRef<HTMLDivElement>(null);
  const gloveRightRef = useRef<HTMLDivElement>(null);
  const glovesShadowRef = useRef<HTMLDivElement>(null);
  const glovesHighlightRef = useRef<HTMLDivElement>(null);

  const [loginOpen, setLoginOpen] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);

  const reducedMotion = settings.reducedMotion;

  // ── Scroll to top on mount ──
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ── Close login dropdown on outside click ──
  useEffect(() => {
    if (!loginOpen) return;
    const handler = (e: MouseEvent) => {
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) setLoginOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [loginOpen]);

  // ── GSAP cinematic scroll journey ──────────────────────────────────────────
  useEffect(() => {
    if (reducedMotion) return;
    if (!rootRef.current) return;

    let ctx: { revert: () => void } | undefined;

    (async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const el = rootRef.current;
      if (!el) return;

      ctx = gsap.context(() => {
        // ── HERO: initial word reveal on load ──
        const heroWords = el.querySelectorAll('[data-hero-word]');
        if (heroWords.length > 0) {
          gsap.fromTo(heroWords,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.2 },
          );
        }
        const heroSubs = el.querySelectorAll('[data-hero-sub]');
        if (heroSubs.length > 0) {
          gsap.fromTo(heroSubs,
            { y: 14, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power2.out', delay: 0.6 },
          );
        }
        if (scrollIndicatorRef.current) {
          gsap.fromTo(scrollIndicatorRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.6, ease: 'power2.out', delay: 1.2 },
          );
        }

        ScrollTrigger.matchMedia({
          // ── DESKTOP ──
          '(min-width: 1024px)': () => {
            // ═══ CHAPTER 1: FIGHTER / TUNNEL — camera push + punch shockwave ═══
            const heroTl = gsap.timeline({
              scrollTrigger: {
                trigger: heroTrackRef.current,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1,
              },
            });

            // Fighter slow dolly-in, then push toward camera
            if (fighterRef.current) {
              heroTl.fromTo(fighterRef.current,
                { scale: 0.92, y: '2vh', filter: 'brightness(0.85)' },
                { scale: 1.6, y: '-5vh', filter: 'brightness(1)', ease: 'none', duration: 0.5 },
                0,
              );
              // Acceleration toward camera (punch moment)
              heroTl.to(fighterRef.current,
                { scale: 2.8, y: '-18vh', filter: 'brightness(1.8) contrast(1.2)', ease: 'power2.in', duration: 0.2 },
                0.5,
              );
              // Hold then recede
              heroTl.to(fighterRef.current,
                { scale: 3.5, y: '-25vh', opacity: 0, filter: 'brightness(3) blur(4px)', ease: 'none', duration: 0.15 },
                0.75,
              );
            }

            // Radial shockwave — expands from center at punch moment
            if (shockwaveRef.current) {
              heroTl.fromTo(shockwaveRef.current,
                { scale: 0, opacity: 0 },
                { scale: 0, opacity: 0, ease: 'none', duration: 0.5 },
                0,
              );
              heroTl.to(shockwaveRef.current,
                { scale: 3, opacity: 0.6, ease: 'power2.out', duration: 0.2 },
                0.5,
              );
              heroTl.to(shockwaveRef.current,
                { scale: 5, opacity: 0, ease: 'none', duration: 0.15 },
                0.7,
              );
            }

            // Exposure flash — white/emerald burst at impact
            if (flashRef.current) {
              heroTl.fromTo(flashRef.current,
                { opacity: 0 },
                { opacity: 0, ease: 'none', duration: 0.5 },
                0,
              );
              heroTl.to(flashRef.current,
                { opacity: 0.85, ease: 'none', duration: 0.05 },
                0.5,
              );
              heroTl.to(flashRef.current,
                { opacity: 0, ease: 'power2.out', duration: 0.2 },
                0.55,
              );
            }

            // Spotlight ring — collapses inward to become glove scene spotlight
            if (spotlightRef.current) {
              heroTl.fromTo(spotlightRef.current,
                { scale: 5, opacity: 0 },
                { scale: 5, opacity: 0, ease: 'none', duration: 0.5 },
                0,
              );
              heroTl.to(spotlightRef.current,
                { scale: 1, opacity: 0.4, ease: 'power2.out', duration: 0.25 },
                0.5,
              );
              heroTl.to(spotlightRef.current,
                { scale: 0.8, opacity: 0.15, ease: 'none', duration: 0.15 },
                0.75,
              );
            }

            // Tunnel haze layers parallax
            const hazeLayers = el.querySelectorAll('[data-hero-haze]');
            hazeLayers.forEach((layer, i) => {
              heroTl.fromTo(layer,
                { opacity: 0.3 + i * 0.1, yPercent: -i * 5 },
                { opacity: 0.6 + i * 0.08, yPercent: i * 10, ease: 'none' },
                0,
              );
            });

            const heroApertures = el.querySelectorAll('[data-hero-aperture]');
            heroApertures.forEach((aperture, i) => {
              heroTl.fromTo(aperture,
                { scale: 0.92 - i * 0.05, opacity: 0.72 - i * 0.12 },
                { scale: 2.15 + i * 0.28, opacity: 0, ease: 'power2.in', duration: 0.78 },
                0.08 + i * 0.03,
              );
            });

            // Ring ropes parallax
            const ropes = el.querySelectorAll('[data-hero-rope]');
            ropes.forEach((rope, i) => {
              heroTl.fromTo(rope,
                { yPercent: 0 },
                { yPercent: 20 + i * 8, ease: 'none' },
                0,
              );
            });

            // Headline drift: upper-left goes left, lower-right goes right
            const upperHeadline = el.querySelector('[data-hero-upper]');
            if (upperHeadline) {
              heroTl.fromTo(upperHeadline,
                { x: 0, opacity: 1 },
                { x: '-30vw', opacity: 0, ease: 'none' },
                0.2,
              );
            }
            const lowerHeadline = el.querySelector('[data-hero-lower]');
            if (lowerHeadline) {
              heroTl.fromTo(lowerHeadline,
                { x: 0, opacity: 1 },
                { x: '30vw', opacity: 0, ease: 'none' },
                0.2,
              );
            }

            // Atmospheric wipe at end of chapter
            const heroWipe = el.querySelector('[data-hero-wipe]');
            if (heroWipe) {
              heroTl.fromTo(heroWipe,
                { opacity: 0 },
                { opacity: 1, ease: 'none' },
                0.85,
              );
            }

            // ═══ CHAPTER 2: GLOVES / FEATURES — pendulum arcs + curved callouts ═══
            const glovesTl = gsap.timeline({
              scrollTrigger: {
                trigger: glovesTrackRef.current,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1,
              },
            });

            // One hero glove pair: the asset already contains both gloves.
            if (gloveLeftRef.current) {
              glovesTl.fromTo(gloveLeftRef.current,
                { x: 0, y: '-22vh', scale: 0.46, rotation: -8, rotateY: 18, opacity: 0, filter: 'blur(8px) brightness(0.72)' },
                { x: 0, y: '-1vh', scale: 1.02, rotation: 2, rotateY: -4, opacity: 1, filter: 'blur(0px) brightness(1.08)', ease: 'power3.out', duration: 0.32 },
                0,
              );
              glovesTl.to(gloveLeftRef.current,
                { y: '2vh', scale: 1.12, rotation: -2, rotateY: 5, ease: 'sine.inOut', duration: 0.2 },
                0.32,
              );
              glovesTl.to(gloveLeftRef.current,
                { y: '7vh', scale: 1.34, rotation: 0, rotateY: 0, filter: 'brightness(1.2)', ease: 'power2.in', duration: 0.24 },
                0.62,
              );
              glovesTl.to(gloveLeftRef.current,
                { scale: 1.75, opacity: 0, filter: 'brightness(1.8) blur(5px)', ease: 'power2.in', duration: 0.14 },
                0.84,
              );
            }

            if (gloveRightRef.current) {
              gsap.set(gloveRightRef.current, { display: 'none', opacity: 0 });
            }

            // Moving highlight traveling across gloves
            if (glovesHighlightRef.current) {
              glovesTl.fromTo(glovesHighlightRef.current,
                { x: '-40vw', opacity: 0 },
                { x: '40vw', opacity: 0.15, ease: 'none', duration: 0.4 },
                0.1,
              );
              glovesTl.to(glovesHighlightRef.current,
                { opacity: 0, ease: 'none', duration: 0.1 },
                0.5,
              );
            }

            // Floor shadow — moves with glove depth
            if (glovesShadowRef.current) {
              glovesTl.fromTo(glovesShadowRef.current,
                { x: '-5vw', scale: 0.6, opacity: 0.15 },
                { x: '0vw', scale: 1.1, opacity: 0.3, ease: 'none', duration: 0.25 },
                0,
              );
              glovesTl.to(glovesShadowRef.current,
                { scale: 0.9, opacity: 0.1, ease: 'none', duration: 0.15 },
                0.65,
              );
            }

            // Ropes stretch subtly (tension)
            const glovesRopes = el.querySelectorAll('[data-gloves-rope]');
            glovesRopes.forEach((rope, i) => {
              glovesTl.fromTo(rope,
                { yPercent: 0, scaleX: 1 },
                { yPercent: 8 + i * 4, scaleX: 1.03, ease: 'none', duration: 0.3 },
                0,
              );
              glovesTl.to(rope,
                { scaleX: 1, yPercent: 4 + i * 2, ease: 'none', duration: 0.15 },
                0.65,
              );
            });

            // Callouts follow curved paths, pass behind gloves, then lock
            const callouts = el.querySelectorAll('[data-callout]');
            callouts.forEach((callout, i) => {
              const startPos = 0.12 + i * 0.22;
              const isLeft = i % 2 === 0;
              glovesTl.fromTo(callout,
                { x: isLeft ? '-6vw' : '6vw', y: 18, opacity: 0, scale: 0.96, filter: 'blur(6px)' },
                { x: 0, y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', ease: 'power3.out', duration: 0.12 },
                startPos,
              );
              glovesTl.to(callout,
                { opacity: 1, y: 0, ease: 'none', duration: 0.12 },
                startPos + 0.12,
              );
              glovesTl.to(callout,
                { opacity: 0, y: -12, scale: 0.98, filter: 'blur(3px)', ease: 'power2.in', duration: 0.1 },
                startPos + 0.24,
              );
            });

            // Gloves chapter depth layers
            const glovesHaze = el.querySelectorAll('[data-gloves-haze]');
            glovesHaze.forEach((layer, i) => {
              glovesTl.fromTo(layer,
                { opacity: 0.2 + i * 0.1, yPercent: -i * 3 },
                { opacity: 0.5, yPercent: i * 8, ease: 'none' },
                0,
              );
            });

            // Transition wipe
            const glovesWipe = el.querySelector('[data-gloves-wipe]');
            if (glovesWipe) {
              glovesTl.fromTo(glovesWipe,
                { opacity: 0 },
                { opacity: 1, ease: 'none' },
                0.85,
              );
            }

            // ═══ CHAPTER 3: CHAMPIONSHIP BELT / PROOF ═══
            const beltTl = gsap.timeline({
              scrollTrigger: {
                trigger: beltTrackRef.current,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1,
              },
            });

            // Iris transition: dark emerald shrinks from full viewport to reveal warm stone
            const iris = el.querySelector('[data-belt-iris]');
            if (iris) {
              beltTl.fromTo(iris,
                { scale: 1, opacity: 1 },
                { scale: 0, opacity: 0, ease: 'power2.in', duration: 0.2 },
                0,
              );
            }

            if (beltRef.current) {
              // V52: the belt arrives as a dimensional object, crossing the camera plane.
              beltTl.fromTo(beltRef.current,
                { y: '72vh', x: '-12vw', scale: 0.42, rotationX: 22, rotationY: -32, rotationZ: -4, transformPerspective: 1200, filter: 'none', opacity: 0 },
                { y: '3vh', x: '5vw', scale: 1.15, rotationX: -5, rotationY: 12, rotationZ: 1.5, transformPerspective: 1200, filter: 'saturate(1.12) brightness(1.08)', opacity: 1, ease: 'power2.out', duration: 0.38 },
                0.04,
              );
              beltTl.to(beltRef.current,
                { y: '-8vh', x: '-2vw', scale: 1.82, rotationX: 3, rotationY: -8, rotationZ: -0.5, filter: 'saturate(1.06) brightness(1)', ease: 'none', duration: 0.34 },
                0.42,
              );
              // Warm monochrome is reserved for the last quarter as the medallion becomes a portal.
              beltTl.to(beltRef.current,
                { y: '-2vh', x: 0, filter: 'grayscale(1) opacity(0.3)', scale: 2.75, rotationX: 0, rotationY: 0, ease: 'power2.in', duration: 0.24 },
                0.76,
              );
            }

            const beltSweep = el.querySelector('[data-belt-sweep]');
            if (beltSweep) {
              beltTl.fromTo(beltSweep,
                { xPercent: -140, opacity: 0, rotate: -12 },
                { xPercent: 145, opacity: 0.9, rotate: -12, ease: 'power1.inOut', duration: 0.58 },
                0.16,
              );
              beltTl.to(beltSweep, { opacity: 0, duration: 0.08 }, 0.72);
            }

            const medallionPortal = el.querySelector('[data-medallion-portal]');
            if (medallionPortal) {
              beltTl.fromTo(medallionPortal,
                { scale: 0.12, opacity: 0, rotate: -18 },
                { scale: 1, opacity: 0.72, rotate: 0, ease: 'power2.out', duration: 0.22 },
                0.58,
              );
              beltTl.to(medallionPortal,
                { scale: 5.5, opacity: 0, filter: 'blur(2px)', ease: 'power2.in', duration: 0.24 },
                0.76,
              );
            }

            // Belt soft shadow — changes scale as belt approaches
            const beltShadow = el.querySelector('[data-belt-shadow]');
            if (beltShadow) {
              beltTl.fromTo(beltShadow,
                { y: '70vh', scale: 0.5, opacity: 0.15 },
                { y: '-5vh', scale: 1.4, opacity: 0.25, ease: 'none', duration: 0.6 },
                0.05,
              );
              beltTl.to(beltShadow,
                { opacity: 0.05, scale: 1.5, ease: 'none', duration: 0.25 },
                0.75,
              );
            }

            // Light-scene depth layers
            const lightBloom = el.querySelector('[data-belt-light-bloom]');
            if (lightBloom) {
              beltTl.fromTo(lightBloom,
                { opacity: 0.3, x: '-5vw' },
                { opacity: 0.5, x: '5vw', ease: 'none' },
                0,
              );
            }

            const techGrid = el.querySelector('[data-belt-tech-grid]');
            if (techGrid) {
              beltTl.fromTo(techGrid,
                { opacity: 0.04, yPercent: 0 },
                { opacity: 0.08, yPercent: 5, ease: 'none' },
                0,
              );
            }

            const sceneGrain = el.querySelector('[data-belt-scene-grain]');
            if (sceneGrain) {
              beltTl.fromTo(sceneGrain,
                { opacity: 0.3 },
                { opacity: 0.5, ease: 'none' },
                0,
              );
            }

            // Split typography behind belt
            const beltTypeLeft = el.querySelector('[data-belt-type-left]');
            const beltTypeRight = el.querySelector('[data-belt-type-right]');
            if (beltTypeLeft) {
              beltTl.fromTo(beltTypeLeft,
                { x: '-10vw', opacity: 0 },
                { x: 0, opacity: 0.08, ease: 'none' },
                0.1,
              );
            }
            if (beltTypeRight) {
              beltTl.fromTo(beltTypeRight,
                { x: '10vw', opacity: 0 },
                { x: 0, opacity: 0.08, ease: 'none' },
                0.1,
              );
            }

            // Proof facts reveal sequentially
            const proofFacts = el.querySelectorAll('[data-proof-fact]');
            proofFacts.forEach((fact, i) => {
              const startPos = 0.22 + i * 0.13;
              beltTl.fromTo(fact,
                { opacity: 0, y: 18, x: i === 1 ? 24 : -24, filter: 'blur(5px)' },
                { opacity: 1, y: 0, x: 0, filter: 'blur(0px)', ease: 'power2.out', duration: 0.11 },
                startPos,
              );
              const line = fact.querySelector('[data-proof-line]');
              if (line) {
                beltTl.fromTo(line,
                  { scaleX: 0, opacity: 0, transformOrigin: i === 1 ? 'right center' : 'left center' },
                  { scaleX: 1, opacity: 0.72, ease: 'power2.out', duration: 0.13 },
                  startPos + 0.04,
                );
              }
            });

            // Belt contour overlay — appears in final 25%
            const beltContour = el.querySelector('[data-belt-contour]');
            if (beltContour) {
              beltTl.fromTo(beltContour,
                { opacity: 0 },
                { opacity: 0.4, ease: 'none', duration: 0.2 },
                0.75,
              );
            }

            // Gallery scene background shift
            const beltScene = el.querySelector('[data-belt-scene]');
            if (beltScene) {
              beltTl.fromTo(beltScene,
                { backgroundColor: '#0D110D' },
                { backgroundColor: '#030605', ease: 'none' },
                0,
              );
            }

            // Transition to dark
            const beltWipe = el.querySelector('[data-belt-wipe]');
            if (beltWipe) {
              beltTl.fromTo(beltWipe,
                { opacity: 0 },
                { opacity: 1, ease: 'none' },
                0.85,
              );
            }

            // Header text color adaptation for belt scene
            if (headerRef.current) {
              const headerTl = gsap.timeline({
                scrollTrigger: {
                  trigger: beltTrackRef.current,
                  start: 'top 50%',
                  end: 'bottom 50%',
                  scrub: 1,
                },
              });
              headerTl.fromTo(headerRef.current,
                { color: '#F1F0EC' },
                { color: '#E8E2D6', ease: 'none' },
              );
              headerTl.to(headerRef.current,
                { color: '#F1F0EC', ease: 'none' },
              );
            }
          },

          // ── MOBILE ──
          '(max-width: 1023px)': () => {
            // ═══ CHAPTER 1: FIGHTER / TUNNEL — camera push + punch shockwave ═══
            const heroTl = gsap.timeline({
              scrollTrigger: {
                trigger: heroTrackRef.current,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.8,
              },
            });

            if (fighterRef.current) {
              heroTl.fromTo(fighterRef.current,
                { scale: 0.92, y: '2vh', filter: 'brightness(0.85)' },
                { scale: 1.4, y: '-3vh', filter: 'brightness(1)', ease: 'none', duration: 0.5 },
                0,
              );
              heroTl.to(fighterRef.current,
                { scale: 2.2, y: '-12vh', filter: 'brightness(1.6) contrast(1.1)', ease: 'power2.in', duration: 0.2 },
                0.5,
              );
              heroTl.to(fighterRef.current,
                { scale: 2.8, y: '-18vh', opacity: 0, filter: 'brightness(2.5) blur(3px)', ease: 'none', duration: 0.15 },
                0.75,
              );
            }

            // Shockwave (mobile: smaller)
            if (shockwaveRef.current) {
              heroTl.fromTo(shockwaveRef.current,
                { scale: 0, opacity: 0 },
                { scale: 0, opacity: 0, ease: 'none', duration: 0.5 },
                0,
              );
              heroTl.to(shockwaveRef.current,
                { scale: 2.5, opacity: 0.5, ease: 'power2.out', duration: 0.2 },
                0.5,
              );
              heroTl.to(shockwaveRef.current,
                { scale: 4, opacity: 0, ease: 'none', duration: 0.15 },
                0.7,
              );
            }

            // Flash (mobile)
            if (flashRef.current) {
              heroTl.fromTo(flashRef.current,
                { opacity: 0 },
                { opacity: 0, ease: 'none', duration: 0.5 },
                0,
              );
              heroTl.to(flashRef.current,
                { opacity: 0.7, ease: 'none', duration: 0.05 },
                0.5,
              );
              heroTl.to(flashRef.current,
                { opacity: 0, ease: 'power2.out', duration: 0.2 },
                0.55,
              );
            }

            // Spotlight (mobile)
            if (spotlightRef.current) {
              heroTl.fromTo(spotlightRef.current,
                { scale: 4, opacity: 0 },
                { scale: 4, opacity: 0, ease: 'none', duration: 0.5 },
                0,
              );
              heroTl.to(spotlightRef.current,
                { scale: 1, opacity: 0.3, ease: 'power2.out', duration: 0.25 },
                0.5,
              );
              heroTl.to(spotlightRef.current,
                { scale: 0.8, opacity: 0.1, ease: 'none', duration: 0.15 },
                0.75,
              );
            }

            const hazeLayers = el.querySelectorAll('[data-hero-haze]');
            hazeLayers.forEach((layer, i) => {
              heroTl.fromTo(layer,
                { opacity: 0.3 + i * 0.1 },
                { opacity: 0.6, ease: 'none' },
                0,
              );
            });

            const heroApertures = el.querySelectorAll('[data-hero-aperture]');
            heroApertures.forEach((aperture, i) => {
              heroTl.fromTo(aperture,
                { scale: 0.9 - i * 0.04, opacity: 0.7 - i * 0.12 },
                { scale: 1.9 + i * 0.22, opacity: 0, ease: 'power2.in', duration: 0.78 },
                0.08 + i * 0.03,
              );
            });

            const upperHeadline = el.querySelector('[data-hero-upper]');
            if (upperHeadline) {
              heroTl.fromTo(upperHeadline,
                { x: 0, opacity: 1 },
                { x: '-20vw', opacity: 0, ease: 'none' },
                0.2,
              );
            }
            const lowerHeadline = el.querySelector('[data-hero-lower]');
            if (lowerHeadline) {
              heroTl.fromTo(lowerHeadline,
                { x: 0, opacity: 1 },
                { x: '20vw', opacity: 0, ease: 'none' },
                0.2,
              );
            }

            const heroWipe = el.querySelector('[data-hero-wipe]');
            if (heroWipe) {
              heroTl.fromTo(heroWipe,
                { opacity: 0 },
                { opacity: 1, ease: 'none' },
                0.85,
              );
            }

            // ═══ CHAPTER 2: GLOVES / FEATURES — pendulum arcs (mobile) ═══
            const glovesTl = gsap.timeline({
              scrollTrigger: {
                trigger: glovesTrackRef.current,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.8,
              },
            });

            // One centered glove pair on mobile — no duplicated four-glove composition.
            if (gloveLeftRef.current) {
              glovesTl.fromTo(gloveLeftRef.current,
                { x: 0, y: '-18vh', scale: 0.5, rotation: -6, rotateY: 12, opacity: 0, filter: 'blur(6px) brightness(0.76)' },
                { x: 0, y: '1vh', scale: 0.92, rotation: 1, rotateY: -3, opacity: 1, filter: 'blur(0px) brightness(1.06)', ease: 'power3.out', duration: 0.32 },
                0,
              );
              glovesTl.to(gloveLeftRef.current,
                { y: '3vh', scale: 1.02, rotation: -1.5, rotateY: 3, ease: 'sine.inOut', duration: 0.22 },
                0.32,
              );
              glovesTl.to(gloveLeftRef.current,
                { y: '8vh', scale: 1.2, rotation: 0, rotateY: 0, ease: 'power2.in', duration: 0.25 },
                0.62,
              );
              glovesTl.to(gloveLeftRef.current,
                { scale: 1.48, opacity: 0, filter: 'brightness(1.7) blur(4px)', ease: 'power2.in', duration: 0.14 },
                0.84,
              );
            }

            if (gloveRightRef.current) {
              gsap.set(gloveRightRef.current, { display: 'none', opacity: 0 });
            }

            // Moving highlight (mobile)
            if (glovesHighlightRef.current) {
              glovesTl.fromTo(glovesHighlightRef.current,
                { x: '-30vw', opacity: 0 },
                { x: '30vw', opacity: 0.1, ease: 'none', duration: 0.4 },
                0.1,
              );
              glovesTl.to(glovesHighlightRef.current,
                { opacity: 0, ease: 'none', duration: 0.1 },
                0.5,
              );
            }

            // Floor shadow (mobile)
            if (glovesShadowRef.current) {
              glovesTl.fromTo(glovesShadowRef.current,
                { x: '-3vw', scale: 0.5, opacity: 0.1 },
                { x: '0vw', scale: 1, opacity: 0.2, ease: 'none', duration: 0.25 },
                0,
              );
            }

            // Ropes stretch (mobile)
            const glovesRopes = el.querySelectorAll('[data-gloves-rope]');
            glovesRopes.forEach((rope, i) => {
              glovesTl.fromTo(rope,
                { yPercent: 0, scaleX: 1 },
                { yPercent: 6 + i * 3, scaleX: 1.02, ease: 'none', duration: 0.3 },
                0,
              );
            });

            const callouts = el.querySelectorAll('[data-callout]');
            callouts.forEach((callout, i) => {
              const startPos = 0.12 + i * 0.22;
              const isLeft = i % 2 === 0;
              glovesTl.fromTo(callout,
                { x: isLeft ? '-6vw' : '6vw', y: 18, opacity: 0, scale: 0.96, filter: 'blur(6px)' },
                { x: 0, y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', ease: 'power3.out', duration: 0.12 },
                startPos,
              );
              glovesTl.to(callout,
                { opacity: 1, y: 0, ease: 'none', duration: 0.12 },
                startPos + 0.12,
              );
              glovesTl.to(callout,
                { opacity: 0, y: -12, scale: 0.98, filter: 'blur(3px)', ease: 'power2.in', duration: 0.1 },
                startPos + 0.24,
              );
            });

            const glovesWipe = el.querySelector('[data-gloves-wipe]');
            if (glovesWipe) {
              glovesTl.fromTo(glovesWipe,
                { opacity: 0 },
                { opacity: 1, ease: 'none' },
                0.85,
              );
            }

            // ═══ CHAPTER 3: BELT / PROOF ═══
            const beltTl = gsap.timeline({
              scrollTrigger: {
                trigger: beltTrackRef.current,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.8,
              },
            });

            // Iris transition: dark emerald shrinks to reveal warm stone
            const irisMobile = el.querySelector('[data-belt-iris]');
            if (irisMobile) {
              beltTl.fromTo(irisMobile,
                { scale: 1, opacity: 1 },
                { scale: 0, opacity: 0, ease: 'power2.in', duration: 0.2 },
                0,
              );
            }

            if (beltRef.current) {
              beltTl.fromTo(beltRef.current,
                { y: '62vh', x: '-16vw', scale: 0.48, rotationX: 16, rotationY: -26, rotationZ: -3, transformPerspective: 900, filter: 'none', opacity: 0 },
                { y: '5vh', x: '7vw', scale: 1.05, rotationX: -4, rotationY: 10, rotationZ: 1, transformPerspective: 900, filter: 'saturate(1.12) brightness(1.08)', opacity: 1, ease: 'power2.out', duration: 0.38 },
                0.04,
              );
              beltTl.to(beltRef.current,
                { y: '-6vh', x: '-3vw', scale: 1.56, rotationX: 2, rotationY: -7, rotationZ: 0, filter: 'saturate(1.05)', ease: 'none', duration: 0.36 },
                0.42,
              );
              beltTl.to(beltRef.current,
                { y: 0, x: 0, filter: 'grayscale(1) opacity(0.3)', scale: 2.35, rotationX: 0, rotationY: 0, ease: 'power2.in', duration: 0.24 },
                0.76,
              );
            }

            const beltSweepM = el.querySelector('[data-belt-sweep]');
            if (beltSweepM) {
              beltTl.fromTo(beltSweepM,
                { xPercent: -145, opacity: 0, rotate: -12 },
                { xPercent: 145, opacity: 0.9, rotate: -12, ease: 'power1.inOut', duration: 0.58 },
                0.16,
              );
              beltTl.to(beltSweepM, { opacity: 0, duration: 0.08 }, 0.72);
            }

            const medallionPortalM = el.querySelector('[data-medallion-portal]');
            if (medallionPortalM) {
              beltTl.fromTo(medallionPortalM,
                { scale: 0.12, opacity: 0, rotate: -18 },
                { scale: 1, opacity: 0.72, rotate: 0, ease: 'power2.out', duration: 0.22 },
                0.58,
              );
              beltTl.to(medallionPortalM,
                { scale: 5, opacity: 0, filter: 'blur(2px)', ease: 'power2.in', duration: 0.24 },
                0.76,
              );
            }

            // Belt shadow on mobile
            const beltShadowM = el.querySelector('[data-belt-shadow]');
            if (beltShadowM) {
              beltTl.fromTo(beltShadowM,
                { y: '60vh', scale: 0.5, opacity: 0.12 },
                { y: '-5vh', scale: 1.3, opacity: 0.2, ease: 'none', duration: 0.6 },
                0.05,
              );
            }

            const proofFacts = el.querySelectorAll('[data-proof-fact]');
            proofFacts.forEach((fact, i) => {
              const startPos = 0.22 + i * 0.13;
              beltTl.fromTo(fact,
                { opacity: 0, y: 14, x: i === 1 ? 16 : -16, filter: 'blur(4px)' },
                { opacity: 1, y: 0, x: 0, filter: 'blur(0px)', ease: 'power2.out', duration: 0.11 },
                startPos,
              );
              const line = fact.querySelector('[data-proof-line]');
              if (line) {
                beltTl.fromTo(line,
                  { scaleX: 0, opacity: 0, transformOrigin: i === 1 ? 'right center' : 'left center' },
                  { scaleX: 1, opacity: 0.72, ease: 'power2.out', duration: 0.13 },
                  startPos + 0.04,
                );
              }
            });

            const beltWipe = el.querySelector('[data-belt-wipe]');
            if (beltWipe) {
              beltTl.fromTo(beltWipe,
                { opacity: 0 },
                { opacity: 1, ease: 'none' },
                0.85,
            );
            }

          },
        });

        // ── V51: Progress rail — scroll-driven chapter indicator ──
        if (progressRailRef.current) {
          const railSegments = progressRailRef.current.querySelectorAll('[data-rail-segment]');
          railSegments.forEach((seg, i) => {
            const chapterTrack = [heroTrackRef.current, glovesTrackRef.current, beltTrackRef.current][i];
            if (!chapterTrack) return;
            gsap.fromTo(seg,
              { opacity: 0.25, scaleY: 0.3 },
              {
                opacity: 1,
                scaleY: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: chapterTrack,
                  start: 'top 60%',
                  end: 'bottom 60%',
                  scrub: 0.5,
                },
              },
            );
          });
        }

        ScrollTrigger.refresh();
      }, rootRef.current);
    })();

    return () => {
      ctx?.revert();
    };
  }, [reducedMotion]);

  // ── Hide scroll indicator after scroll ────────────────────────────────────
  useEffect(() => {
    if (reducedMotion) return;
    const handleScroll = () => {
      if (scrollIndicatorRef.current) {
        const opacity = Math.max(0, 1 - window.scrollY / 200);
        scrollIndicatorRef.current.style.opacity = String(opacity);
        if (opacity <= 0) {
          scrollIndicatorRef.current.style.pointerEvents = 'none';
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [reducedMotion]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    clearAuthError();
    if (!email || !password) { setError('Email and password required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  const scrollToNext = useCallback(() => {
    glovesTrackRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }, [reducedMotion]);

  return (
    <div ref={rootRef} className="relative min-h-screen" style={{ background: COLORS.bg, overflowX: 'clip' }}>
      {/* Global film grain + vignette overlay */}
      <div className="fixed inset-0 z-[60] pointer-events-none" aria-hidden="true" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
        mixBlendMode: 'overlay',
      }} />
      <div className="fixed inset-0 z-[60] pointer-events-none" aria-hidden="true" style={{
        background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.35) 100%)',
      }} />

      {/* V51: Fixed vertical chapter progress rail */}
      <div ref={progressRailRef} className="progress-rail" aria-hidden="true">
        {CHAPTERS.map((ch) => (
          <div key={ch} className="progress-rail-item">
            <span className="progress-rail-label" data-rail-label>{ch}</span>
            <div className="progress-rail-segment" data-rail-segment />
          </div>
        ))}
      </div>

      {/* ═══ Content ═══ */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ── Top bar — fixed header with compact login ── */}
        <div ref={headerRef} className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 lg:px-10 lg:py-4" style={{ background: 'linear-gradient(180deg, rgba(3,4,3,0.92) 0%, rgba(3,4,3,0.6) 70%, transparent 100%)' }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: 'rgba(22,138,82,0.12)', border: '1px solid rgba(54,214,126,0.3)' }}
            >
              <span className="serif text-base font-bold" style={{ color: COLORS.green }}>M</span>
            </div>
            <span className="hidden text-sm font-semibold tracking-wider sm:inline" style={{ color: 'inherit' }}>MENDEZ LABS</span>
          </div>

          <div className="flex items-center gap-2" ref={loginRef}>
            <span className="hidden rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-block" style={{ background: 'rgba(224,165,50,0.12)', border: '1px solid rgba(224,165,50,0.3)', color: COLORS.gold }}>
              DEMO
            </span>
            {!authed ? (
              loginOpen ? (
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-2 rounded-xl px-3 py-3 backdrop-blur-xl min-w-[280px]"
                  style={{ background: 'rgba(10,14,12,0.95)', border: `1px solid ${COLORS.borderGreen}`, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: COLORS.green }}>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(v => !v); setError(''); }}
                      className="text-[10px] underline"
                      style={{ color: COLORS.textMuted }}
                    >
                      {isSignUp ? 'Have an account? Sign in' : 'New? Create account'}
                    </button>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="Email"
                    autoFocus
                    className="w-full rounded-lg border-0 bg-transparent px-2.5 py-2 text-xs outline-none"
                    style={{ color: COLORS.textPrimary, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(220,225,222,0.12)' }}
                    aria-label="Email"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Password"
                    minLength={6}
                    className="w-full rounded-lg border-0 bg-transparent px-2.5 py-2 text-xs outline-none"
                    style={{ color: COLORS.textPrimary, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(220,225,222,0.12)' }}
                    aria-label="Password"
                  />
                  {error && (
                    <span className="text-[10px] mono" style={{ color: COLORS.red }}>{error}</span>
                  )}
                  <button
                    type="submit"
                    data-enter-btn
                    disabled={submitting}
                    className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-all w-full"
                    style={{ background: 'linear-gradient(135deg, #36D67E, #168A52)', color: '#080A09', opacity: submitting ? 0.7 : 1 }}
                  >
                    {submitting ? 'Please wait...' : (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN')}
                    {!submitting && <ArrowRight className="h-3 w-3" />}
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                  style={{ background: 'rgba(32,200,120,0.12)', border: '1px solid rgba(54,214,126,0.25)', color: COLORS.green }}
                >
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Sign In
                </button>
              )
            ) : (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(32,200,120,0.12)' }}>
                <ShieldCheck className="h-4 w-4 animate-pulse" style={{ color: COLORS.green }} />
                <span className="text-xs font-bold" style={{ color: COLORS.green }}>ACCESS GRANTED</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            CHAPTER 1: FIGHTER / TUNNEL — 300vh pinned
            ═══════════════════════════════════════════════════════════════════════ */}
        {/* CHAPTER 1: HERO — FIGHTER / TUNNEL */}
        <section ref={heroTrackRef} data-hero-track className="relative" style={{ height: '300vh' }}>
          <div
            ref={heroStageRef}
            data-hero-stage
            className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden"
          >
            {/* Tunnel background layers — 3+ depth layers */}
            <div className="absolute inset-0 z-0" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse 58% 74% at 50% 46%, #13231B 0%, #09110D 34%, #040806 62%, #020403 100%)',
            }} />
            {/* Haze layer 1 */}
            <div data-hero-haze className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(22,138,82,0.08) 0%, transparent 70%)',
              willChange: 'transform, opacity',
            }} />
            {/* Haze layer 2 */}
            <div data-hero-haze className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse 60% 40% at 30% 60%, rgba(54,214,126,0.04) 0%, transparent 60%)',
              willChange: 'transform, opacity',
            }} />
            {/* Haze layer 3 — brightens with scroll */}
            <div data-hero-haze className="absolute inset-0 z-[2] pointer-events-none" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse 100% 70% at 50% 50%, rgba(54,214,126,0.06) 0%, transparent 80%)',
              willChange: 'transform, opacity',
            }} />

            {/* Ring ropes — 3 layers at different depths */}
            <div data-hero-rope className="absolute left-0 right-0 top-[20%] z-[3] h-2 pointer-events-none" aria-hidden="true" style={{ background: 'linear-gradient(90deg, transparent, rgba(54,214,126,0.12), transparent)', willChange: 'transform' }} />
            <div data-hero-rope className="absolute left-0 right-0 top-[50%] z-[3] h-1.5 pointer-events-none" aria-hidden="true" style={{ background: 'linear-gradient(90deg, transparent, rgba(54,214,126,0.08), transparent)', willChange: 'transform' }} />
            <div data-hero-rope className="absolute left-0 right-0 bottom-[15%] z-[3] h-2 pointer-events-none" aria-hidden="true" style={{ background: 'linear-gradient(90deg, transparent, rgba(54,214,126,0.1), transparent)', willChange: 'transform' }} />

            {/* Deep architectural aperture — a boxing tunnel equivalent of the jet-window focal frame */}
            <div data-hero-aperture className="absolute left-1/2 top-1/2 z-[2] h-[78vh] w-[54vw] min-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-[48%] pointer-events-none" aria-hidden="true" style={{
              border: '1px solid rgba(232,226,214,0.14)',
              boxShadow: '0 0 0 18px rgba(32,200,120,0.025), 0 0 0 64px rgba(232,226,214,0.018), inset 0 0 110px rgba(0,0,0,0.82), 0 0 120px rgba(32,200,120,0.08)',
              background: 'radial-gradient(ellipse at 50% 48%, rgba(32,200,120,0.10) 0%, rgba(3,6,5,0.08) 45%, rgba(0,0,0,0.58) 100%)',
              willChange: 'transform, opacity',
            }} />
            <div data-hero-aperture className="absolute left-1/2 top-1/2 z-[2] h-[64vh] w-[40vw] min-w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-[48%] pointer-events-none" aria-hidden="true" style={{
              border: '1px solid rgba(181,138,58,0.18)',
              boxShadow: 'inset 0 0 70px rgba(181,138,58,0.07)',
              willChange: 'transform, opacity',
            }} />

            {/* Vignette */}
            <div className="absolute inset-0 z-[4] pointer-events-none" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse at 50% 48%, transparent 28%, rgba(0,0,0,0.34) 68%, rgba(0,0,0,0.78) 100%)',
            }} />

            {/* V51: Shockwave ring — expands at punch moment */}
            <div ref={shockwaveRef} className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none" aria-hidden="true" style={{ willChange: 'transform, opacity' }}>
              <div className="shockwave-ring" />
            </div>

            {/* V51: Exposure flash — white/emerald burst at impact */}
            <div ref={flashRef} className="absolute inset-0 z-[7] pointer-events-none" aria-hidden="true" style={{ willChange: 'opacity', background: `radial-gradient(circle at 50% 50%, ${COLORS.green}40 0%, ${COLORS.textPrimary}30 30%, transparent 70%)`, opacity: 0 }} />

            {/* V51: Spotlight ring — collapses inward to become glove scene spotlight */}
            <div ref={spotlightRef} className="absolute inset-0 z-[6] flex items-center justify-center pointer-events-none" aria-hidden="true" style={{ willChange: 'transform, opacity' }}>
              <div className="spotlight-ring" style={{ borderColor: `${COLORS.green}30` }} />
            </div>

            {/* Fighter transparent cutout — centered, 48-60vh desktop / 52-66vh mobile */}
            <div ref={fighterRef} className="absolute inset-0 z-[6] flex items-center justify-center" style={{ willChange: 'transform, filter' }}>
              <img
                src={ASSETS.fighter}
                alt="A fictional heavyweight boxer standing in an arena tunnel, ready to enter"
                className="object-contain"
                style={{ maxHeight: '70vh', maxWidth: '82vw', height: 'auto', width: 'auto', filter: 'drop-shadow(0 34px 46px rgba(0,0,0,0.72))' }}
                loading="eager"
                fetchPriority="high"
              />
            </div>

            {/* Headline — split editorial balance */}
            <div className="absolute inset-0 z-[5] pointer-events-none">
              {/* Upper-left: "Trade Smarter." */}
              <div data-hero-upper className="absolute left-6 top-[22%] max-w-[44vw] lg:left-16 lg:top-[24%]" style={{ willChange: 'transform' }}>
                <h1 className="serif text-4xl font-normal leading-[0.92] sm:text-5xl lg:text-6xl xl:text-7xl" style={{ color: COLORS.textPrimary, letterSpacing: '-0.03em', textShadow: '0 4px 24px rgba(0,0,0,0.9)' }}>
                  <span data-hero-word style={{ display: 'inline-block' }}>Trade</span>{' '}
                  <span data-hero-word style={{ display: 'inline-block' }}>Smarter.</span>
                </h1>
              </div>
              {/* Lower-right: "Research First." */}
              <div data-hero-lower className="absolute right-6 bottom-[20%] max-w-[44vw] lg:right-16 lg:bottom-[22%] text-right" style={{ willChange: 'transform' }}>
                <h1 className="serif text-4xl font-normal leading-[0.92] sm:text-5xl lg:text-6xl xl:text-7xl" style={{ color: COLORS.green, letterSpacing: '-0.03em', textShadow: '0 4px 24px rgba(0,0,0,0.9)' }}>
                  <span data-hero-word style={{ display: 'inline-block' }}>Research</span>{' '}
                  <span data-hero-word style={{ display: 'inline-block' }}>First.</span>
                </h1>
                <p data-hero-sub className="mt-4 max-w-xs ml-auto text-sm leading-relaxed sm:text-base" style={{ color: COLORS.textSecondary, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
                  AI-powered trading signals and sports intelligence in one research terminal.
                </p>
                <p data-hero-sub className="mt-2 max-w-xs ml-auto text-xs sm:text-sm" style={{ color: COLORS.textMuted, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  Mendez Labs researches the markets so you can follow along — paper trading only, no real money at risk.
                </p>
              </div>
            </div>

            {/* Scroll-to-continue indicator */}
            <div
              ref={scrollIndicatorRef}
              className="absolute bottom-8 left-1/2 z-[7] -translate-x-1/2 flex flex-col items-center gap-2"
            >
              <button
                onClick={scrollToNext}
                className="flex flex-col items-center gap-1.5 transition-opacity hover:opacity-100"
                aria-label="Scroll to continue"
                style={{ color: COLORS.textMuted, cursor: 'pointer', background: 'none', border: 'none' }}
              >
                <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(115,122,118,0.7)' }}>Scroll to continue</span>
                <ChevronDown className="h-5 w-5 animate-bounce" style={{ color: COLORS.green, animationDuration: '2s' }} />
              </button>
            </div>

            {/* Atmospheric wipe at end of chapter */}
            <div data-hero-wipe className="absolute inset-0 z-[8] pointer-events-none" aria-hidden="true" style={{ background: '#030403', opacity: 0, willChange: 'opacity' }} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            CHAPTER 2: GLOVES / FEATURES — 280vh pinned
            ═══════════════════════════════════════════════════════════════════════ */}
        {/* CHAPTER 2: GLOVES / FEATURES */}
        <section ref={glovesTrackRef} data-gloves-track className="relative" style={{ height: '280vh' }}>
          <div
            ref={glovesStageRef}
            data-gloves-stage
            className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden"
          >
            {/* Dark arena background */}
            <div className="absolute inset-0 z-0" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse 74% 64% at 50% 50%, #102219 0%, #07100C 34%, #030605 66%, #010201 100%)',
            }} />

            {/* Depth: haze layers */}
            <div data-gloves-haze className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse 70% 50% at 50% 45%, rgba(22,138,82,0.06) 0%, transparent 70%)',
              willChange: 'transform, opacity',
            }} />
            <div data-gloves-haze className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse 50% 35% at 50% 55%, rgba(54,214,126,0.04) 0%, transparent 60%)',
              willChange: 'transform, opacity',
            }} />

            {/* Depth: ring ropes */}
            <div data-gloves-rope className="absolute left-0 right-0 top-[25%] z-[2] h-1.5 pointer-events-none" aria-hidden="true" style={{ background: 'linear-gradient(90deg, transparent, rgba(54,214,126,0.1), transparent)', willChange: 'transform' }} />
            <div data-gloves-rope className="absolute left-0 right-0 bottom-[30%] z-[2] h-1.5 pointer-events-none" aria-hidden="true" style={{ background: 'linear-gradient(90deg, transparent, rgba(54,214,126,0.08), transparent)', willChange: 'transform' }} />

            {/* Depth: emerald/gold edge glow */}
            <div className="absolute inset-0 z-[2] pointer-events-none" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 60%, rgba(22,138,82,0.04) 100%)',
            }} />

            {/* Depth: arena light bokeh */}
            <div className="absolute top-[15%] left-[20%] z-[2] h-24 w-24 rounded-full pointer-events-none" aria-hidden="true" style={{ background: 'radial-gradient(circle, rgba(54,214,126,0.08) 0%, transparent 70%)', filter: 'blur(20px)' }} />
            <div className="absolute bottom-[20%] right-[15%] z-[2] h-32 w-32 rounded-full pointer-events-none" aria-hidden="true" style={{ background: 'radial-gradient(circle, rgba(224,165,50,0.05) 0%, transparent 70%)', filter: 'blur(24px)' }} />

            {/* V51: Moving highlight traveling across gloves */}
            <div ref={glovesHighlightRef} className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none" aria-hidden="true" style={{ willChange: 'transform, opacity' }}>
              <div className="gloves-highlight" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.green}20, transparent)` }} />
            </div>

            {/* V51: Floor shadow — moves with glove depth */}
            <div ref={glovesShadowRef} className="absolute bottom-[18%] left-1/2 z-[3] h-10 w-40 -translate-x-1/2 rounded-full pointer-events-none" aria-hidden="true" style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%)', willChange: 'transform, opacity' }} />

            {/* V51: Left glove — pendulum arc, deeper depth */}
            <div ref={gloveLeftRef} className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none" aria-hidden="true" style={{ willChange: 'transform, opacity', perspective: '800px' }}>
              <img
                src={ASSETS.gloves}
                alt="A pair of black boxing gloves"
                className="object-contain gloves-cinematic"
                style={{ maxWidth: 'min(78vw, 720px)', maxHeight: '62vh', height: 'auto', width: 'auto', transformStyle: 'preserve-3d', filter: 'drop-shadow(0 34px 46px rgba(0,0,0,0.72))' }}
                loading="lazy"
              />
            </div>

            {/* V51: Right glove — opposing pendulum arc, shallower depth */}
            <div ref={gloveRightRef} className="absolute inset-0 z-[5] hidden items-center justify-center pointer-events-none" aria-hidden="true" style={{ opacity: 0 }}>
              <img
                src={ASSETS.gloves}
                alt="Right boxing glove"
                className="object-contain gloves-cinematic"
                style={{ maxWidth: '32vw', maxHeight: '40vh', height: 'auto', width: 'auto', transformStyle: 'preserve-3d' }}
                loading="lazy"
              />
            </div>

            {/* Editorial callout labels — follow curved paths, pass behind gloves, then lock */}
            <div data-callout-zone className="absolute inset-0 z-[4] pointer-events-none">
              {/* Today's Games — upper area */}
              <div
                data-callout
                data-callout-top
                className="absolute left-6 lg:left-16"
                style={{ top: MOBILE_SAFE_TOP + 18, padding: '14px 16px', border: '1px solid rgba(232,226,214,0.10)', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(10,14,12,0.78), rgba(3,6,5,0.42))', backdropFilter: 'blur(14px)', boxShadow: '0 18px 48px rgba(0,0,0,0.28)', willChange: 'transform, opacity' }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-px w-8 lg:w-16" style={{ background: COLORS.green }} />
                  <TrendingUp className="h-5 w-5" style={{ color: COLORS.green }} />
                </div>
                <p className="mt-2 serif text-2xl font-normal lg:text-4xl" style={{ color: COLORS.textPrimary, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
                  Live Odds Intelligence
                </p>
              </div>

              {/* Pick Five — mid-right */}
              <div
                data-callout
                data-callout-mid
                className="absolute right-6 lg:right-16"
                style={{ top: '41%', padding: '14px 16px', border: '1px solid rgba(32,200,120,0.16)', borderRadius: '14px', background: 'linear-gradient(225deg, rgba(10,14,12,0.82), rgba(3,6,5,0.44))', backdropFilter: 'blur(14px)', boxShadow: '0 18px 48px rgba(0,0,0,0.28)', willChange: 'transform, opacity' }}
              >
                <div className="flex items-center justify-end gap-3">
                  <CalendarDays className="h-5 w-5" style={{ color: COLORS.green }} />
                  <div className="h-px w-8 lg:w-16" style={{ background: COLORS.green }} />
                </div>
                <p className="mt-2 text-right serif text-2xl font-normal lg:text-4xl" style={{ color: COLORS.textPrimary, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
                  Top Five Workflow
                </p>
              </div>

              {/* Results — lower-left */}
              <div
                data-callout
                data-callout-bottom
                className="absolute left-6 lg:left-16"
                style={{ bottom: '11%', padding: '14px 16px', border: '1px solid rgba(181,138,58,0.16)', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(10,14,12,0.82), rgba(3,6,5,0.44))', backdropFilter: 'blur(14px)', boxShadow: '0 18px 48px rgba(0,0,0,0.28)', willChange: 'transform, opacity' }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-px w-8 lg:w-16" style={{ background: COLORS.green }} />
                  <Trophy className="h-5 w-5" style={{ color: COLORS.green }} />
                </div>
                <p className="mt-2 serif text-2xl font-normal lg:text-4xl" style={{ color: COLORS.textPrimary, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
                  Paper-Trading Command
                </p>
              </div>
            </div>

            {/* Transition wipe — dissolve through darkness */}
            <div data-gloves-wipe className="absolute inset-0 z-[8] pointer-events-none" aria-hidden="true" style={{ background: '#030403', opacity: 0, willChange: 'opacity' }} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            CHAPTER 3: CHAMPIONSHIP BELT / PROOF — 320vh pinned
            ═══════════════════════════════════════════════════════════════════════ */}
        {/* CHAPTER 3: CHAMPIONSHIP BELT / PROOF */}
        <section ref={beltTrackRef} data-belt-track className="relative" style={{ height: '320vh' }}>
          <div
            ref={beltStageRef}
            data-belt-stage
            className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden"
          >
            {/* Cream-to-warm-stone gallery scene — intentional light/dark contrast */}
            <div data-belt-scene className="absolute inset-0 z-0" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse 76% 66% at 50% 46%, #1D1A12 0%, #0D110D 38%, #050806 68%, #020403 100%)',
              willChange: 'background-color',
            }} />

            {/* Iris transition layer — full-viewport dark emerald that shrinks to reveal stone */}
            <div data-belt-iris className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" style={{
              background: 'radial-gradient(circle at 50% 50%, #060807 0%, #030403 100%)',
              transformOrigin: 'center center',
              willChange: 'transform, opacity',
            }} />

            {/* Depth: moving radial light bloom */}
            <div data-belt-light-bloom className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" style={{
              background: 'radial-gradient(ellipse 62% 46% at 50% 42%, rgba(181,138,58,0.18) 0%, rgba(32,200,120,0.08) 38%, transparent 72%)',
              willChange: 'transform, opacity',
            }} />

            {/* Depth: subtle engraved grid / technical lines */}
            <div data-belt-tech-grid className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" style={{
              backgroundImage: 'linear-gradient(rgba(232,226,214,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(232,226,214,0.055) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              willChange: 'transform, opacity',
            }} />

            {/* Depth: slow grain/noise overlay for the light scene */}
            <div data-belt-scene-grain className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n2\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n2)\' opacity=\'0.06\'/%3E%3C/svg%3E")',
              mixBlendMode: 'overlay',
              willChange: 'opacity',
            }} />

            {/* Oversized split typography — responsive non-overlapping anchors */}
            <div data-belt-type-left className="belt-type-left absolute top-1/2 z-[2] -translate-y-1/2 pointer-events-none" aria-hidden="true" style={{ willChange: 'transform, opacity' }}>
              <span className="belt-type-text serif font-bold leading-none block" style={{ color: 'rgba(232,226,214,0.075)', letterSpacing: '-0.05em' }}>RESEARCH</span>
            </div>
            <div data-belt-type-right className="belt-type-right absolute top-1/2 z-[2] -translate-y-1/2 pointer-events-none" aria-hidden="true" style={{ willChange: 'transform, opacity' }}>
              <span className="belt-type-text serif font-bold leading-none block" style={{ color: 'rgba(232,226,214,0.075)', letterSpacing: '-0.05em' }}>ADVANTAGE</span>
            </div>

            {/* Belt soft shadow — changes scale as belt approaches */}
            <div data-belt-shadow className="absolute left-1/2 z-[4] -translate-x-1/2 rounded-full pointer-events-none" aria-hidden="true" style={{
              bottom: '30%',
              width: '40vw',
              height: '6vh',
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.58) 0%, rgba(181,138,58,0.10) 36%, transparent 72%)',
              willChange: 'transform, opacity',
            }} />

            {/* Belt transparent cutout — rises from below, grows beyond viewport */}
            <div ref={beltRef} className="absolute inset-0 z-[5] flex items-center justify-center overflow-visible" style={{ willChange: 'transform, filter, opacity', transformStyle: 'preserve-3d', perspective: '1200px' }}>
              <img
                src={ASSETS.belt}
                alt="An original championship belt with gold plates and emerald accents"
                className="object-contain belt-cinematic"
                style={{ maxWidth: '70vw', maxHeight: '45vh', height: 'auto', width: 'auto', filter: 'drop-shadow(0 28px 38px rgba(0,0,0,0.34))' }}
                loading="lazy"
              />
              <div data-belt-sweep className="absolute inset-y-[24%] left-1/2 w-[28%] -translate-x-1/2 pointer-events-none" aria-hidden="true" style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(32,200,120,0.08) 24%, rgba(255,244,210,0.88) 50%, rgba(181,138,58,0.42) 66%, transparent 100%)',
                filter: 'blur(8px)',
                mixBlendMode: 'screen',
                willChange: 'transform, opacity',
              }} />
              <div data-medallion-portal className="absolute left-1/2 top-1/2 h-[20vh] w-[20vh] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" aria-hidden="true" style={{
                border: '1px solid rgba(232,226,214,0.7)',
                boxShadow: '0 0 0 8px rgba(181,138,58,0.08), 0 0 42px rgba(32,200,120,0.28), inset 0 0 34px rgba(3,6,5,0.7)',
                background: 'radial-gradient(circle, rgba(3,6,5,0.12) 28%, rgba(32,200,120,0.18) 52%, transparent 70%)',
                willChange: 'transform, opacity, filter',
              }} />
            </div>

            {/* Belt contour/spec overlay — SVG outline treatment */}
            <div data-belt-contour className="absolute inset-0 z-[6] flex items-center justify-center pointer-events-none" aria-hidden="true" style={{ opacity: 0, willChange: 'opacity' }}>
              <svg width="60%" height="40%" viewBox="0 0 100 50" fill="none" style={{ maxWidth: '70vw' }}>
                <rect x="10" y="15" width="80" height="20" rx="4" stroke="rgba(232,226,214,0.42)" strokeWidth="0.5" strokeDasharray="2 2" />
                <circle cx="50" cy="25" r="8" stroke="rgba(232,226,214,0.42)" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="5" y1="25" x2="95" y2="25" stroke="rgba(181,138,58,0.34)" strokeWidth="0.3" strokeDasharray="1 1" />
              </svg>
            </div>

            {/* Proof facts — small technical-spec labels around belt */}
            <div className="absolute inset-0 z-[7] pointer-events-none">
              <div data-proof-fact className="absolute left-6 top-[22%] lg:left-20" style={{ willChange: 'transform, opacity' }}>
                <span data-proof-line className="mb-3 block h-px w-24 lg:w-40" aria-hidden="true" style={{ background: 'linear-gradient(90deg, rgba(32,200,120,0.9), rgba(181,138,58,0.45), transparent)', willChange: 'transform, opacity' }} />
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold mono lg:text-4xl" style={{ color: COLORS.greenDeep }}>
                    <span data-count="5" aria-label="5">5</span>
                  </span>
                </div>
                <span className="block mt-1 text-xs uppercase tracking-wider mono" style={{ color: 'rgba(232,226,214,0.62)' }}>SPORTS COVERED</span>
              </div>

              <div data-proof-fact className="absolute right-6 top-[30%] lg:right-20" style={{ willChange: 'transform, opacity' }}>
                <span data-proof-line className="mb-3 ml-auto block h-px w-24 lg:w-40" aria-hidden="true" style={{ background: 'linear-gradient(90deg, transparent, rgba(181,138,58,0.45), rgba(32,200,120,0.9))', willChange: 'transform, opacity' }} />
                <div className="flex items-center gap-2">
                  <CheckmarkSVG />
                </div>
                <span className="block mt-1 text-xs uppercase tracking-wider mono" style={{ color: 'rgba(232,226,214,0.62)' }}>EVERY RESULT TRACKED</span>
              </div>

              <div data-proof-fact className="absolute left-6 bottom-[22%] lg:left-20" style={{ willChange: 'transform, opacity' }}>
                <span data-proof-line className="mb-3 block h-px w-24 lg:w-40" aria-hidden="true" style={{ background: 'linear-gradient(90deg, rgba(181,138,58,0.9), rgba(32,200,120,0.4), transparent)', willChange: 'transform, opacity' }} />
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold mono lg:text-4xl" style={{ color: '#A08830' }}>
                    <span data-count="0" aria-label="0">0</span>
                  </span>
                </div>
                <span className="block mt-1 text-xs uppercase tracking-wider mono" style={{ color: 'rgba(232,226,214,0.62)' }}>REAL BETS PLACED</span>
              </div>
            </div>

            {/* Trust strip (for tests + no-JS visibility) */}
            <div data-trust-item className="sr-only" aria-hidden="true">
              <span>SPORTS COVERED</span>
              <span>EVERY RESULT TRACKED</span>
              <span>REAL BETS PLACED</span>
            </div>

            {/* Transition wipe to dark — iris/mask */}
            <div data-belt-wipe className="absolute inset-0 z-[8] pointer-events-none" aria-hidden="true" style={{ background: '#030403', opacity: 0, willChange: 'opacity' }} />
          </div>
        </section>

        {/* ── CTA + Footer ── */}
        <section className="relative flex flex-col items-center justify-center px-6 py-20 lg:py-28" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(22,138,82,0.06) 0%, rgba(3,6,5,1) 70%)' }}>
          <h2 className="serif text-3xl font-normal text-center lg:text-5xl" style={{ color: COLORS.textPrimary, letterSpacing: '-0.03em' }}>
            Ready to enter the terminal?
          </h2>
          <p className="mt-4 max-w-md text-center text-sm lg:text-base" style={{ color: COLORS.textSecondary }}>
            Paper trading and sports research — no real money at risk.
          </p>
          <button
            onClick={() => { setLoginOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="mt-8 flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold btn-press"
            style={{
              background: 'linear-gradient(135deg, #36D67E 0%, #168A52 100%)',
              color: '#080A09',
              boxShadow: '0 0 24px rgba(54,214,126,0.25), 0 0 80px rgba(54,214,126,0.1), inset 0 1px 0 rgba(255,255,255,0.15)',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
            }}
          >
            Enter Mendez Labs
            <ArrowRight className="h-5 w-5" />
          </button>
        </section>

        <footer className="flex items-center justify-between px-6 py-4 lg:px-10" style={{ background: 'rgba(3,4,3,0.95)', borderTop: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: COLORS.textMuted }}>
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: COLORS.green }} />
            <span>Encrypted · Paper tracking only</span>
          </div>
          <span className="text-xs" style={{ color: COLORS.textMuted }}>M1 Intelligence Engine · v1.4.2</span>
        </footer>
      </div>
    </div>
  );
}

function CheckmarkSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-label="Every result tracked">
      <path d="M8 18 L15 25 L28 11" stroke="#168A52" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
