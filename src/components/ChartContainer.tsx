import type { ReactNode } from 'react';
import { tv } from '@/lib/themeVars';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
}

function ChartSkeleton() {
  return (
    <div className="flex h-48 flex-col justify-end gap-1 px-2 pb-2">
      <div className="flex items-end gap-1.5 h-full">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton
            key={i}
            width="100%"
            height={`${20 + Math.sin(i * 0.5) * 30 + Math.random() * 30}%`}
            radius={3}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <Skeleton width={40} height={10} radius={4} />
        <Skeleton width={40} height={10} radius={4} />
        <Skeleton width={40} height={10} radius={4} />
      </div>
    </div>
  );
}

export function ChartContainer({ title, subtitle, action, children, className = '', loading, empty, emptyText = 'No data available' }: Props) {
  return (
    <div
      className={`flex flex-col rounded-2xl p-4 card-lift ${className}`}
      style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{title}</h3>
          {subtitle && <p className="text-xs" style={{ color: tv.textSecondary }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="relative flex-1 min-h-0">
        {loading ? (
          <ChartSkeleton />
        ) : empty ? (
          <EmptyState kind="chart" message={emptyText} compact />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
