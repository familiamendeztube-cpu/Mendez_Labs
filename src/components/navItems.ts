import {
  LayoutDashboard,
  Activity,
  BookOpen,
  Trophy,
  Settings as SettingsIcon,
  CalendarDays,
  BarChart3,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavChild {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  children?: NavChild[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Trading', icon: LayoutDashboard },
  { path: '/signals', label: 'Trade Signals', icon: Activity },
  { path: '/portfolio', label: 'Paper Portfolio', icon: BookOpen },
  { path: '/performance', label: 'Performance', icon: BarChart3 },
  {
    path: '/sports',
    label: 'Sports Lab',
    icon: Trophy,
    children: [
      { path: '/sports/today', label: 'Today', icon: CalendarDays },
      { path: '/sports/pick-five', label: 'Top Five', icon: Trophy },
      { path: '/sports/results', label: 'Results', icon: BarChart3 },
      { path: '/sports/bankroll', label: 'Bankroll', icon: Wallet },
    ],
  },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((i) => !i.children).slice(0, 4);
export const MOBILE_SPORTS_ENTRY: NavItem = NAV_ITEMS.find((i) => i.path === '/sports')!;

export const SPORTS_SUB_ITEMS: NavChild[] =
  NAV_ITEMS.find((i) => i.path === '/sports')?.children ?? [];
