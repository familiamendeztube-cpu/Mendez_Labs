import { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole, X } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { LP } from './theme';

/**
 * Single-user access. The master code is the only login — there are no
 * accounts. Entering it unlocks the full live terminal (real Alpaca data,
 * real signals) via the shared-key model on the edge functions.
 */
export function PillCta() {
  const { unlockWithCode } = useStore();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function handleCode(e: React.FormEvent) {
    e.preventDefault();
    if (!unlockWithCode(code)) {
      setError('Invalid access code');
      setCode('');
    }
  }

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener('lp:open-auth', openHandler);
    try {
      if (sessionStorage.getItem('lp-open-auth') === '1') {
        sessionStorage.removeItem('lp-open-auth');
        setOpen(true);
      }
    } catch { /* ignore */ }
    return () => window.removeEventListener('lp:open-auth', openHandler);
  }, []);

  return (
    <>
      {/* Persistent pill CTA */}
      <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2" data-lp-pill>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 rounded-full py-3 pl-7 pr-3 text-sm font-bold tracking-wide transition-transform hover:scale-[1.03]"
          style={{
            background: LP.bone,
            color: LP.carbon,
            fontFamily: LP.display,
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          }}
        >
          Enter the Terminal
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: LP.carbon }}
          >
            <ArrowRight className="h-4 w-4" style={{ color: LP.champagne }} />
          </span>
        </button>
      </div>

      {/* Access-code panel */}
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: 'rgba(27,21,17,0.72)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={handleCode}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: LP.surface, border: `1px solid ${LP.borderDark}` }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4" style={{ color: LP.champagne }} />
                <span className="text-sm font-bold tracking-widest" style={{ color: LP.textOnDark, fontFamily: LP.display }}>
                  ACCESS CODE
                </span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" style={{ color: LP.mutedOnDark }} />
              </button>
            </div>

            <input
              type="password"
              value={code}
              autoFocus
              inputMode="numeric"
              placeholder="• • • • • •"
              aria-label="Master access code"
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              className="mb-3 w-full rounded-lg px-3 py-3 text-center text-lg tracking-[0.5em] outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${LP.borderDark}`, color: LP.champagne, fontFamily: LP.mono }}
            />
            {error && <p className="mb-3 text-xs" style={{ color: '#D94550', fontFamily: LP.mono }}>{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg py-2.5 text-sm font-bold tracking-widest"
              style={{ background: `linear-gradient(135deg, ${LP.champagne}, ${LP.gold})`, color: LP.carbon }}
            >
              UNLOCK TERMINAL
            </button>
          </form>
        </div>
      )}
    </>
  );
}
