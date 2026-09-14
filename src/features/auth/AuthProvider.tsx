import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase/client';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  isRecovery: boolean;
  recoveryError: string | null;
  clearRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setRecovery] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const recoveryInUrl = /(?:^|[&#?])type=recovery(?:&|$)/.test(
      window.location.hash + '&' + window.location.search,
    );
    if (recoveryInUrl) setRecovery(true);
    const callbackParams = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search);
    const callbackError = callbackParams.get('error_code');
    if (callbackError === 'otp_expired' || callbackParams.get('error') === 'access_denied') {
      setRecoveryError('This reset link has expired or has already been used. Request a new link below.');
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      isRecovery,
      recoveryError,
      clearRecovery: () => { setRecovery(false); setRecoveryError(null); },
    }),
    [session, loading, isRecovery, recoveryError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
