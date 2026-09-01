import type { ReactNode } from 'react';
import { tv } from '@/lib/themeVars';

/**
 * Standard page header — a photographic banner with the title and subtitle
 * laid over it, fading into the page background. Used on every screen so no
 * section reads as plain.
 */
export function PageHero({
  image,
  eyebrow,
  title,
  subtitle,
  action,
  height = 'md',
}: {
  image: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  height?: 'sm' | 'md';
}) {
  const h = height === 'sm' ? 'h-28 sm:h-32' : 'h-36 sm:h-44';
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ border: `1px solid ${tv.borderBase}` }}>
      <img src={image} alt="" loading="lazy" className={`w-full object-cover ${h}`} style={{ opacity: 0.45 }} />
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, rgba(20,15,11,0.25) 0%, rgba(20,15,11,0.55) 55%, ${tv.bgRoot} 100%)` }}
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: tv.accent }}>
              {eyebrow}
            </p>
          )}
          <h1 className="serif text-[1.9rem] font-semibold leading-[1.05] sm:text-[2.3rem]" style={{ color: tv.textPrimary, letterSpacing: '-0.03em' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 max-w-xl text-sm" style={{ color: tv.textSecondary }}>{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
