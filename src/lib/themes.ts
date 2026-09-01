export interface ThemeColors {
  '--bg-root': string;
  '--bg-surface': string;
  '--bg-elevated': string;
  '--bg-overlay': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--accent': string;
  '--accent-deep': string;
  '--status-red': string;
  '--status-amber': string;
  '--border-base': string;
  '--border-active': string;
  '--focus-ring': string;
  '--chart-green': string;
  '--chart-red': string;
  '--chart-grid': string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

export const THEMES: Theme[] = [
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Warm espresso and champagne — the house look',
    colors: {
      '--bg-root': '#1B1511',
      '--bg-surface': '#241C15',
      '--bg-elevated': '#2E2419',
      '--bg-overlay': '#150F0B',
      '--text-primary': '#F5EEE1',
      '--text-secondary': '#C6BEAF',
      '--text-muted': '#8A8072',
      '--accent': '#D6B77A',
      '--accent-deep': '#B58A3A',
      '--status-red': '#E06B62',
      '--status-amber': '#E0A532',
      '--border-base': 'rgba(237,229,213,0.12)',
      '--border-active': 'rgba(214,183,122,0.5)',
      '--focus-ring': '#D6B77A',
      '--chart-green': '#5FB98A',
      '--chart-red': '#E06B62',
      '--chart-grid': 'rgba(237,229,213,0.06)',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep navy with electric blue accents',
    colors: {
      '--bg-root': '#020818',
      '--bg-surface': '#0A1628',
      '--bg-elevated': '#132240',
      '--bg-overlay': '#06102A',
      '--text-primary': '#E8ECF4',
      '--text-secondary': '#94A3C0',
      '--text-muted': '#5B6B8A',
      '--accent': '#3B82F6',
      '--accent-deep': '#1D4ED8',
      '--status-red': '#EF4444',
      '--status-amber': '#F59E0B',
      '--border-base': 'rgba(148,163,192,0.12)',
      '--border-active': 'rgba(59,130,246,0.42)',
      '--focus-ring': '#60A5FA',
      '--chart-green': '#22C55E',
      '--chart-red': '#EF4444',
      '--chart-grid': 'rgba(91,107,138,0.08)',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Pure black with warm gold highlights',
    colors: {
      '--bg-root': '#000000',
      '--bg-surface': '#0A0A0A',
      '--bg-elevated': '#171717',
      '--bg-overlay': '#050505',
      '--text-primary': '#FAFAFA',
      '--text-secondary': '#A3A3A3',
      '--text-muted': '#6B6B6B',
      '--accent': '#F59E0B',
      '--accent-deep': '#B45309',
      '--status-red': '#DC2626',
      '--status-amber': '#EA580C',
      '--border-base': 'rgba(163,163,163,0.12)',
      '--border-active': 'rgba(245,158,11,0.42)',
      '--focus-ring': '#FBBF24',
      '--chart-green': '#22C55E',
      '--chart-red': '#DC2626',
      '--chart-grid': 'rgba(107,107,107,0.08)',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'Icy light theme with teal accents',
    colors: {
      '--bg-root': '#F0F4F8',
      '--bg-surface': '#FFFFFF',
      '--bg-elevated': '#E8EDF2',
      '--bg-overlay': '#F5F7FA',
      '--text-primary': '#0F172A',
      '--text-secondary': '#475569',
      '--text-muted': '#94A3B8',
      '--accent': '#0D9488',
      '--accent-deep': '#0F766E',
      '--status-red': '#DC2626',
      '--status-amber': '#D97706',
      '--border-base': 'rgba(15,23,42,0.10)',
      '--border-active': 'rgba(13,148,136,0.42)',
      '--focus-ring': '#14B8A6',
      '--chart-green': '#10B981',
      '--chart-red': '#EF4444',
      '--chart-grid': 'rgba(148,163,184,0.12)',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm dark theme with fiery red-orange accents',
    colors: {
      '--bg-root': '#0C0404',
      '--bg-surface': '#1A0A0A',
      '--bg-elevated': '#2A1212',
      '--bg-overlay': '#110808',
      '--text-primary': '#FEF2F2',
      '--text-secondary': '#C8A0A0',
      '--text-muted': '#8B6060',
      '--accent': '#F97316',
      '--accent-deep': '#C2410C',
      '--status-red': '#EF4444',
      '--status-amber': '#FBBF24',
      '--border-base': 'rgba(200,160,160,0.12)',
      '--border-active': 'rgba(249,115,22,0.42)',
      '--focus-ring': '#FB923C',
      '--chart-green': '#4ADE80',
      '--chart-red': '#F87171',
      '--chart-grid': 'rgba(139,96,96,0.08)',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Neutral gray — clean and professional',
    colors: {
      '--bg-root': '#09090B',
      '--bg-surface': '#18181B',
      '--bg-elevated': '#27272A',
      '--bg-overlay': '#0F0F12',
      '--text-primary': '#FAFAFA',
      '--text-secondary': '#A1A1AA',
      '--text-muted': '#71717A',
      '--accent': '#A78BFA',
      '--accent-deep': '#7C3AED',
      '--status-red': '#F87171',
      '--status-amber': '#FBBF24',
      '--border-base': 'rgba(161,161,170,0.12)',
      '--border-active': 'rgba(167,139,250,0.42)',
      '--focus-ring': '#C4B5FD',
      '--chart-green': '#4ADE80',
      '--chart-red': '#F87171',
      '--chart-grid': 'rgba(113,113,122,0.08)',
    },
  },
];

export function getThemeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(key, value);
  }
  root.style.setProperty('--bg-root', theme.colors['--bg-root']);
  document.body.style.backgroundColor = theme.colors['--bg-root'];
}

const THEME_STORAGE_KEY = 'm1-theme-id';

export function loadThemeId(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? 'terminal';
  } catch {
    return 'terminal';
  }
}

export function saveThemeId(id: string) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
