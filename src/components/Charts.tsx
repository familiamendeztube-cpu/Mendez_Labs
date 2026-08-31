import { useState, useEffect } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EquityPoint, DailyPnlPoint, PerformancePoint } from '@/types/models';
import { fmtCurrency, fmtSignedCurrency, fmtPercent } from '@/utils/format';
import { tv } from '@/lib/themeVars';

const axisStyle = { fontSize: 10, fill: tv.textMuted, fontFamily: 'JetBrains Mono, monospace' };
const gridStyle = { stroke: tv.chartGrid };

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string | number;
}

function ChartTooltip({ active, payload, label, formatter }: TooltipProps & { formatter?: (v: number) => string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-xs"
      style={{
        borderColor: 'rgba(54,214,126,0.2)',
        border: '1px solid rgba(54,214,126,0.15)',
        background: 'rgba(12,15,13,0.95)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(54,214,126,0.06)',
      }}
    >
      {label !== undefined && <div className="mb-1.5 font-medium" style={{ color: tv.textMuted }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="mono flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 4px ${p.color}` }} />
          <span style={{ color: tv.textMuted }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: tv.textPrimary }}>{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function useAnimatedOpacity(delay = 200) {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setOpacity(1); return; }
    const t = setTimeout(() => setOpacity(1), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return opacity;
}

export function EquityCurveChart({ data }: { data: EquityPoint[] }) {
  const opacity = useAnimatedOpacity();
  const chartData = data.map((p) => ({ t: new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: p.value }));
  return (
    <div style={{ opacity, transition: 'opacity 0.6s ease' }}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tv.chartGreen} stopOpacity={0.28} />
              <stop offset="40%" stopColor={tv.chartGreen} stopOpacity={0.12} />
              <stop offset="100%" stopColor={tv.chartGreen} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} vertical={false} />
          <XAxis dataKey="t" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={30} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `$${v}`} />
          <RTooltip content={<ChartTooltip formatter={fmtCurrency} />} />
          <Area type="monotone" dataKey="value" name="Equity" stroke={tv.chartGreen} strokeWidth={2} fill="url(#equityGrad)" animationDuration={1200} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyPnlChart({ data }: { data: DailyPnlPoint[] }) {
  const opacity = useAnimatedOpacity();
  const chartData = data.map((p) => ({ date: p.date.slice(5), pnl: p.pnl }));
  return (
    <div style={{ opacity, transition: 'opacity 0.6s ease' }}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${v}`} />
          <RTooltip content={<ChartTooltip formatter={fmtSignedCurrency} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
          <Bar dataKey="pnl" name="P&L" radius={[3, 3, 0, 0]} animationDuration={1000} animationEasing="ease-out">
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.pnl >= 0 ? tv.chartGreen : tv.chartRed} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PerformanceComparisonChart({ data }: { data: PerformancePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
        <RTooltip content={<ChartTooltip formatter={(v) => fmtSignedCurrency(v)} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="sports" name="Sports" fill={tv.chartGreen} radius={[3, 3, 0, 0]} animationDuration={1000} />
        <Bar dataKey="markets" name="Markets" fill={tv.accentDeep} radius={[3, 3, 0, 0]} animationDuration={1000} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExposurePieChart({ data }: { data: { name: string; value: number }[] }) {
  const colors = [tv.chartGreen, tv.accentDeep, tv.statusAmber, tv.chartRed, tv.textSecondary];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none" animationDuration={1200} animationEasing="ease-out">
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <RTooltip content={<ChartTooltip formatter={fmtCurrency} />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LineMovementChart({ data }: { data: { t: number; odds: number }[] }) {
  const chartData = data.map((p) => ({ t: `${p.t}m`, odds: p.odds }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tv.accentDeep} stopOpacity={0.25} />
            <stop offset="100%" stopColor={tv.accentDeep} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} vertical={false} />
        <XAxis dataKey="t" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={30} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
        <RTooltip content={<ChartTooltip formatter={(v) => `${v > 0 ? '+' : ''}${v}`} />} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
        <Area type="monotone" dataKey="odds" name="Odds" stroke={tv.accentDeep} strokeWidth={2} fill="url(#lineGrad)" animationDuration={1000} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ProbabilityComparisonChart({ model, implied }: { model: number; implied: number }) {
  const data = [
    { name: 'M1 Model', value: model * 100 },
    { name: 'Implied', value: implied * 100 },
  ];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} width={72} />
        <RTooltip content={<ChartTooltip formatter={(v) => fmtPercent(v / 100)} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="value" name="Probability" radius={[0, 4, 4, 0]} animationDuration={1000}>
          <Cell fill={tv.chartGreen} />
          <Cell fill={tv.accentDeep} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DrawdownChart({ data }: { data: EquityPoint[] }) {
  const opacity = useAnimatedOpacity();
  const peak = Math.max(...data.map((p) => p.value));
  const chartData = data.map((p) => ({
    t: new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    drawdown: peak > 0 ? ((p.value - peak) / peak) * 100 : 0,
  }));
  return (
    <div style={{ opacity, transition: 'opacity 0.6s ease' }}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tv.chartRed} stopOpacity={0} />
              <stop offset="100%" stopColor={tv.chartRed} stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} vertical={false} />
          <XAxis dataKey="t" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={30} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
          <RTooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />} />
          <Area type="monotone" dataKey="drawdown" name="Drawdown" stroke={tv.chartRed} strokeWidth={2} fill="url(#ddGrad)" animationDuration={1200} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConfidenceHistoryChart({ data }: { data: { t: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} vertical={false} />
        <XAxis dataKey="t" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={30} />
        <YAxis domain={[0, 1]} tick={axisStyle} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
        <RTooltip content={<ChartTooltip formatter={(v) => fmtPercent(v)} />} />
        <Line type="monotone" dataKey="value" name="Confidence" stroke={tv.chartGreen} strokeWidth={2} dot={false} animationDuration={1200} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WinLossChart({ won, lost }: { won: number; lost: number }) {
  const data = [
    { name: 'Won', value: won },
    { name: 'Lost', value: lost },
  ];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <RTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="value" name="Bets" radius={[3, 3, 0, 0]} animationDuration={1000}>
          <Cell fill={tv.chartGreen} />
          <Cell fill={tv.chartRed} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MarketPriceChart({ candles }: { candles: { t: number; o: number; h: number; l: number; c: number; v: number }[] }) {
  const opacity = useAnimatedOpacity();
  const data = candles.map((c) => ({
    t: new Date(c.t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    price: c.c,
    volume: c.v,
  }));
  return (
    <div style={{ opacity, transition: 'opacity 0.6s ease' }}>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tv.accentDeep} stopOpacity={0.25} />
              <stop offset="40%" stopColor={tv.accentDeep} stopOpacity={0.1} />
              <stop offset="100%" stopColor={tv.accentDeep} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} vertical={false} />
          <XAxis dataKey="t" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={40} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={64} domain={['auto', 'auto']} tickFormatter={(v) => `$${v.toLocaleString()}`} />
          <RTooltip content={<ChartTooltip formatter={fmtCurrency} />} />
          <Area type="monotone" dataKey="price" name="Price" stroke={tv.accentDeep} strokeWidth={2} fill="url(#priceGrad)" animationDuration={1200} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
