import { type ReactNode, useEffect, useRef, useState } from 'react';
import { InfoDot } from './Tooltip';
import { tv } from '@/lib/themeVars';

type Trend = 'up' | 'down' | 'neutral';

interface Props {
  label: string;
  value: string;
  sub?: string;
  trend?: Trend;
  tooltip?: string;
  accent?: 'intel' | 'cyan' | 'amber' | 'risk';
  icon?: ReactNode;
  numeric?: number;
  formatNum?: (n: number) => string;
}

const accentColor = (a: string) =>
  a === 'intel' ? tv.accent
  : a === 'cyan' ? tv.accentDeep
  : a === 'amber' ? tv.statusAmber
  : tv.statusRed;

function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target || isNaN(target)) { setVal(target); return; }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setVal(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * ease);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return val;
}

function useFlash(value: string) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<'green' | 'red' | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (prev.current !== value && prev.current !== '') {
      const numPrev = parseFloat(prev.current.replace(/[^0-9.-]/g, ''));
      const numCur = parseFloat(value.replace(/[^0-9.-]/g, ''));
      if (!isNaN(numPrev) && !isNaN(numCur) && numPrev !== numCur) {
        setFlash(numCur > numPrev ? 'green' : 'red');
        clearTimeout(timeout.current);
        timeout.current = setTimeout(() => setFlash(null), 800);
      }
    }
    prev.current = value;
  }, [value]);

  return flash;
}

export function MetricCard({ label, value, sub, trend, tooltip, accent = 'intel', icon, numeric, formatNum }: Props) {
  const trendColor = trend === 'up' ? tv.accent : trend === 'down' ? tv.statusRed : tv.textSecondary;
  const color = accentColor(accent);
  const flash = useFlash(value);
  const counted = useCountUp(numeric ?? NaN);
  const displayValue = numeric != null && formatNum ? formatNum(counted) : value;

  return (
    <div
      className={`relative flex flex-col gap-1 rounded-2xl p-4 card-lift ${flash === 'green' ? 'flash-green' : flash === 'red' ? 'flash-red' : ''}`}
      style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tv.textSecondary }}>
          {label}
          {tooltip && <InfoDot label={tooltip} />}
        </span>
        {icon && <span style={{ color }}>{icon}</span>}
      </div>
      <span className="mono text-2xl font-semibold" style={{ color }}>{displayValue}</span>
      {sub && (
        <span className="mono text-xs" style={{ color: trendColor }}>
          {sub}
        </span>
      )}
    </div>
  );
}
