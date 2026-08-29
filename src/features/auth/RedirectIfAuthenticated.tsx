import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <p role="status">Cargando…</p>;
  }

  if (session) {
    return <Navigate to="/docente" replace />;
  }

  return <>{children}</>;
}
