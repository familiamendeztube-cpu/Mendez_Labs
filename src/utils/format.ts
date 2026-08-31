// Formatting utilities for the Mendez Intelligence Terminal.

export function fmtCurrency(n: number, decimals = 2): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function fmtSignedCurrency(n: number, decimals = 2): string {
  const sign = n < 0 ? '-' : '+';
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function fmtPercent(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'N/A';
  return `${(n * 100).toFixed(decimals)}%`;
}

export function fmtSignedPercent(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'N/A';
  const abs = Math.abs(n * 100);
  const formatted = abs.toFixed(decimals);
  if (n > 0) return `+${formatted}%`;
  if (n < 0) return `-${formatted}%`;
  return `${formatted}%`;
}

export function fmtSignedPp(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'N/A';
  const abs = Math.abs(n * 100);
  const formatted = abs.toFixed(decimals);
  if (n > 0) return `+${formatted}pp`;
  if (n < 0) return `-${formatted}pp`;
  return `0.0pp`;
}

export function fmtPercentPrecise(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'N/A';
  const abs = Math.abs(n * 100);
  const decimals = abs < 0.1 ? 2 : 1;
  return `${(n * 100).toFixed(decimals)}%`;
}

export function fmtOdds(american: number): string {
  const sign = american >= 0 ? '+' : '';
  return `${sign}${american}`;
}

export function fmtNumber(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtCompact(n: number): string {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} ${fmtTime(iso)} UTC`;
}

export function fmtUtcClock(d: Date = new Date()): string {
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Convert American odds to implied probability (0-1), accounting for vig.
export function americanToImplied(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

// Decimal odds from American
export function americanToDecimal(odds: number): number {
  if (odds > 0) return odds / 100 + 1;
  return 100 / -odds + 1;
}

// Payout multiplier on stake (profit)
export function payoutMultiplier(odds: number): number {
  if (odds > 0) return odds / 100;
  return 100 / -odds;
}
