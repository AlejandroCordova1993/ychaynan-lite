import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
    let cancelled = false;

    const loadSession = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (cancelled) {
          return;
        }
        if (error) {
          console.error('No se pudo recuperar la sesión docente:', error);
        }
        setSession(data.session);
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudo recuperar la sesión docente:', error);
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    const { data: listener } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      const { error } = await client.auth.signInWithPassword({ email, password });
      return { error: error ? 'No pudimos iniciar sesión. Revisa tus datos.' : null };
    },
    [client],
  );

  const signOut = useCallback(async () => {
    try {
      const result = await client.auth.signOut();
      if (result?.error) {
        console.error('No se pudo cerrar la sesión docente:', result.error);
      }
    } catch (error) {
      console.error('No se pudo cerrar la sesión docente:', error);
    }
  }, [client]);

  const value = useMemo(
    () => ({ session, loading, signIn, signOut }),
    [loading, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
