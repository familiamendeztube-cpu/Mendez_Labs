import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { tv, redAlpha } from '@/lib/themeVars';

export function LogoutModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl p-6"
        style={{ background: tv.bgSurface, border: `1px solid ${tv.borderBase}` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: redAlpha(0.1) }}
          >
            <AlertTriangle className="h-5 w-5" style={{ color: tv.statusRed }} />
          </div>
          <h2 id="logout-title" className="text-lg font-semibold" style={{ color: tv.textPrimary }}>
            Log out of Mendez Labs?
          </h2>
        </div>
        <p className="mb-6 text-sm" style={{ color: tv.textMuted }}>
          Your picks, results, and bankroll records will be saved. You can sign back in anytime.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 text-sm font-semibold transition-colors"
            style={{ color: tv.textSecondary, border: `1px solid ${tv.borderBase}` }}
            aria-label="Cancel logout"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="flex-1 rounded-xl py-3 text-sm font-bold transition-colors"
            style={{ background: tv.statusRed, color: tv.textPrimary }}
            aria-label="Confirm logout"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
