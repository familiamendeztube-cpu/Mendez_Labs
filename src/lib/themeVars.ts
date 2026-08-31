// Shorthand accessors for theme CSS variables — use in inline styles.
// Example: style={{ color: tv.textPrimary, background: tv.bgSurface }}

function v(name: string) { return `var(${name})`; }

export const tv = {
  bgRoot: v('--bg-root'),
  bgSurface: v('--bg-surface'),
  bgElevated: v('--bg-elevated'),
  bgOverlay: v('--bg-overlay'),
  textPrimary: v('--text-primary'),
  textSecondary: v('--text-secondary'),
  textMuted: v('--text-muted'),
  accent: v('--accent'),
  accentDeep: v('--accent-deep'),
  statusRed: v('--status-red'),
  statusAmber: v('--status-amber'),
  borderBase: v('--border-base'),
  borderActive: v('--border-active'),
  focusRing: v('--focus-ring'),
  chartGreen: v('--chart-green'),
  chartRed: v('--chart-red'),
  chartGrid: v('--chart-grid'),
} as const;

// Generate rgba from a CSS variable — only works when the var is a solid hex.
// For borders/backgrounds that need opacity, define the rgba in the theme itself.
export function accentAlpha(opacity: number) {
  return `color-mix(in srgb, var(--accent) ${Math.round(opacity * 100)}%, transparent)`;
}

export function redAlpha(opacity: number) {
  return `color-mix(in srgb, var(--status-red) ${Math.round(opacity * 100)}%, transparent)`;
}

export function amberAlpha(opacity: number) {
  return `color-mix(in srgb, var(--status-amber) ${Math.round(opacity * 100)}%, transparent)`;
}

export function mutedAlpha(opacity: number) {
  return `color-mix(in srgb, var(--text-muted) ${Math.round(opacity * 100)}%, transparent)`;
}

export function primaryAlpha(opacity: number) {
  return `color-mix(in srgb, var(--text-primary) ${Math.round(opacity * 100)}%, transparent)`;
}

export function surfaceAlpha(opacity: number) {
  return `color-mix(in srgb, var(--bg-surface) ${Math.round(opacity * 100)}%, transparent)`;
}
