import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  client: SupabaseClient;
  children: ReactNode;
}

export function AuthProvider({ client, children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [client]);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await client.auth.signInWithPassword({ email, password });
    return { error: error ? 'No pudimos iniciar sesión. Revisa tus datos.' : null };
  };

  const signOut = async () => {
    await client.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
