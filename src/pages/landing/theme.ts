// Landing-page palette and type constants. "LP" = Landing Page.
//
// Direction: private-aviation minimalism — deep navy-charcoal grounds, white
// type, one cold sky accent, and a lot of air. The premium read comes from
// restraint, so the palette is deliberately narrow: two darks, two lights,
// one accent. Resist adding a sixth colour.
export const LP = {
  // Grounds — deep navy-charcoal, not warm brown.
  carbon: '#0B1016',
  surface: '#131B24',
  elevated: '#1B242F',

  // Lights
  ivory: '#FFFFFF',
  bone: '#F2F5F8',
  inkOnIvory: '#0B1016',
  mutedOnIvory: '#5A6673',

  // Type on dark
  textOnDark: '#FFFFFF',
  mutedOnDark: '#8C9AA8',

  // The one accent — cold sky blue, taken from the horizon.
  sky: '#8FB6DA',
  skyDeep: '#5C89B4',
  skyTop: '#A9C6E2',
  skyBottom: '#7BA0C6',
  skyMid: '#9BBCDD',
  textOnSky: '#0B1016',

  // Retained keys so existing sections keep compiling; both now read as the
  // single sky accent rather than a competing gold/green.
  gold: '#8FB6DA',
  champagne: '#A9C6E2',
  emerald: '#6FB69B',
  emeraldDeep: '#3E8570',

  borderDark: 'rgba(255,255,255,0.10)',
  borderLight: 'rgba(11,16,22,0.12)',

  display: "'Archivo', 'Sora', 'Inter', sans-serif",
  displayHero: "'Bricolage Grotesque', 'Archivo', 'Sora', sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;
