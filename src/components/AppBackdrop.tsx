import { tv } from '@/lib/themeVars';

/**
 * Ambient app background — the same warm, golden-hour atmosphere as the
 * landing page: espresso ground, soft champagne radial glows, a faint
 * moving light, film grain. Replaces the old matrix-rain canvas so the
 * logged-in shell reads as one house with the marketing site.
 */
export function AppBackdrop({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true" style={{ background: tv.bgRoot }}>
      {/* Golden ambient washes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 700px at 18% -8%, rgba(214,183,122,0.10), transparent 60%),' +
            'radial-gradient(1000px 620px at 92% 8%, rgba(214,183,122,0.06), transparent 58%),' +
            'radial-gradient(1100px 800px at 50% 118%, rgba(181,138,58,0.07), transparent 55%)',
        }}
      />
      {/* Slow drifting highlight */}
      {!reducedMotion && (
        <div
          className="absolute left-1/2 top-[-20%] h-[70vh] w-[70vh] -translate-x-1/2 rounded-full app-backdrop-drift"
          style={{
            background: 'radial-gradient(circle, rgba(214,183,122,0.06) 0%, transparent 68%)',
          }}
        />
      )}
      {/* Vignette keeps content legible */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(21,15,11,0.55) 100%)' }}
      />
      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
}
