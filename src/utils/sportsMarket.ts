import type { League } from '@/types/models';

export type MarketType = 'Spread' | 'Total' | 'Moneyline' | 'Handicap' | 'Run Line' | 'Puck Line' | '1X2';

export function getMarketType(market: string): MarketType {
  if (market.startsWith('Spread')) return 'Spread';
  if (market.startsWith('Total')) return 'Total';
  if (market.startsWith('Run Line')) return 'Run Line';
  if (market.startsWith('Puck Line')) return 'Puck Line';
  if (market.startsWith('Handicap')) return 'Handicap';
  if (market === '1X2') return '1X2';
  return 'Moneyline';
}

/**
 * Canonical selection label: "{marketType} · {side}"
 * The side field already carries the team + line exactly once.
 * Never duplicates the line value or shows contradictory signs.
 */
export function formatSelection(market: string, side: string): string {
  const type = getMarketType(market);
  return `${type} · ${side}`;
}

/**
 * League-specific neutral icon/symbol for display in tables and cards.
 * Never uses Bitcoin ₿ for non-crypto sports.
 */
export function getLeagueSymbol(league: League): string {
  switch (league) {
    case 'NBA': return '♙';
    case 'NFL': return '★';
    case 'MLB': return '◆';
    case 'NHL': return '❄';
    case 'Soccer': return '◉';
  }
}
