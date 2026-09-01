import { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole, X } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { LP } from './theme';

export function PillCta() {
  const { signIn, signUp, clearAuthError, unlockWithCode } = useStore();
  const [open, setOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');

  function handleCode(e: React.FormEvent) {
    e.preventDefault();
    if (!unlockWithCode(code)) {
      setError('Invalid access code');
      setCode('');
    }
  }

  // The fixed header's menu chip opens the same auth panel; the in-app
  // "Sign in with email" button sets a flag so the panel opens on arrival.
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    clearAuthError();
    if (!email || !password) { setError('Email and password required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      if (isSignUp) await signUp(email, password);
      else await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Persistent pill — Jesko's "Book the Flight" */}
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

      {/* Sign-in panel */}
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: 'rgba(27,21,17,0.72)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: LP.surface, border: `1px solid ${LP.borderDark}` }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4" style={{ color: LP.champagne }} />
                <span className="text-sm font-bold tracking-widest" style={{ color: LP.textOnDark, fontFamily: LP.display }}>
                  {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
                </span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" style={{ color: LP.mutedOnDark }} />
              </button>
            </div>
            <input
              type="email" value={email} autoFocus placeholder="Email" aria-label="Email"
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="mb-3 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${LP.borderDark}`, color: LP.textOnDark }}
            />
            <input
              type="password" value={password} placeholder="Password" minLength={6} aria-label="Password"
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="mb-3 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${LP.borderDark}`, color: LP.textOnDark }}
            />
            {error && <p className="mb-3 text-xs" style={{ color: '#D94550', fontFamily: LP.mono }}>{error}</p>}
            <button
              type="submit" disabled={submitting}
              className="w-full rounded-lg py-2.5 text-sm font-bold"
              style={{
                background: `linear-gradient(135deg, ${LP.champagne}, ${LP.gold})`,
                color: LP.carbon, opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Please wait…' : isSignUp ? 'CREATE ACCOUNT' : 'ENTER'}
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp((v) => !v); setError(''); }}
              className="mt-3 w-full text-center text-xs underline"
              style={{ color: LP.mutedOnDark }}
            >
              {isSignUp ? 'Have an account? Sign in' : 'New? Create account'}
            </button>

            {/* Owner quick access */}
            {showCode ? (
              <div className="mt-4 border-t pt-4" style={{ borderColor: LP.borderDark }}>
                <input
                  type="password"
                  value={code}
                  inputMode="numeric"
                  placeholder="Access code"
                  aria-label="Master access code"
                  onChange={(e) => { setCode(e.target.value); setError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCode(e); }}
                  className="mb-2 w-full rounded-lg px-3 py-2.5 text-center text-sm tracking-[0.5em] outline-none"
                  style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${LP.borderDark}`, color: LP.gold, fontFamily: LP.mono }}
                />
                <button
                  type="button"
                  onClick={handleCode}
                  className="w-full rounded-lg py-2 text-xs font-bold tracking-widest"
                  style={{ background: 'rgba(181,138,58,0.15)', color: LP.gold, border: '1px solid rgba(181,138,58,0.3)' }}
                >
                  UNLOCK TERMINAL
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCode(true)}
                className="mt-3 w-full text-center text-[10px] tracking-[0.3em]"
                style={{ color: 'rgba(138,143,138,0.5)', fontFamily: LP.mono }}
              >
                ADMIN ACCESS
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
