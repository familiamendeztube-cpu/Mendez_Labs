// Single-user terminal access. This is a private tool operated only by its
// owner — there are no other accounts. The master code both unlocks the UI
// and is sent to the money-touching edge functions as `x-terminal-key`,
// which check it against the TERMINAL_ACCESS_KEY secret (defaulting to this
// same value so it works before the secret is set).

export const MASTER_CODE = '312593';
export const MASTER_KEY = 'mlabs-master';

/** Header the client attaches to authenticated edge-function calls. */
export function terminalHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-terminal-key': MASTER_CODE,
    Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };
}

export function isMasterUnlocked(): boolean {
  try {
    return localStorage.getItem(MASTER_KEY) === '1';
  } catch {
    return false;
  }
}
