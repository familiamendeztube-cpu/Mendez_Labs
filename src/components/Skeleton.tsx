import { tv } from '@/lib/themeVars';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 20, radius = 8, className }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className ?? ''}`}
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${tv.bgSurface} 25%, ${tv.bgElevated} 50%, ${tv.bgSurface} 75%)`,
        backgroundSize: '200% 100%',
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}
    >
      <Skeleton width="40%" height={14} className="mb-3" />
      <Skeleton width="60%" height={28} className="mb-4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} width={`${70 + Math.random() * 30}%`} height={12} className="mb-2" />
      ))}
    </div>
  );
}
