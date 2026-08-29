import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <p role="status">Cargando…</p>;
  }

  if (!session) {
    return <Navigate to="/docente/ingresar" replace />;
  }

  if (session.user.app_metadata?.role !== 'teacher') {
    return (
      <main>
        <h1>Esta cuenta no tiene rol docente</h1>
        <p>
          Tu sesión es válida, pero no tiene el permiso necesario para usar el panel docente.
          Contacta a quien administra el proyecto para que active tu rol.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
