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
  signOut: () => Promise<{ error: string | null }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ error: string | null }>;
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

  const signOut = useCallback<AuthContextValue['signOut']>(async () => {
    try {
      const result = await client.auth.signOut();
      if (result?.error) {
        return { error: 'No pudimos cerrar la sesión. Inténtalo nuevamente.' };
      }
      return { error: null };
    } catch {
      return { error: 'No pudimos cerrar la sesión. Inténtalo nuevamente.' };
    }
  }, [client]);

  const changePassword = useCallback<AuthContextValue['changePassword']>(
    async (currentPassword, newPassword) => {
      try {
        const { error } = await client.auth.updateUser({
          password: newPassword,
          current_password: currentPassword,
        });
        return {
          error: error ? 'No pudimos cambiar la contraseña. Inténtalo nuevamente.' : null,
        };
      } catch {
        return { error: 'No pudimos cambiar la contraseña. Inténtalo nuevamente.' };
      }
    },
    [client],
  );

  const value = useMemo(
    () => ({ session, loading, signIn, signOut, changePassword }),
    [changePassword, loading, session, signIn, signOut],
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
