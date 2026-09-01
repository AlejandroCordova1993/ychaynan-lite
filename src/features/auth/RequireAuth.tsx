import { useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '../../components/layout/LoadingScreen';
import { Notice } from '../../components/layout/Notice';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, signOut } = useAuth();
  const [signOutWarning, setSignOutWarning] = useState<string | null>(null);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/docente/ingresar" replace />;
  }

  if (session.user.app_metadata?.role !== 'teacher') {
    const handleSignOut = async () => {
      setSignOutWarning(null);
      const { sessionEnded } = await signOut();
      // Sin sesión cerrada esta pantalla no cambia sola: hay que decirlo, o el
      // botón parecería no hacer nada.
      if (!sessionEnded) {
        setSignOutWarning('No pudimos cerrar la sesión. Inténtalo nuevamente.');
      }
    };

    return (
      <main className="app-main app-main--centered">
        <div className="card stack">
          <h1>Esta cuenta no tiene rol docente</h1>
          <p className="text-muted">
            Tu sesión es válida, pero no tiene el permiso necesario para usar el panel docente.
            Contacta a quien administra el proyecto para que active tu rol.
          </p>
          {signOutWarning && (
            <Notice tone="warning" role="alert">
              {signOutWarning}
            </Notice>
          )}
          <div className="cluster">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => void handleSignOut()}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
