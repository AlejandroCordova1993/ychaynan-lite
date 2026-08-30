import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null; sessionEnded: boolean }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ error: string | null }>;
  passwordWasChanged: boolean;
  clearPasswordChangeNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  client: SupabaseClient;
  children: ReactNode;
}

export function AuthProvider({ client, children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordWasChanged, setPasswordWasChanged] = useState(false);
  const sessionRef = useRef<Session | null>(null);

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
        sessionRef.current = data.session;
        setSession(data.session);
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudo recuperar la sesión docente:', error);
          sessionRef.current = null;
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
      sessionRef.current = newSession;
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
      return {
        error: result?.error ? 'No pudimos cerrar la sesión. Inténtalo nuevamente.' : null,
        sessionEnded: sessionRef.current === null,
      };
    } catch {
      return {
        error: 'No pudimos cerrar la sesión. Inténtalo nuevamente.',
        sessionEnded: sessionRef.current === null,
      };
    }
  }, [client]);

  const changePassword = useCallback<AuthContextValue['changePassword']>(
    async (currentPassword, newPassword) => {
      try {
        const { error } = await client.auth.updateUser({
          password: newPassword,
          current_password: currentPassword,
        });
        if (!error) {
          setPasswordWasChanged(true);
        }
        return {
          error: error ? 'No pudimos cambiar la contraseña. Inténtalo nuevamente.' : null,
        };
      } catch {
        return { error: 'No pudimos cambiar la contraseña. Inténtalo nuevamente.' };
      }
    },
    [client],
  );

  const clearPasswordChangeNotice = useCallback(() => {
    setPasswordWasChanged(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      signIn,
      signOut,
      changePassword,
      passwordWasChanged,
      clearPasswordChangeNotice,
    }),
    [
      changePassword,
      clearPasswordChangeNotice,
      loading,
      passwordWasChanged,
      session,
      signIn,
      signOut,
    ],
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
