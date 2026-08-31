import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false });

      if (_event === 'SIGNED_IN' && session?.user) {
        (async () => {
          await supabase.from('user_profiles').upsert({
            id: session.user.id,
            email: session.user.email ?? '',
          }, { onConflict: 'id' });
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) { setError(err.message); throw err; }
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); throw err; }
    return data;
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    const { error: err } = await supabase.auth.signOut();
    if (err) { setError(err.message); throw err; }
  }, []);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    authenticated: !!state.session,
    error,
    clearError: () => setError(null),
    signUp,
    signIn,
    signOut,
  };
}
