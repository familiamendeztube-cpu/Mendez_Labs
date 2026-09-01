import { tv } from '@/lib/themeVars';
import { THUMBS } from '@/data/appImages';

type Kind = keyof typeof THUMBS;

/**
 * Empty / no-data state with a small photographic thumbnail instead of a bare
 * icon — keeps even the blank panels feeling designed.
 */
export function EmptyState({
  kind = 'chart',
  message,
  compact = false,
}: {
  kind?: Kind;
  message: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center ${compact ? 'py-8' : 'py-12'}`}>
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ width: compact ? 56 : 72, height: compact ? 56 : 72, border: `1px solid ${tv.borderBase}` }}
      >
        <img src={THUMBS[kind]} alt="" loading="lazy" className="h-full w-full object-cover" style={{ opacity: 0.5 }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, transparent, ${tv.bgSurface})` }} />
      </div>
      <p className="max-w-xs text-xs" style={{ color: tv.textMuted }}>{message}</p>
    </div>
  );
}
