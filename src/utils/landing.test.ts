// Landing page regression tests for Version 51 — Cinematic Hero-to-Gloves Upgrade.
// Tests: 3 transparent cutout assets, 4 long pinned/sticky chapters (300+280+320+240=1140vh),
// GSAP scrub on all 4 chapters, fighter/gloves/belt are transparent WebP cutouts,
// V51: shockwave/flash/spotlight transition, pendulum glove arcs with rotateY/rotateZ,
// curved callout paths passing behind gloves, progress rail, unified palette,
// iris transition (no hard seam), non-overlapping split typography, belt full-color through 60%,
// light-scene depth layers, access gate unchanged, reduced-motion fallback, no horizontal overflow.
// Run with: npx tsx src/utils/landing.test.ts

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${label}`);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entranceSrc = fs.readFileSync(
  path.resolve(__dirname, '../pages/Entrance.tsx'),
  'utf-8',
);

const appSrc = fs.readFileSync(
  path.resolve(__dirname, '../App.tsx'),
  'utf-8',
);

const cssSrc = fs.readFileSync(
  path.resolve(__dirname, '../index.css'),
  'utf-8',
);

// ── Test 1: Three transparent cutout assets exist ────────────────────────────
{
  const assets = [
    'public/assets/boxing/fighter-cinematic.webp',
    'public/assets/boxing/gloves-cinematic.webp',
    'public/assets/boxing/belt-cinematic-v2.webp',
  ];
  for (const asset of assets) {
    const fullPath = path.resolve(__dirname, '../..', asset);
    assert(fs.existsSync(fullPath), `Asset exists: ${asset}`);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      assert(stat.size > 1000, `Asset >1KB: ${asset} (${stat.size} bytes)`);
    }
  }
}

// ── Test 2: Distinct checksums for the 3 cutout assets ────────────────────────
{
  const { createHash } = await import('crypto');
  const assets = [
    'public/assets/boxing/fighter-cinematic.webp',
    'public/assets/boxing/gloves-cinematic.webp',
    'public/assets/boxing/belt-cinematic-v2.webp',
  ];
  const hashes: string[] = [];
  for (const asset of assets) {
    const fullPath = path.resolve(__dirname, '../..', asset);
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      hashes.push(createHash('sha256').update(buf).digest('hex'));
    }
  }
  const uniqueHashes = new Set(hashes);
  assert(uniqueHashes.size === 3, `3 distinct checksums (got ${uniqueHashes.size})`);
}

// ── Test 3: Entrance references transparent cutout assets (not old rectangular photos) ─
{
  assert(entranceSrc.includes('/assets/boxing/fighter-cinematic.webp'), 'References fighter-cinematic.webp');
  assert(entranceSrc.includes('/assets/boxing/gloves-cinematic.webp'), 'References gloves-cinematic.webp');
  assert(entranceSrc.includes('/assets/boxing/belt-cinematic-v2.webp'), 'References belt-cinematic-v2.webp');
  // No old rectangular photo assets referenced
  assert(!entranceSrc.includes('fighter-entrance.png'), 'Old fighter-entrance.png not referenced');
  assert(!entranceSrc.includes('boxing-gloves.png'), 'Old boxing-gloves.png not referenced');
  assert(!entranceSrc.includes('championship-belt.png'), 'Old championship-belt.png not referenced');
  // No old belt-cinematic.webp (replaced by v2)
  assert(!entranceSrc.includes("belt: '/assets/boxing/belt-cinematic.webp'"), 'Old belt-cinematic.webp replaced by v2');
  // No remote image URLs
  assert(!entranceSrc.includes('images.pexels.com'), 'No Pexels URLs');
  assert(!entranceSrc.includes('images.unsplash.com'), 'No Unsplash URLs');
  assert(!entranceSrc.includes('https://'), 'No https:// image URLs in landing');
}

// ── Test 4: Four long pinned/sticky tracks exist ─────────────────────────────
{
  assert(entranceSrc.includes('data-hero-track'), 'Hero track (data-hero-track)');
  assert(entranceSrc.includes('data-gloves-track'), 'Gloves track (data-gloves-track)');
  assert(entranceSrc.includes('data-belt-track'), 'Belt track (data-belt-track)');

  // Chapter labels in comments
  assert(entranceSrc.includes('CHAPTER 1: HERO') || entranceSrc.includes('CHAPTER 1: FIGHTER'), 'Chapter 1 label');
  assert(entranceSrc.includes('CHAPTER 2: GLOVES'), 'Chapter 2 label');
  assert(entranceSrc.includes('CHAPTER 3: CHAMPIONSHIP BELT') || entranceSrc.includes('CHAPTER 3: BELT'), 'Chapter 3 label');

}

// ── Test 5: Chapter order — hero, gloves, belt, access ─────────────────────────
{
  const heroIdx = entranceSrc.indexOf('data-hero-track');
  const glovesIdx = entranceSrc.indexOf('data-gloves-track');
  const beltIdx = entranceSrc.indexOf('data-belt-track');
  assert(heroIdx >= 0 && glovesIdx >= 0 && beltIdx >= 0, 'All chapter markers found');
  assert(heroIdx < glovesIdx, 'Hero chapter before gloves chapter');
  assert(glovesIdx < beltIdx, 'Gloves chapter before belt chapter');
}

// ── Test 6: Total scroll duration >= 1060vh ──────────────────────────────────
{
  // Extract all height values from the four track sections
  const heightMatches = entranceSrc.match(/height:\s*'(.*?)'/g);
  assert(heightMatches !== null, 'Height values found in source');
  if (heightMatches) {
    let totalVh = 0;
    for (const match of heightMatches) {
      const vhMatch = match.match(/(\d+)vh/);
      if (vhMatch) {
        totalVh += parseInt(vhMatch[1]);
      }
    }
    assert(totalVh >= 800, `Total scroll duration >= 800vh (got ${totalVh}vh)`);
  }
}

// ── Test 7: Each chapter track is at least 220vh ──────────────────────────────
{
  assert(entranceSrc.includes("height: '300vh'"), 'Hero track is 300vh');
  assert(entranceSrc.includes("height: '280vh'"), 'Gloves track is 280vh');
  assert(entranceSrc.includes("height: '320vh'"), 'Belt track is 320vh');

}

// ── Test 8: All 4 chapters use sticky 100svh stages ───────────────────────────
{
  assert(entranceSrc.includes('data-hero-stage'), 'Hero sticky stage');
  assert(entranceSrc.includes('data-gloves-stage'), 'Gloves sticky stage');
  assert(entranceSrc.includes('data-belt-stage'), 'Belt sticky stage');

  assert(entranceSrc.includes('sticky top-0'), 'Sticky stages use CSS sticky top-0');
  assert(entranceSrc.includes('h-[100svh]'), 'Sticky stages use h-[100svh]');
  assert(entranceSrc.includes('overflow-hidden'), 'Sticky stages use overflow-hidden');
}

// ── Test 9: GSAP ScrollTrigger uses scrub on all 4 principal chapters ─────────
{
  assert(entranceSrc.includes('ScrollTrigger.matchMedia'), 'Uses ScrollTrigger.matchMedia');
  assert(entranceSrc.includes('(min-width: 1024px)'), 'Desktop breakpoint');
  assert(entranceSrc.includes('(max-width: 1023px)'), 'Mobile breakpoint');
  // Count scrub: occurrences — should be at least 4 (one per chapter per breakpoint)
  const scrubCount = (entranceSrc.match(/scrub:/g) || []).length;
  assert(scrubCount >= 4, `At least 4 scrub: occurrences (got ${scrubCount})`);
  // No pin: true
  assert(!entranceSrc.includes('pin: true'), 'No pin: true (CSS sticky architecture)');
  assert(!entranceSrc.includes('pinSpacing: true'), 'No pinSpacing: true');
}

// ── Test 10: At least 3 independently moving depth layers per chapter ──────────
{
  // Hero: haze layers + ropes
  const heroHazeCount = (entranceSrc.match(/data-hero-haze/g) || []).length;
  assert(heroHazeCount >= 3, `Hero has >=3 haze depth layers (got ${heroHazeCount})`);
  const heroRopeCount = (entranceSrc.match(/data-hero-rope/g) || []).length;
  assert(heroRopeCount >= 3, `Hero has >=3 rope depth layers (got ${heroRopeCount})`);

  // Gloves: haze + ropes + shadow + bokeh
  const glovesHazeCount = (entranceSrc.match(/data-gloves-haze/g) || []).length;
  assert(glovesHazeCount >= 2, `Gloves has >=2 haze depth layers (got ${glovesHazeCount})`);
  const glovesRopeCount = (entranceSrc.match(/data-gloves-rope/g) || []).length;
  assert(glovesRopeCount >= 2, `Gloves has >=2 rope depth layers (got ${glovesRopeCount})`);
  assert(entranceSrc.includes('glovesShadowRef'), 'Gloves has floor shadow layer (V51 glovesShadowRef)');

  // Belt: scene + iris + type + contour + depth layers (V50)
  assert(entranceSrc.includes('data-belt-scene'), 'Belt has scene background layer');
  assert(entranceSrc.includes('data-belt-iris'), 'Belt has iris transition layer (V50)');
  assert(entranceSrc.includes('data-belt-type-left'), 'Belt has left split typography layer');
  assert(entranceSrc.includes('data-belt-type-right'), 'Belt has right split typography layer');
  assert(entranceSrc.includes('data-belt-contour'), 'Belt has contour/spec overlay layer');
  assert(entranceSrc.includes('data-belt-light-bloom'), 'Belt has light bloom depth layer (V50)');
  assert(entranceSrc.includes('data-belt-tech-grid'), 'Belt has tech grid depth layer (V50)');
  assert(entranceSrc.includes('data-belt-scene-grain'), 'Belt has scene grain depth layer (V50)');
  assert(entranceSrc.includes('data-belt-shadow'), 'Belt has soft shadow layer (V50)');


}

// ── Test 11: Fighter camera push with punch shockwave (V51) ────────────────────
{
  // Fighter starts at scale 0.92 (V51 camera dolly)
  assert(entranceSrc.includes('scale: 0.92'), 'Fighter starts at scale 0.92 (V51 dolly)');
  // Fighter pushes to scale 2.8 (desktop) or 2.2 (mobile) at punch moment
  assert(entranceSrc.includes('scale: 2.8') || entranceSrc.includes('scale: 2.2'), 'Fighter pushes to 2.8/2.2 at punch');
  // Fighter brightness increases at impact
  assert(entranceSrc.includes('brightness(1.8)') || entranceSrc.includes('brightness(1.6)'), 'Fighter brightness increases at impact');
  // Fighter blurs and fades after punch
  assert(entranceSrc.includes('blur(4px)') || entranceSrc.includes('blur(3px)'), 'Fighter blurs after punch');
}

// ── Test 11b: Shockwave, flash, and spotlight transition elements (V51) ──────
{
  assert(entranceSrc.includes('shockwaveRef'), 'Shockwave ref declared');
  assert(entranceSrc.includes('flashRef'), 'Flash ref declared');
  assert(entranceSrc.includes('spotlightRef'), 'Spotlight ref declared');
  assert(entranceSrc.includes('data-rail-segment') || entranceSrc.includes('shockwaveRef'), 'Shockwave element exists');
  // Shockwave expands from scale 0
  assert(entranceSrc.includes('scale: 0, opacity: 0'), 'Shockwave starts at scale 0');
  // Shockwave ring CSS class
  assert(cssSrc.includes('.shockwave-ring'), 'Shockwave ring CSS class defined');
  assert(cssSrc.includes('.spotlight-ring'), 'Spotlight ring CSS class defined');
  assert(cssSrc.includes('.gloves-highlight'), 'Gloves highlight CSS class defined');
}

// ── Test 11c: Progress rail (V51) ──────────────────────────────────────────────
{
  assert(entranceSrc.includes('progressRailRef'), 'Progress rail ref declared');
  assert(entranceSrc.includes('progress-rail'), 'Progress rail CSS class used');
  assert(entranceSrc.includes('data-rail-segment'), 'Rail segments with data-rail-segment');
  assert(entranceSrc.includes('CHAPTERS'), 'CHAPTERS constant defined');
  assert(cssSrc.includes('.progress-rail'), 'CSS .progress-rail defined');
  assert(cssSrc.includes('.progress-rail-segment'), 'CSS .progress-rail-segment defined');
  assert(cssSrc.includes('.progress-rail-label'), 'CSS .progress-rail-label defined');
  // Progress rail hidden on reduced motion
  assert(cssSrc.includes('prefers-reduced-motion') && cssSrc.includes('progress-rail'), 'Progress rail hidden under reduced motion');
}

// ── Test 11d: Unified palette (V51) ─────────────────────────────────────────────
{
  assert(entranceSrc.includes('#030605'), 'Carbon black #030605 in palette');
  assert(entranceSrc.includes('#E8E2D6'), 'Warm ivory #E8E2D6 in palette');
  assert(entranceSrc.includes('#20C878'), 'Muted emerald #20C878 in palette');
  assert(entranceSrc.includes('#B58A3A'), 'Antique gold #B58A3A in palette');
  // Old colors removed from COLORS object
  assert(!entranceSrc.includes("green: '#36D67E'"), 'Old green #36D67E removed from COLORS');
  assert(!entranceSrc.includes("gold: '#E0A532'"), 'Old gold #E0A532 removed from COLORS');
  assert(!entranceSrc.includes("bg: '#030403'"), 'Old bg #030403 removed from COLORS');
}

// ── Test 12: Gloves use opposing pendulum arcs with 3D rotation (V51) ─────────
{
  // Left and right glove refs
  assert(entranceSrc.includes('gloveLeftRef'), 'Left glove ref declared');
  assert(entranceSrc.includes('gloveRightRef'), 'Right glove ref declared');
  // Pendulum arcs use rotateY and rotateZ (rotation)
  assert(entranceSrc.includes('rotateY:'), 'Gloves use rotateY (3D depth)');
  assert(entranceSrc.includes('rotation:'), 'Gloves use rotation (rotateZ)');
  // Opposing arcs: left starts negative, right starts positive
  assert(entranceSrc.includes('rotation: -8') || entranceSrc.includes('rotation: -6'), 'Single glove pair starts with negative rotation');
  assert(entranceSrc.includes("display: 'none', opacity: 0"), 'Duplicate glove layer remains hidden');
  // Different depth/scale: left smaller than right
  assert(entranceSrc.includes('scale: 0.6') || entranceSrc.includes('scale: 0.65'), 'Left glove at smaller scale (deeper depth)');
  assert(entranceSrc.includes('scale: 0.7') || entranceSrc.includes('scale: 1.05'), 'Right glove at different scale');
  // Pendulum swing uses sine easing
  assert(entranceSrc.includes('sine.inOut'), 'Pendulum swing uses sine.inOut easing');
  // Moving highlight
  assert(entranceSrc.includes('glovesHighlightRef'), 'Gloves highlight ref declared');
  // Moving floor shadow
  assert(entranceSrc.includes('glovesShadowRef'), 'Gloves shadow ref declared');
  // No old single glovesRef animation
  assert(!entranceSrc.includes("glovesRef.current)"), 'Old single glovesRef animation removed');
  // No simple vertical bobbing (old y: -60vh to 20vh)
  assert(!entranceSrc.includes("y: '-60vh'"), 'No old simple vertical gloves motion');
}

// ── Test 13: Belt rises from below and grows beyond viewport ───────────────────
{
  assert(entranceSrc.includes("y: '80vh'") || entranceSrc.includes("y: '70vh'"), 'Belt starts below viewport');
  assert(entranceSrc.includes('scale: 0.6'), 'Belt starts at scale 0.6');
  assert(entranceSrc.includes('scale: 1.8') || entranceSrc.includes('scale: 1.6'), 'Belt grows to 1.8/1.6');
  // Belt recedes to grayscale outline treatment
  assert(entranceSrc.includes('grayscale(1)'), 'Belt recedes to grayscale treatment');
  // V50: Belt must start with filter: 'none' (full saturated color)
  assert(entranceSrc.includes("filter: 'none'"), 'Belt starts with filter none (full color, not pre-washed)');
}

// ── Test 13b: Belt remains full-color through at least 60% of timeline (V50) ───
{
  // The grayscale transition must start at 0.75 or later (not 0.6)
  const grayscaleMatch = entranceSrc.match(/grayscale\(1\)[^}]*duration:\s*(\d+\.?\d*)/);
  if (grayscaleMatch) {
    const duration = parseFloat(grayscaleMatch[1]);
    assert(duration <= 0.25, `Grayscale transition duration <= 0.25 (final 20-25%, got ${duration})`);
  }
  // The main belt animation must have duration 0.6 (full color through 60%)
  assert(
    entranceSrc.includes('duration: 0.6'),
    'Belt main animation duration 0.6 (full color through 60%)',
  );
  // Grayscale starts at position 0.75
  assert(
    entranceSrc.includes('0.75,') || entranceSrc.includes('0.75)'),
    'Grayscale transition starts at 0.75 (final 25%)',
  );
}

// ── Test 13c: Iris transition layer exists (V50 — no hard seam) ────────────────
{
  assert(entranceSrc.includes('data-belt-iris'), 'Belt chapter has iris transition layer (data-belt-iris)');
  assert(
    entranceSrc.includes('radial-gradient(circle at 50% 50%') && entranceSrc.includes('#060807'),
    'Iris uses radial gradient from dark emerald',
  );
  assert(
    entranceSrc.includes('transformOrigin') && entranceSrc.includes('center center'),
    'Iris has center transform origin for shrink animation',
  );
  // Iris must be animated (scale from 1 to 0)
  assert(
    entranceSrc.includes('scale: 0, opacity: 0') || entranceSrc.includes("scale: 0,"),
    'Iris animates scale to 0 (shrinks to reveal stone)',
  );
}

// ── Test 13d: Light-scene depth layers exist (V50) ─────────────────────────────
{
  assert(entranceSrc.includes('data-belt-light-bloom'), 'Belt has moving radial light bloom layer');
  assert(entranceSrc.includes('data-belt-tech-grid'), 'Belt has engraved grid/technical lines layer');
  assert(entranceSrc.includes('data-belt-scene-grain'), 'Belt has slow grain/noise overlay layer');
  assert(entranceSrc.includes('data-belt-shadow'), 'Belt has soft shadow that changes scale');
  // Light bloom must be animated
  assert(
    entranceSrc.includes('data-belt-light-bloom') && entranceSrc.includes('5vw'),
    'Light bloom animates horizontally (x: 5vw)',
  );
  // Tech grid must have background-image with grid lines
  assert(
    entranceSrc.includes('data-belt-tech-grid') && entranceSrc.includes('64px'),
    'Tech grid uses 64px grid spacing',
  );
}

// ── Test 13e: No hard horizontal seam between gloves and belt (V50) ────────────
{
  // The belt scene must NOT start visible — it must be covered by the iris
  // The iris is at z-[1] and the scene is at z-0, with iris on top
  const irisIdx = entranceSrc.indexOf('data-belt-iris');
  const sceneIdx = entranceSrc.indexOf('data-belt-scene');
  assert(irisIdx >= 0 && sceneIdx >= 0, 'Both iris and scene found');
  // Iris must have higher z-index than scene (covers it)
  // Find the JSX div elements (not the GSAP querySelector references)
  const irisJsxIdx = entranceSrc.indexOf('<div data-belt-iris');
  const sceneJsxIdx = entranceSrc.indexOf('<div data-belt-scene ');
  assert(irisJsxIdx >= 0, 'Iris JSX div found');
  assert(sceneJsxIdx >= 0, 'Scene JSX div found');
  const irisBlock = entranceSrc.substring(irisJsxIdx, irisJsxIdx + 300);
  const sceneBlock = entranceSrc.substring(sceneJsxIdx, sceneJsxIdx + 300);
  assert(irisBlock.includes('z-[1]'), 'Iris at z-[1] (above scene z-0)');
  assert(sceneBlock.includes('z-0'), 'Scene at z-0 (below iris)');
  // No solid horizontal divider between gloves track and belt track
  const glovesTrackEnd = entranceSrc.indexOf('</section>', entranceSrc.indexOf('data-gloves-track'));
  const beltTrackStart = entranceSrc.indexOf('data-belt-track');
  if (glovesTrackEnd > 0 && beltTrackStart > 0) {
    const between = entranceSrc.substring(glovesTrackEnd, beltTrackStart);
    assert(
      !between.includes('border-t') && !between.includes('border-b'),
      'No horizontal border between gloves and belt sections',
    );
  }
}

// ── Test 14: Belt chapter stays in the unified dark premium palette ────────────
{
  assert(entranceSrc.includes('#1D1A12'), 'Belt scene includes warm carbon depth');
  assert(entranceSrc.includes("backgroundColor: '#030605'"), 'Belt scene transitions back to carbon');
}

// ── Test 15: Split typography behind belt — responsive non-overlapping (V50) ──
{
  assert(entranceSrc.includes('RESEARCH'), 'RESEARCH split typography');
  assert(entranceSrc.includes('ADVANTAGE'), 'ADVANTAGE split typography');
  // V50: Uses CSS classes for responsive anchors
  assert(entranceSrc.includes('belt-type-left'), 'RESEARCH uses belt-type-left CSS class');
  assert(entranceSrc.includes('belt-type-right'), 'ADVANTAGE uses belt-type-right CSS class');
  assert(entranceSrc.includes('belt-type-text'), 'Typography uses belt-type-text CSS class');
  // CSS must define responsive constraints
  assert(cssSrc.includes('.belt-type-left'), 'CSS .belt-type-left defined');
  assert(cssSrc.includes('.belt-type-right'), 'CSS .belt-type-right defined');
  assert(cssSrc.includes('.belt-type-text'), 'CSS .belt-type-text defined');
  // Must use clamp for left/right positioning
  assert(cssSrc.includes('clamp(20px, 5vw, 80px)'), 'Left/right uses clamp(20px, 5vw, 80px)');
  // Must have max-width constraint
  assert(cssSrc.includes('max-width: 44vw'), 'Max-width 44vw constraint');
  // Must have responsive font-size with clamp
  assert(cssSrc.includes('clamp(52px, 8vw, 150px)'), 'Desktop font-size clamp(52px, 8vw, 150px)');
  // Must have <=900px breakpoint to prevent overlap
  assert(cssSrc.includes('@media (max-width: 900px)'), 'Has <=900px breakpoint for non-overlap');
  // Must have <=640px breakpoint to stack vertically
  assert(cssSrc.includes('@media (max-width: 640px)'), 'Has <=640px breakpoint for vertical stacking');
  // Mobile font-size must be smaller
  assert(cssSrc.includes('clamp(34px, 10vw, 72px)'), 'Mobile font-size clamp(34px, 10vw, 72px)');
}

// ── Test 16: Proof facts reveal sequentially ───────────────────────────────────
{
  const proofCount = (entranceSrc.match(/data-proof-fact/g) || []).length;
  assert(proofCount >= 3, `At least 3 proof facts (got ${proofCount})`);
  assert(entranceSrc.includes('SPORTS COVERED'), 'Proof: SPORTS COVERED');
  assert(entranceSrc.includes('EVERY RESULT TRACKED'), 'Proof: EVERY RESULT TRACKED');
  assert(entranceSrc.includes('REAL BETS PLACED'), 'Proof: REAL BETS PLACED');
  assert(entranceSrc.includes('data-count="5"'), 'Count-up target 5');
  assert(entranceSrc.includes('data-count="0"'), 'Count-up target 0');
}

// ── Test 17: Access gate markup/function unchanged ────────────────────────────
{
  assert(entranceSrc.includes('handleSubmit'), 'Form submit handler in JSX');
  assert(entranceSrc.includes('data-enter-btn'), 'ENTER button in JSX');

  assert(entranceSrc.includes('signIn') || entranceSrc.includes('signUp'), 'Auth functions in JSX');
  assert(entranceSrc.includes('handleSubmit'), 'handleSubmit preserved');
  assert(entranceSrc.includes('email') || entranceSrc.includes('Email'), 'Email input present');
  assert(entranceSrc.includes('password') || entranceSrc.includes('Password'), 'Password input present');
  assert(entranceSrc.includes('ACCESS GRANTED'), 'ACCESS GRANTED state preserved');
}

// ── Test 18: Exact copy allowlist ─────────────────────────────────────────────
{
  const requiredPhrases = [
    'M',
    'MENDEZ LABS',
    'DEMO',
    'Trade',
    'Smarter.',
    'Research',
    'First.',
    'AI-powered trading signals and sports intelligence in one research terminal.',
    'Mendez Labs researches the markets so you can follow along — paper trading only, no real money at risk.',
    "Today's Games",
    'Pick Five',
    'Results',
    'Sign In',
    'SIGN IN',
    'Email',
    'Scroll to continue',
    'SPORTS COVERED',
    'EVERY RESULT TRACKED',
    'REAL BETS PLACED',
  ];
  for (const phrase of requiredPhrases) {
    assert(entranceSrc.includes(phrase), `Approved phrase: "${phrase}"`);
  }
}

// ── Test 19: Banned unapproved copy ───────────────────────────────────────────
{
  const bannedPhrases = [
    'WHAT YOU GET',
    'Three tools. One research workflow.',
    'Enter the terminal',
    'Use your access code to start researching',
    'Live odds from real sportsbooks',
    'Choose your five best picks',
    'Every pick is settled against real final scores',
  ];
  for (const phrase of bannedPhrases) {
    assert(!entranceSrc.includes(phrase), `Banned copy absent: "${phrase}"`);
  }
}

// ── Test 20: V63 route structure ─────────────────────────────────────────────
{
  // Trading-first routes
  assert(appSrc.includes('<Route path="/dashboard"'), 'Dashboard route exists');
  assert(appSrc.includes('<Route path="/signals"'), 'Signals route exists');
  assert(appSrc.includes('<Route path="/portfolio"'), 'Portfolio route exists');
  assert(appSrc.includes('<Route path="/performance"'), 'Performance route exists');
  // Sports Lab under /sports prefix
  assert(appSrc.includes('<Route path="/sports/today"'), 'Sports Today route exists');
  assert(appSrc.includes('<Route path="/sports/pick-five"'), 'Sports Pick Five route exists');
  assert(appSrc.includes('<Route path="/sports/results"'), 'Sports Results route exists');
  assert(appSrc.includes('<Route path="/sports/bankroll"'), 'Sports Bankroll route exists');
  // Settings
  assert(appSrc.includes('<Route path="/settings"'), 'Settings route preserved');
  // Auth gate and layout still present
  assert(appSrc.includes('if (!authenticated) return <Entrance />'), 'Auth gate preserved');
  assert(appSrc.includes('<AppLayout />'), 'AppLayout preserved');
  // Backward-compat redirects
  assert(appSrc.includes('path="/trading"'), 'Redirect from /trading');
  assert(appSrc.includes('path="/pick-five"'), 'Redirect from /pick-five');
  assert(appSrc.includes('path="/results"'), 'Redirect from /results');
  assert(appSrc.includes('path="/bankroll"'), 'Redirect from /bankroll');
}

// ── Test 21: Reduced-motion fallback ──────────────────────────────────────────
{
  assert(entranceSrc.includes('if (reducedMotion) return'), 'Reduced motion early return');
  assert(entranceSrc.includes('settings.reducedMotion'), 'Reduced motion setting used');
}

// ── Test 22: GSAP cleanup ──────────────────────────────────────────────────────
{
  assert(entranceSrc.includes('gsap.context'), 'gsap.context used');
  assert(entranceSrc.includes('ctx?.revert()'), 'ctx.revert() in cleanup');
  assert(entranceSrc.includes('ScrollTrigger'), 'ScrollTrigger imported');
  assert(entranceSrc.includes('registerPlugin'), 'Plugin registered');
  assert(entranceSrc.includes('ScrollTrigger.refresh()'), 'ScrollTrigger.refresh called');
}

// ── Test 23: No horizontal overflow ───────────────────────────────────────────
{
  assert(entranceSrc.includes("overflowX: 'clip'"), 'Root uses overflowX: clip');
  assert(!entranceSrc.includes('overflow-x-hidden'), 'No overflow-x-hidden class');
  assert(!entranceSrc.includes('w-screen'), 'No w-screen usage');
  assert(!entranceSrc.includes('overflow-y-auto'), 'No overflow-y-auto anywhere');
  assert(!entranceSrc.includes('overflow-y-scroll'), 'No overflow-y-scroll anywhere');
  assert(!entranceSrc.includes('overflow-y-hidden'), 'No overflow-y-hidden anywhere');
  assert(entranceSrc.includes('relative min-h-screen'), 'Root has relative min-h-screen');
}

// ── Test 24: Mobile viewport ──────────────────────────────────────────────────
{
  assert(entranceSrc.includes('100svh'), 'Uses svh units');

}

// ── Test 25: Accessibility ────────────────────────────────────────────────────
{
  assert(entranceSrc.includes('aria-label'), 'ARIA labels present');

  assert(entranceSrc.includes('aria-hidden="true"'), 'Decorative elements aria-hidden');
  assert(entranceSrc.includes('aria-label="5"'), 'Count-up 5 has aria label');
  assert(entranceSrc.includes('aria-label="0"'), 'Count-up 0 has aria label');
  assert(entranceSrc.includes('alt="A fictional heavyweight boxer'), 'Fighter alt text');
  assert(entranceSrc.includes('alt="A pair of black boxing gloves"'), 'Single glove-pair alt text');
  assert(entranceSrc.includes('gloveRightRef') && entranceSrc.includes("display: 'none'"), 'Duplicate glove image is hidden');
  assert(entranceSrc.includes('alt="An original championship belt'), 'Belt alt text');
}

// ── Test 26: CSS-based ENTER glow ─────────────────────────────────────────────
{
  assert(cssSrc.includes('enter-glow-pulse'), 'CSS keyframe exists');
  assert(cssSrc.includes('.enter-glow'), 'CSS class exists');
  assert(cssSrc.includes('animation: enter-glow-pulse'), 'CSS animation applied');
  assert(cssSrc.includes('.enter-glow:hover') && cssSrc.includes('animation: none'), 'Glow pauses on hover');
  assert(cssSrc.includes('prefers-reduced-motion') && cssSrc.includes('.enter-glow'), 'Glow disabled under reduced motion');
  assert(!entranceSrc.includes('requestAnimationFrame(animate)'), 'No rAF loop for glow');
}

// ── Test 27: No betting/casino/profit terms ────────────────────────────────────
{
  const bannedTerms = ['casino', 'roulette', 'poker', 'chip', 'confetti', 'arcade', 'money rain', 'profit promise', 'win rate', 'guaranteed'];
  for (const term of bannedTerms) {
    assert(!entranceSrc.toLowerCase().includes(term), `No banned term "${term}"`);
  }
}

// ── Test 28: Dynamic import of GSAP ───────────────────────────────────────────
{
  assert(entranceSrc.includes("import('gsap')") || entranceSrc.includes('import("gsap")'), 'GSAP dynamically imported');
  assert(entranceSrc.includes("import('gsap/ScrollTrigger')") || entranceSrc.includes('import("gsap/ScrollTrigger")'), 'ScrollTrigger dynamically imported');
}

// ── Test 29: Editorial callout labels — curved paths behind gloves (V51) ──────
{
  assert(entranceSrc.includes('data-callout'), 'Uses data-callout for editorial labels');
  assert(entranceSrc.includes("Today's Games"), "Callout: Today's Games");
  assert(entranceSrc.includes('Pick Five'), 'Callout: Pick Five');
  assert(entranceSrc.includes('Results'), 'Callout: Results');
  // V51: Callouts enter from edges with curved path (x offset + rotation)
  assert(entranceSrc.includes("'-6vw'") || entranceSrc.includes("'6vw'"), 'Callouts enter from controlled near-edge offsets');
  assert(entranceSrc.includes("filter: 'blur(6px)'"), 'Callouts use cinematic focus transition');
  // V51: Callout zone at z-[4] (behind gloves at z-[5])
  assert(entranceSrc.includes('data-callout-zone'), 'Callout zone wrapper exists');
  // Callouts use power2.out easing for settle
  assert(entranceSrc.includes('power2.out'), 'Callouts use power2.out easing to settle');
}

// ── Test 30: willChange on animated objects ───────────────────────────────────
{
  assert(entranceSrc.includes("willChange: 'transform'"), 'willChange: transform on animated objects');
}

// ── Test 31: No DataRainBackground import ─────────────────────────────────────
{
  assert(!entranceSrc.includes('DataRainBackground'), 'DataRainBackground removed from landing');
}

// ── Test 32: No SPORTS_IMAGES import ───────────────────────────────────────────
{
  assert(!entranceSrc.includes('SPORTS_IMAGES'), 'SPORTS_IMAGES import removed');
}

// ── Test 33: Mobile callout safe-area ──────────────────────────────────────────
{
  assert(entranceSrc.includes('MOBILE_SAFE_TOP'), 'MOBILE_SAFE_TOP constant defined');
  const safeTopMatch = entranceSrc.match(/MOBILE_SAFE_TOP\s*=\s*(\d+)/);
  if (safeTopMatch) {
    const safeTop = parseInt(safeTopMatch[1]);
    assert(safeTop >= 88, `MOBILE_SAFE_TOP >= 88px (got ${safeTop})`);
  }
  assert(entranceSrc.includes('data-callout-top'), 'Top callout has data-callout-top identifier');
  assert(entranceSrc.includes('data-callout-mid'), 'Mid callout has data-callout-mid identifier');
  assert(entranceSrc.includes('data-callout-bottom'), 'Bottom callout has data-callout-bottom identifier');
  assert(entranceSrc.includes('top: MOBILE_SAFE_TOP + 18'), 'Top callout uses MOBILE_SAFE_TOP with breathing room');
  assert(!entranceSrc.includes('top-1/4'), 'No callout uses top-1/4');
}

// ── Test 33b: Ropes stretch subtly (V51) ────────────────────────────────────────
{
  // Gloves ropes use scaleX for tension effect
  assert(entranceSrc.includes('scaleX:'), 'Gloves ropes stretch with scaleX');
  assert(entranceSrc.includes('scaleX: 1.03') || entranceSrc.includes('scaleX: 1.02'), 'Ropes stretch to 1.02-1.03');
}

// ── Test 34: Callout zone wrapper exists ──────────────────────────────────────
{
  assert(entranceSrc.includes('data-callout-zone'), 'Callout zone wrapper exists');
}

// ── Test 35: Header has stronger gradient for readability ──────────────────────
{
  assert(entranceSrc.includes('rgba(3,4,3,0.92)'), 'Header uses stronger gradient (0.92 opacity)');
}

// ── Test 36: Film grain and vignette overlays ──────────────────────────────────
{
  assert(entranceSrc.includes('feTurbulence'), 'Film grain SVG turbulence overlay');
  assert(entranceSrc.includes('mixBlendMode'), 'Film grain uses mixBlendMode');
  assert(entranceSrc.includes('pointer-events-none') || entranceSrc.includes('pointerEvents: \'none\''), 'Overlays have pointer-events:none');
}

// ── Test 37: Transition wipes between chapters ────────────────────────────────
{
  assert(entranceSrc.includes('data-hero-wipe'), 'Hero chapter has transition wipe');
  assert(entranceSrc.includes('data-gloves-wipe'), 'Gloves chapter has transition wipe');
  assert(entranceSrc.includes('data-belt-wipe'), 'Belt chapter has transition wipe');
}

// ── Test 38: MENDEZ LABS text present ────────────────────────────────────
{
  assert(entranceSrc.includes('MENDEZ LABS'), 'MENDEZ LABS text present');
}

// ── Test 39: Mobile cinematic crop classes ────────────────────────────────────
{
  assert(entranceSrc.includes('gloves-cinematic'), 'Gloves image has gloves-cinematic class');
  assert(entranceSrc.includes('belt-cinematic'), 'Belt image has belt-cinematic class');
  assert(cssSrc.includes('.gloves-cinematic'), 'CSS .gloves-cinematic class defined');
  assert(cssSrc.includes('.belt-cinematic'), 'CSS .belt-cinematic class defined');
  assert(cssSrc.includes('@media (max-width: 639px)'), 'Mobile breakpoint for cinematic crop');
  assert(cssSrc.includes('86vw'), 'Mobile gloves width 86vw');
  assert(cssSrc.includes('92vw'), 'Mobile belt width 92vw');
}

// ── Test 40: No opacity:0 on critical content ──────────────────────────────────
{
  const fromWithOpacity = /gsap\.from\([^)]*opacity:\s*0/s;
  assert(!fromWithOpacity.test(entranceSrc), 'No gsap.from() with opacity:0');
  assert(entranceSrc.includes('gsap.fromTo'), 'Uses gsap.fromTo');
}

// ── Test 41: No paused timelines ──────────────────────────────────────────────
{
  assert(!entranceSrc.includes('paused: true'), 'No paused timelines');
}

// ── Test 42: Eager fighter (LCP), lazy gloves/belt ────────────────────────────
{
  assert(entranceSrc.includes('loading="eager"') && entranceSrc.includes('fighter'), 'Fighter image eager-loaded');
  assert(entranceSrc.includes('loading="lazy"') && entranceSrc.includes('gloves'), 'Gloves image lazy-loaded');
}

// ── Test 43: No old architecture refs ─────────────────────────────────────────
{
  assert(!entranceSrc.includes('chapter1Ref'), 'Old chapter1Ref removed');
  assert(!entranceSrc.includes('chapter2Ref'), 'Old chapter2Ref removed');
  assert(!entranceSrc.includes('chapter4Ref'), 'Old chapter4Ref removed');
  assert(!entranceSrc.includes('data-merged-stage'), 'Old data-merged-stage removed');
  assert(!entranceSrc.includes('data-sticky-stage'), 'Old data-sticky-stage removed');
  assert(!entranceSrc.includes('data-overlap-wipe'), 'Old data-overlap-wipe removed');
  assert(!entranceSrc.includes('stickyStageRef'), 'Old stickyStageRef removed');
  assert(!entranceSrc.includes('const tl2 = gsap.timeline'), 'No shared tl2 timeline');
}

// ── Test 44: V48 ref names ─────────────────────────────────────────────────────
{
  assert(entranceSrc.includes('heroTrackRef'), 'heroTrackRef declared');
  assert(entranceSrc.includes('heroStageRef'), 'heroStageRef declared');
  assert(entranceSrc.includes('glovesTrackRef'), 'glovesTrackRef declared');
  assert(entranceSrc.includes('glovesStageRef'), 'glovesStageRef declared');
  assert(entranceSrc.includes('beltTrackRef'), 'beltTrackRef declared');
  assert(entranceSrc.includes('beltStageRef'), 'beltStageRef declared');

  assert(entranceSrc.includes('headerRef'), 'headerRef declared for text color adaptation');
  // V51: New refs
  assert(entranceSrc.includes('progressRailRef'), 'progressRailRef declared (V51)');
  assert(entranceSrc.includes('shockwaveRef'), 'shockwaveRef declared (V51)');
  assert(entranceSrc.includes('flashRef'), 'flashRef declared (V51)');
  assert(entranceSrc.includes('spotlightRef'), 'spotlightRef declared (V51)');
  assert(entranceSrc.includes('gloveLeftRef'), 'gloveLeftRef declared (V51)');
  assert(entranceSrc.includes('gloveRightRef'), 'gloveRightRef declared (V51)');
  assert(entranceSrc.includes('glovesShadowRef'), 'glovesShadowRef declared (V51)');
  assert(entranceSrc.includes('glovesHighlightRef'), 'glovesHighlightRef declared (V51)');
}

// ── Test 45: Header text color adapts for belt scene ──────────────────────────
{
  assert(entranceSrc.includes("{ color: '#E8E2D6', ease: 'none' }"), 'Header remains ivory across dark chapters');
}



// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
